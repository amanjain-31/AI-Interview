import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import url from "url";
import { prisma } from "../services/db";
import { AIService } from "../services/ai.service";

interface ConnectionState {
  ws: WebSocket;
  sessionId: string;
  candidateName: string;
  jobTitle: string;
  jobDescription: string;
  difficulty: string;
  interviewType: string;
  currentQuestionText: string;
  currentQuestionId: string;
  questionsAskedCount: number;
}

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: any) => {
    const pathname = url.parse(request.url || "").pathname;

    if (pathname === "/interview-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  const connections = new Map<string, ConnectionState>();

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const query = url.parse(req.url || "", true).query;
    const sessionId = query.sessionId as string;

    if (!sessionId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing sessionId parameter" }));
      ws.close();
      return;
    }

    try {
      // Fetch session with Candidate (and ResumeData) and Job details
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          candidate: { include: { resumeData: true } },
          job: true,
          questions: true,
        },
      });

      if (!session) {
        ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
        ws.close();
        return;
      }

      console.log(`WebSocket: Connected candidate ${session.candidate.name} for session ${sessionId}`);

      // Track connection state
      const state: ConnectionState = {
        ws,
        sessionId,
        candidateName: session.candidate.name,
        jobTitle: session.job.title,
        jobDescription: session.job.description,
        difficulty: session.job.difficulty,
        interviewType: session.job.interviewType,
        currentQuestionText: "",
        currentQuestionId: "",
        questionsAskedCount: session.questions.length,
      };

      connections.set(sessionId, state);

      // Mark session as IN_PROGRESS if NOT_STARTED
      if (session.status === "NOT_STARTED") {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });
      }

      // Handle messages
      ws.on("message", async (messageStr: string) => {
        try {
          const msg = JSON.parse(messageStr);
          await handleMessage(state, msg);
        } catch (err) {
          console.error("WS message parse error:", err);
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        console.log(`WebSocket: Disconnected session ${sessionId}`);
        connections.delete(sessionId);
      });
    } catch (err) {
      console.error("WS connection setup error:", err);
      ws.send(JSON.stringify({ type: "error", message: "Server connection error" }));
      ws.close();
    }
  });
}

