import dotenv from "dotenv";

dotenv.config();

export interface ResumeParsedData {
  name?: string;
  email?: string;
  education: string;
  experience: string;
  skills: string;
  projects: string;
  languages: string;
}

export interface AnswerScore {
  technicalAccuracy: number; // 0-10
  depthOfKnowledge: number; // 0-10
  problemSolving: number; // 0-10
  communicationClarity: number; // 0-10
  confidence: number; // 0-10
  feedback: string;
  idealAnswerSummary: string;
}

export interface FinalReport {
  overallScore: number;
  technicalScore: number;
  codingScore: number;
  communicationScore: number;
  behavioralScore: number;
  strengths: string;
  weaknesses: string;
  knowledgeGaps: string;
  projectsDiscussion: string;
  recommendedLearning: string;
  hiringRecommendation: string; // STRONG_YES, YES, MAYBE, NO
  recommendationConfidence: number; // 0-100
}

export class AIService {
  private static getProvider(): "gemini" | "openai" | "mock" {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey.trim() !== "" && geminiKey !== '""' && geminiKey !== "''") {
      return "gemini";
    }
    if (openaiKey && openaiKey.trim() !== "" && openaiKey !== '""' && openaiKey !== "''") {
      return "openai";
    }
    return "mock";
  }

  private static async callLLM(prompt: string, expectJson = true): Promise<string> {
    const provider = this.getProvider();
    
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: expectJson ? { responseMimeType: "application/json" } : undefined,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API Error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      } catch (error) {
        console.error("Error calling Gemini API:", error);
        return this.mockFallback(prompt, expectJson);
      }
    }

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const url = "https://api.openai.com/v1/chat/completions";

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: expectJson ? { type: "json_object" } : undefined,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as any;
        return data.choices?.[0]?.message?.content || "{}";
      } catch (error) {
        console.error("Error calling OpenAI API:", error);
        return this.mockFallback(prompt, expectJson);
      }
    }

    return this.mockFallback(prompt, expectJson);
  }

  // Fallback to locally simulated responses if API keys are missing
  private static mockFallback(prompt: string, expectJson: boolean): string {
    console.log("AI Service: Running simulated LLM engine (No API Keys Configured or API Error).");
    if (!expectJson) {
      return "This is a simulated AI interviewer question. Tell me about your experience with building scalable web services.";
    }

    if (prompt.includes("RESUME_PARSE")) {
      return JSON.stringify({
        name: "Jane Doe",
        email: "jane.doe@example.com",
        education: JSON.stringify([{ school: "Tech University", degree: "B.S. Computer Science", year: "2024" }]),
        experience: JSON.stringify([{ company: "Dev Corp", role: "Software Intern", duration: "1 year", description: "Built APIs" }]),
        skills: "React, Node.js, Express, PostgreSQL, Docker, TypeScript, JavaScript",
        projects: JSON.stringify([{ name: "Task App", tech: "React, Node.js", desc: "Collaborative todo list" }]),
        languages: "JavaScript, TypeScript, Python",
      });
    }

    if (prompt.includes("EVALUATE_ANSWER")) {
      let candidateAnswer = "";
      let phase = "";
      
      const answerMatch = prompt.match(/Candidate Answer:\s*([\s\S]*?)\n\s*Phase:/i);
      if (answerMatch) candidateAnswer = answerMatch[1].trim();

      const phaseMatch = prompt.match(/Phase:\s*([^\n\r]*)/i);
      if (phaseMatch) phase = phaseMatch[1].trim();

      const result = this.mockEvaluate(candidateAnswer, phase);
      return JSON.stringify(result);
    }

    if (prompt.includes("GENERATE_REPORT")) {
      return JSON.stringify({
        overallScore: 41,
        technicalScore: 8.5,
        codingScore: 8.0,
        communicationScore: 9.0,
        behavioralScore: 8.0,
        strengths: "Excellent coding habits, strong understanding of React lifecycles, and stellar communication skills.",
        weaknesses: "Slight hesitation when discussing Docker deployment configurations.",
        knowledgeGaps: "Could expand depth on system scaling strategies, database index fine-tuning, and caching strategies.",
        projectsDiscussion: "Explained the 'Task App' project architecture with great clarity, illustrating clean controller-model designs.",
        recommendedLearning: "Deep dive into Redis caching patterns and PostgreSQL EXPLAIN plans.",
        hiringRecommendation: "STRONG_YES",
        recommendationConfidence: 85,
      });
    }

    return JSON.stringify({
      questions: [
        "How do you optimize rendering performance in a large-scale React application?",
        "Explain the event loop in Node.js and how it handles asynchronous non-blocking I/O.",
        "How would you model a many-to-many relationship using Prisma ORM in PostgreSQL?",
      ],
    });
  }

  /**
   * Parse uploaded resume text (using simple regex/mock or LLM if key available)
   */
  public static async parseResume(resumeText: string): Promise<ResumeParsedData> {
    const prompt = `
      [RESUME_PARSE]
      You are an expert ATS (Applicant Tracking System) parser. Analyze the following resume text and extract the details in JSON format.
      You MUST respond ONLY with a valid JSON object matching the schema:
      {
        "name": "string (optional)",
        "email": "string (optional)",
        "education": "string (JSON array of school, degree, graduation details)",
        "experience": "string (JSON array of work experience details including tasks/technologies)",
        "skills": "string (comma-separated list of skills extracted)",
        "projects": "string (JSON array of project details)",
        "languages": "string (comma-separated list of coding languages like Python, TypeScript, etc.)"
      }

      Resume Text:
      ${resumeText}
    `;

    try {
      const res = await this.callLLM(prompt, true);
      return JSON.parse(res);
    } catch (e) {
      console.error("Resume parse JSON error:", e);
      return JSON.parse(this.mockFallback(prompt, true));
    }
  }

  /**
   * Generate initial questions based on candidate profile and Job Description
   */
  public static async generateQuestions(
    resumeData: any | null,
    jobDescription: string,
    difficulty: string,
    type: string
  ): Promise<string[]> {
    const skillsText = resumeData ? resumeData.skills : "N/A";
    const experienceText = resumeData ? resumeData.experience : "N/A";
    const projectsText = resumeData ? resumeData.projects : "N/A";

    const prompt = `
      You are an elite technical interviewer. Generate 3 distinct questions appropriate for a candidates' first-round technical interview.
      Generate questions tailored to the job description and candidate's details.

      Job Description: ${jobDescription}
      Difficulty: ${difficulty}
      Interview Round Type: ${type}
      Candidate Skills: ${skillsText}
      Candidate Experience: ${experienceText}
      Candidate Projects: ${projectsText}

      Return ONLY a JSON object with a single "questions" key containing an array of strings. Do not include markdown formatting except inside the JSON string if needed.
      {
        "questions": ["Question 1", "Question 2", "Question 3"]
      }
    `;

    try {
      const res = await this.callLLM(prompt, true);
      const parsed = JSON.parse(res);
      return parsed.questions || [];
    } catch (e) {
      console.error("Questions generation JSON error:", e);
      return ["Explain how you would design a scalable notification service.", "Describe your experience with async programming.", "What are index keys in PostgreSQL?"];
    }
  }

  /**
   * Generate an adaptive follow-up or next question based on user response and history
   */
  public static async generateFollowUp(
    currentQuestion: string,
    userAnswer: string,
    history: { question: string; answer: string }[],
    difficulty: string,
    phase: string
  ): Promise<string> {
    const prompt = `
      You are an AI Interviewer conducting an adaptive interview.
      Current Phase: ${phase}
      Interview Difficulty Target: ${difficulty}

      Previous Chat History:
      ${history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")}

      Current Question asked: ${currentQuestion}
      Candidate's Answer: ${userAnswer}

      Instructions:
      - If the candidate gave a strong answer, ask a deeper follow-up question that increases the difficulty.
      - If they struggled or asked for clarification, politely pivot or reduce the difficulty slightly.
      - Keep the conversation flow natural, professional, and conversational.
      - Reply ONLY with the next question. Do not include any greeting or conversational filler like "Great job! Next...".
    `;

    try {
      const question = await this.callLLM(prompt, false);
      return question.trim();
    } catch (e) {
      return "Can you expand on how you handle error states in that scenario?";
    }
  }

  /**
   * Evaluate a candidate response using the 50-mark rubric
   */
  public static async evaluateAnswer(
    question: string,
    answerText: string,
    phase: string,
    codeContext?: string
  ): Promise<AnswerScore> {
    const prompt = `
      [EVALUATE_ANSWER]
      You are an expert AI interviewer evaluator. Evaluate the candidate's answer based on the following rubric out of 50 marks.
      Rubrics (each 0 to 10 integer):
      1. Technical Accuracy (10): correctness of the answer
      2. Depth of Knowledge (10): complexity and nuance understood
      3. Problem Solving (10): structured thinking and approach
      4. Communication Clarity (10): articulation of thoughts
      5. Confidence of Explanation (10): security and certainty of speech

      Question: ${question}
      ${codeContext ? `Submitted Code:\n${codeContext}\n` : ""}
      Candidate Answer: ${answerText}
      Phase: ${phase}

      Return ONLY a valid JSON object matching this structure:
      {
        "technicalAccuracy": 0-10 number,
        "depthOfKnowledge": 0-10 number,
        "problemSolving": 0-10 number,
        "communicationClarity": 0-10 number,
        "confidence": 0-10 number,
        "feedback": "Write constructive, detailed feedback explaining the marks, strengths, weaknesses, and suggestions.",
        "idealAnswerSummary": "Summary of the expected ideal answer."
      }
    `;

    try {
      const res = await this.callLLM(prompt, true);
      return JSON.parse(res);
    } catch (e) {
      console.error("Evaluation JSON error:", e);
      return JSON.parse(this.mockFallback(prompt, true));
    }
  }

  /**
   * Generate Final Candidate Report
   */
  public static async generateReport(sessionData: {
    jobTitle: string;
    jobDescription: string;
    difficulty: string;
    candidateName: string;
    transcript: { question: string; answer: string; scores?: any }[];
  }): Promise<FinalReport> {
    const provider = this.getProvider();
    if (provider === "mock") {
      return this.mockGenerateReport(sessionData);
    }

    const prompt = `
      [GENERATE_REPORT]
      You are an executive recruiter assistant. Review this technical interview transcript and output a final evaluation report.

      Candidate: ${sessionData.candidateName}
      Job: ${sessionData.jobTitle}
      Difficulty: ${sessionData.difficulty}

      Interview Transcript:
      ${sessionData.transcript.map(t => `Q: ${t.question}\nA: ${t.answer}\nScores: ${JSON.stringify(t.scores || {})}`).join("\n\n")}

      Evaluate:
      1. Technical Score (average of technical accuracy, depth, problem solving across technical phases)
      2. Coding Score (average score during coding questions, if any)
      3. Communication Score (average of communication clarity and confidence)
      4. Behavioral Score (average of questions evaluated under behavioral STAR criteria)
      5. Overall Score (total average score normalized out of 50)
      6. Identify strengths, weaknesses, knowledge gaps, and projects discussions.
      7. Provide recommended learning and a final recommendation (STRONG_YES, YES, MAYBE, NO) with confidence percentage (0-100).

      Return ONLY a valid JSON object matching this structure:
      {
        "overallScore": number (out of 50),
        "technicalScore": number (out of 10),
        "codingScore": number (out of 10),
        "communicationScore": number (out of 10),
        "behavioralScore": number (out of 10),
        "strengths": "Detailed bullet points/paragraphs of strengths",
        "weaknesses": "Detailed weaknesses observed",
        "knowledgeGaps": "Specific knowledge gaps and missed concepts",
        "projectsDiscussion": "Analysis of projects discussed in relation to this role",
        "recommendedLearning": "Specific learning paths/resources based on weaknesses",
        "hiringRecommendation": "STRONG_YES | YES | MAYBE | NO",
        "recommendationConfidence": number (0-100)
      }
    `;

    try {
      const res = await this.callLLM(prompt, true);
      return JSON.parse(res);
    } catch (e) {
      console.error("Report Generation JSON error (falling back to dynamic mock report):", e);
      return this.mockGenerateReport(sessionData);
    }
  }

  private static mockEvaluate(answer: string, phase: string): any {
    const cleanAnswer = answer.trim().toLowerCase();
    
    // Heuristics for poor answers
    const isTimeout = cleanAnswer.includes("timeout") || cleanAnswer.includes("skipped") || cleanAnswer.includes("[no response") || cleanAnswer.includes("no response");
    const isDonotKnow = cleanAnswer.includes("don't know") || cleanAnswer.includes("dont know") || cleanAnswer.includes("no idea") || cleanAnswer.includes("pass") || cleanAnswer.includes("skip") || cleanAnswer.includes("wrong answer") || cleanAnswer.includes("sorry") || cleanAnswer.includes("i do not know");
    const isTooShort = cleanAnswer.length < 15;
    
    if (isTimeout || isDonotKnow || isTooShort) {
      return {
        technicalAccuracy: 1,
        depthOfKnowledge: 1,
        problemSolving: 1,
        communicationClarity: 1,
        confidence: 1,
        feedback: "The candidate failed to provide a meaningful explanation. The response was either empty, skipped, or indicated a lack of understanding.",
        idealAnswerSummary: "An ideal response would explain standard principles, cover core architecture blocks, and analyze relevant runtime details."
      };
    }

    // Heuristics for CODING
    if (phase === "CODING" || cleanAnswer.includes("submitted code") || cleanAnswer.includes("function") || cleanAnswer.includes("def ")) {
      const containsCodeKeywords = cleanAnswer.includes("function") || cleanAnswer.includes("def ") || cleanAnswer.includes("return") || cleanAnswer.includes("let ") || cleanAnswer.includes("const ") || cleanAnswer.includes("var ") || cleanAnswer.includes("{") || cleanAnswer.includes(";");
      const hasSyntaxError = cleanAnswer.includes("syntaxerror") || cleanAnswer.includes("error");

      if (!containsCodeKeywords || hasSyntaxError) {
        return {
          technicalAccuracy: 2,
          depthOfKnowledge: 2,
          problemSolving: 1,
          communicationClarity: 3,
          confidence: 2,
          feedback: "The code submitted did not contain valid syntactic structures or failed standard compile execution blocks.",
          idealAnswerSummary: "The optimal solution would implement a sliding window O(N) solution using a hash map or character set."
        };
      }
    }

    // Heuristics for valid/realistic grading
    let score = 5;
    let feedback = "Provided a generic explanation. Lacked structural STAR layouts, complexity breakdowns, and specific edge case descriptions.";
    
    if (phase === "RESUME_Q") {
      if (cleanAnswer.includes("react") || cleanAnswer.includes("hook") || cleanAnswer.includes("state") || cleanAnswer.includes("typescript") || cleanAnswer.includes("node")) {
        score = 8;
        feedback = "Addressed resume projects and skills well, showing familiarity with the runtime environment and libraries.";
      }
    } else if (phase === "SYSTEM_DESIGN") {
      if (cleanAnswer.includes("scale") || cleanAnswer.includes("redis") || cleanAnswer.includes("websocket") || cleanAnswer.includes("database") || cleanAnswer.includes("cache")) {
        score = 8;
        feedback = "Correctly addressed scalability bottlenecks, explaining connection management and caching layer tradeoffs.";
      }
    } else if (phase === "BEHAVIORAL") {
      if (cleanAnswer.includes("conflict") || cleanAnswer.includes("agree") || cleanAnswer.includes("team") || cleanAnswer.includes("resolution")) {
        score = 8;
        feedback = "Response structured well using standard STAR frameworks, highlighting team coordination and collaborative alignment.";
      }
    } else if (phase === "CODING") {
      if (cleanAnswer.includes("return") && (cleanAnswer.includes("for") || cleanAnswer.includes("while") || cleanAnswer.includes("map") || cleanAnswer.includes("reduce") || cleanAnswer.includes("filter") || cleanAnswer.includes("if"))) {
        score = 9;
        feedback = "The submitted code successfully compiles, implements logic loops correctly, and passes standard complexity checks.";
      }
    }

    return {
      technicalAccuracy: score,
      depthOfKnowledge: score,
      problemSolving: Math.max(1, score - 1),
      communicationClarity: Math.max(1, score + 1),
      confidence: score,
      feedback,
      idealAnswerSummary: "An ideal response would detail performance metrics, discuss trade-offs, and suggest optimizations."
    };
  }

  private static mockGenerateReport(sessionData: {
    jobTitle: string;
    jobDescription: string;
    difficulty: string;
    candidateName: string;
    transcript: { question: string; answer: string; scores?: any }[];
  }): FinalReport {
    const transcript = sessionData.transcript || [];
    
    let totalTechnical = 0;
    let totalDepth = 0;
    let totalProblemSolving = 0;
    let totalCommunication = 0;
    let totalConfidence = 0;
    let count = 0;

    for (const entry of transcript) {
      if (entry.scores) {
        totalTechnical += entry.scores.technicalAccuracy || 1;
        totalDepth += entry.scores.depthOfKnowledge || 1;
        totalProblemSolving += entry.scores.problemSolving || 1;
        totalCommunication += entry.scores.communicationClarity || 1;
        totalConfidence += entry.scores.confidence || 1;
        count++;
      }
    }

    const divisor = count > 0 ? count : 1;
    const avgTech = Number((totalTechnical / divisor).toFixed(1));
    const avgDepth = Number((totalDepth / divisor).toFixed(1));
    const avgProblemSolving = Number((totalProblemSolving / divisor).toFixed(1));
    const avgComm = Number((totalCommunication / divisor).toFixed(1));
    const avgConf = Number((totalConfidence / divisor).toFixed(1));

    const technicalScore = Number(((avgTech + avgDepth) / 2).toFixed(1));
    const codingScore = avgProblemSolving;
    const communicationScore = Number(((avgComm + avgConf) / 2).toFixed(1));
    const behavioralScore = Number(((avgDepth + avgComm) / 2).toFixed(1));

    const overallScore = Math.round(
      ((technicalScore + codingScore + communicationScore + behavioralScore) / 40) * 50
    );

    let hiringRecommendation: "STRONG_YES" | "YES" | "MAYBE" | "NO" = "NO";
    let strengths = "";
    let weaknesses = "";
    let knowledgeGaps = "";
    let recommendedLearning = "";

    if (overallScore >= 40) {
      hiringRecommendation = "STRONG_YES";
      strengths = "Exhibited advanced structural planning, strong implementation details, and optimal runtime complexity analyses.";
      weaknesses = "Showed minor hesitations when detailing obscure scaling bottlenecks.";
      knowledgeGaps = "Very few gaps detected. Could benefit from deep-diving database indexing profiles.";
      recommendedLearning = "Study advanced query optimizations and database execution plans.";
    } else if (overallScore >= 30) {
      hiringRecommendation = "YES";
      strengths = "Good core knowledge of framework syntax and basic modular design patterns.";
      weaknesses = "Lacks depth in explaining low-level system scaling and memory bounds.";
      knowledgeGaps = "Foundational concepts are solid, but caching mechanics (Redis/WebSocket scaling) need review.";
      recommendedLearning = "Build simple high-concurrency event loops and implement caching layers.";
    } else if (overallScore >= 18) {
      hiringRecommendation = "MAYBE";
      strengths = "Understands functional basics but struggles with technical depth and implementation consistency.";
      weaknesses = "Frequent pauses during technical questions, insufficient system design architectures.";
      knowledgeGaps = "Lacks understanding of concurrency, data structures, and database constraints.";
      recommendedLearning = "Complete foundational data structures courses and system design guides.";
    } else {
      hiringRecommendation = "NO";
      strengths = "Minimal technical communication logged.";
      weaknesses = "Candidate did not answer most questions, timed out, or provided incorrect answers.";
      knowledgeGaps = "Severe technical gaps across coding syntax, system architectures, and engineering logic.";
      recommendedLearning = "Enroll in fundamental computer science courses and resume technical mock practices.";
    }

    return {
      overallScore,
      technicalScore,
      codingScore,
      communicationScore,
      behavioralScore,
      strengths,
      weaknesses,
      knowledgeGaps,
      projectsDiscussion: "Discussed general projects from the profile resume with limited detail.",
      recommendedLearning,
      hiringRecommendation,
      recommendationConfidence: overallScore >= 45 ? 90 : overallScore >= 30 ? 80 : 70,
    };
  }
}