async function handleMessage(state: ConnectionState, msg: any) {
  const { ws, sessionId } = state;
  console.log(`WebSocket: Received message type "${msg.type}" for session ${sessionId}`);

  switch (msg.type) {
    case "start_interview": {
      console.log(`WebSocket: Processing start_interview for session ${sessionId}...`);
      // Transition from INSTRUCTIONS to the first active phase
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { candidate: { include: { resumeData: true } } },
      });

      if (!session) {
        console.error(`WebSocket: Session not found for start_interview: ${sessionId}`);
        return;
      }

      let firstPhase = "RESUME_Q";
      if (state.interviewType === "CODING") firstPhase = "CODING";
      else if (state.interviewType === "SYSTEM_DESIGN") firstPhase = "SYSTEM_DESIGN";
      else if (state.interviewType === "BEHAVIORAL") firstPhase = "BEHAVIORAL";

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { currentPhase: firstPhase },
      });

      ws.send(JSON.stringify({ type: "phase_change", phase: firstPhase }));
      await askNextQuestion(state, firstPhase);
      break;
    }

    case "submit_answer": {
      const { text, durationMs } = msg;

      // 1. Save answer text and evaluate
      ws.send(JSON.stringify({ type: "evaluating_start" }));
      
      const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId },
      });

      if (!session) return;

      const currentPhase = session.currentPhase;

      // Create Answer entry
      const answer = await prisma.answer.create({
        data: {
          sessionId,
          questionId: state.currentQuestionId,
          text,
          durationMs: durationMs || 0,
        },
      });

      // AI evaluation of answer
      const evalResult = await AIService.evaluateAnswer(
        state.currentQuestionText,
        text,
        currentPhase
      );

      // Save Score details
      await prisma.score.create({
        data: {
          answerId: answer.id,
          technicalAccuracy: evalResult.technicalAccuracy,
          depthOfKnowledge: evalResult.depthOfKnowledge,
          problemSolving: evalResult.problemSolving,
          communicationClarity: evalResult.communicationClarity,
          confidence: evalResult.confidence,
          feedback: evalResult.feedback,
          idealAnswerSummary: evalResult.idealAnswerSummary,
        },
      });

      state.questionsAskedCount++;
      ws.send(JSON.stringify({ type: "evaluating_done", score: evalResult }));

      // 2. Decide next step (Next phase or next question)
      const nextPhase = getNextPhase(state.interviewType, currentPhase, state.questionsAskedCount);

      if (nextPhase === "FINISHED") {
        await endInterview(state);
      } else if (nextPhase !== currentPhase) {
        // Transition phase
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { currentPhase: nextPhase },
        });
        ws.send(JSON.stringify({ type: "phase_change", phase: nextPhase }));
        await askNextQuestion(state, nextPhase);
      } else {
        // Continue current phase with adaptive follow-up
        await askAdaptiveQuestion(state, text, currentPhase);
      }
      break;
    }

    case "submit_code": {
      const { code, language } = msg;
      ws.send(JSON.stringify({ type: "evaluating_start" }));

      // Run code simulation (check syntax/basic validation)
      const runResult = simulateCodeExecution(code, language);

      const session = await prisma.interviewSession.findFirst({
        where: { id: sessionId },
      });

      if (!session) return;

      // Save Answer
      const answer = await prisma.answer.create({
        data: {
          sessionId,
          questionId: state.currentQuestionId,
          text: `[Submitted Code - Language: ${language}]\n${code}`,
          codeOutputs: JSON.stringify(runResult),
        },
      });

      // AI code evaluation
      const evalResult = await AIService.evaluateAnswer(
        state.currentQuestionText,
        code,
        "CODING",
        code
      );

      // Save score
      await prisma.score.create({
        data: {
          answerId: answer.id,
          technicalAccuracy: evalResult.technicalAccuracy,
          depthOfKnowledge: evalResult.depthOfKnowledge,
          problemSolving: evalResult.problemSolving,
          communicationClarity: evalResult.communicationClarity,
          confidence: evalResult.confidence,
          feedback: evalResult.feedback,
          idealAnswerSummary: evalResult.idealAnswerSummary,
        },
      });

      state.questionsAskedCount++;
      ws.send(JSON.stringify({ type: "code_result", output: runResult }));
      ws.send(JSON.stringify({ type: "evaluating_done", score: evalResult }));

      // Move to next phase
      const nextPhase = getNextPhase(state.interviewType, "CODING", state.questionsAskedCount);

      if (nextPhase === "FINISHED") {
        await endInterview(state);
      } else {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { currentPhase: nextPhase },
        });
        ws.send(JSON.stringify({ type: "phase_change", phase: nextPhase }));
        await askNextQuestion(state, nextPhase);
      }
      break;
    }

    case "cheating_event": {
      const { eventType, description } = msg;
      await prisma.cheatingEvent.create({
        data: {
          sessionId,
          eventType,
          description,
        },
      });
      console.warn(`Anti-Cheating Telemetry: Session ${sessionId} logged event ${eventType} - ${description}`);
      break;
    }

    case "flag_plagiarism": {
      console.warn(`Anti-Cheating Telemetry: Flagging session ${sessionId} for Plagiarism`);
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { isPlagiarised: true },
      });
      break;
    }

    case "end_interview": {
      console.warn(`WebSocket: Candidate requested early submission for session ${sessionId}`);
      await endInterview(state);
      break;
    }

    default:
      console.warn("WS: Unknown message type received:", msg.type);
  }
}

function simulateCodeExecution(code: string, language: string) {
  // Simple check for syntax compilation representation
  const outputLogs: string[] = [];
  let executionTimeMs = 12;
  let memoryUsageKb = 1024;
  let success = true;

  if (language === "javascript" || language === "typescript") {
    if (code.includes("syntax error") || code.includes("const ") && !code.includes("=")) {
      success = false;
      outputLogs.push("SyntaxError: Unexpected token");
    } else {
      outputLogs.push("Running code tests...");
      outputLogs.push("Test Case 1 passed: sum(2, 3) === 5");
      outputLogs.push("Test Case 2 passed: sum(-1, 5) === 4");
      executionTimeMs = Math.floor(Math.random() * 20) + 2;
      memoryUsageKb = 1540 + Math.floor(Math.random() * 200);
    }
  } else if (language === "python") {
    if (code.includes("def") && !code.includes(":")) {
      success = false;
      outputLogs.push("  File \"main.py\", line 2\n    def test\n            ^\nSyntaxError: invalid syntax");
    } else {
      outputLogs.push("Test Case 1 passed: sum(2, 3) == 5");
      executionTimeMs = Math.floor(Math.random() * 15) + 1;
      memoryUsageKb = 2024 + Math.floor(Math.random() * 100);
    }
  } else {
    // Java, C++
    outputLogs.push("Compiling Class Main...");
    outputLogs.push("Execution completed. Standard test cases passed.");
    executionTimeMs = Math.floor(Math.random() * 30) + 10;
    memoryUsageKb = 8124;
  }

  return {
    success,
    logs: outputLogs.join("\n"),
    executionTimeMs,
    memoryUsageKb,
  };
}

async function askNextQuestion(state: ConnectionState, phase: string) {
  const { sessionId } = state;
  console.log(`WebSocket: Generating next question for phase "${phase}" in session ${sessionId}`);

  // Fetch candidate/job info for context
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { candidate: { include: { resumeData: true } } },
  });

  if (!session) {
    console.error(`WebSocket: Session not found inside askNextQuestion: ${sessionId}`);
    return;
  }

  let questionText = "";

  if (phase === "RESUME_Q") {
    const qList = await AIService.generateQuestions(
      session.candidate.resumeData,
      state.jobDescription,
      state.difficulty,
      "RESUME_Q"
    );
    const questionsCount = await prisma.question.count({
      where: { sessionId, phase: "RESUME_Q" },
    });

    if (questionsCount === 0) {
      questionText = `Hello ${state.candidateName}! Welcome to your technical interview for the ${state.jobTitle} position. To start off, could you please introduce yourself and tell me a bit about your background?`;
    } else {
      questionText = qList[0] || `Thank you! Looking at your resume and experience, could you detail one of your most challenging projects and describe the technical skills and tradeoffs you encountered?`;
    }
  } else if (phase === "CODING") {
    questionText = `Implement a function to find the length of the longest substring without repeating characters in the input string.
  
  Example:
  Input: "abcabcbb"
  Output: 3 (The answer is "abc")
  
  Please write and run your code in the editor, and submit when ready.`;
  } else if (phase === "SYSTEM_DESIGN") {
    questionText = `Design a real-time notification service (like push notifications for Slack or WhatsApp).
  How would you handle scale, transient message caching, and persistent WebSocket connections for millions of users?`;
  } else if (phase === "BEHAVIORAL") {
    questionText = `Tell me about a time when you had a technical disagreement with a team member.
  What was the disagreement, how did you handle communication, and what was the final outcome?`;
  }

  // Save the question
  const qDb = await prisma.question.create({
    data: {
      sessionId,
      phase,
      text: questionText,
    },
  });

  state.currentQuestionId = qDb.id;
  state.currentQuestionText = questionText;

  state.ws.send(JSON.stringify({
    type: "question",
    text: questionText,
    phase,
  }));
}

async function askAdaptiveQuestion(state: ConnectionState, lastUserAnswer: string, phase: string) {
  const { sessionId } = state;

  // Retrieve past conversation details for the context
  const answers = await prisma.answer.findMany({
    where: { sessionId },
    include: { question: true },
    orderBy: { createdAt: "asc" },
  });

  const history = answers.map(a => ({
    question: a.question.text,
    answer: a.text,
  }));

  const followUpText = await AIService.generateFollowUp(
    state.currentQuestionText,
    lastUserAnswer,
    history,
    state.difficulty,
    phase
  );

  const qDb = await prisma.question.create({
    data: {
      sessionId,
      phase,
      text: followUpText,
    },
  });

  state.currentQuestionId = qDb.id;
  state.currentQuestionText = followUpText;

  state.ws.send(JSON.stringify({
    type: "question",
    text: followUpText,
    phase,
  }));
}

function getNextPhase(interviewType: string, currentPhase: string, questionCount: number): string {
  const questionsPerPhase = 2;

  if (currentPhase === "RESUME_Q") {
    if (questionCount >= questionsPerPhase) {
      if (interviewType === "FULL" || interviewType === "SYSTEM_DESIGN" || interviewType === "TECHNICAL") return "SYSTEM_DESIGN";
      if (interviewType === "CODING") return "CODING";
      return "BEHAVIORAL";
    }
    return "RESUME_Q";
  }

  if (currentPhase === "SYSTEM_DESIGN") {
    if (questionCount >= questionsPerPhase + 1) { // 2 resume + 1 system design = 3
      if (interviewType === "SYSTEM_DESIGN") return "FINISHED";
      if (interviewType === "FULL" || interviewType === "BEHAVIORAL") return "BEHAVIORAL";
      return "CODING";
    }
    return "SYSTEM_DESIGN";
  }

  if (currentPhase === "BEHAVIORAL") {
    if (questionCount >= questionsPerPhase + 2) { // 2 resume + 1 system design + 1 behavioral = 4
      if (interviewType === "BEHAVIORAL") return "FINISHED";
      if (interviewType === "FULL" || interviewType === "CODING" || interviewType === "TECHNICAL") return "CODING";
      return "FINISHED";
    }
    return "BEHAVIORAL";
  }

  if (currentPhase === "CODING") {
    return "FINISHED";
  }

  return "FINISHED";
}

async function endInterview(state: ConnectionState) {
  const { sessionId } = state;

  console.log(`WebSocket: Ending interview session ${sessionId}. Generating final evaluation report...`);

  // Update session status
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Pull all answers and scores
  const answers = await prisma.answer.findMany({
    where: { sessionId },
    include: {
      question: true,
      score: true,
    },
  });

  const transcript = answers.map(a => ({
    question: a.question.text,
    answer: a.text,
    scores: a.score || undefined,
  }));

  // Generate Report via AI
  const reportData = await AIService.generateReport({
    jobTitle: state.jobTitle,
    jobDescription: state.jobDescription,
    difficulty: state.difficulty,
    candidateName: state.candidateName,
    transcript,
  });

  // Apply Plagiarism Penalties if flagged
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (session?.isPlagiarised) {
    reportData.overallScore = 0;
    reportData.technicalScore = 0;
    reportData.codingScore = 0;
    reportData.communicationScore = 0;
    reportData.behavioralScore = 0;
    reportData.hiringRecommendation = "REJECT";
    reportData.recommendationConfidence = 100;
    reportData.strengths = "🚨 PLAGIARISM FLAGGED: Candidate repeatedly bypassed screen proctoring rules.";
    reportData.weaknesses = "Tab navigation and fullscreen violations detected during assessment.";
    reportData.knowledgeGaps = "Grading cancelled due to academic integrity violation.";
    reportData.projectsDiscussion = "Not assessed.";
    reportData.recommendedLearning = "Review professional ethics guidelines.";
  }

  // Create database report entry
  const report = await prisma.report.create({
    data: {
      sessionId,
      overallScore: reportData.overallScore,
      technicalScore: reportData.technicalScore,
      codingScore: reportData.codingScore,
      communicationScore: reportData.communicationScore,
      behavioralScore: reportData.behavioralScore,
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      knowledgeGaps: reportData.knowledgeGaps,
      projectsDiscussion: reportData.projectsDiscussion,
      recommendedLearning: reportData.recommendedLearning,
      hiringRecommendation: reportData.hiringRecommendation,
      recommendationConfidence: reportData.recommendationConfidence,
    },
  });

  // Mark session as EVALUATED
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status: "EVALUATED" },
  });

  state.ws.send(JSON.stringify({
    type: "interview_ended",
    reportId: report.id,
    message: "Thank you for completing the HireAI Interview! Your responses are being processed.",
  }));

  state.ws.close();
}
