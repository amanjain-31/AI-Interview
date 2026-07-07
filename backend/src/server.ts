import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./services/db";
import { setupWebSocketServer } from "./websocket/interview.socket";
import { AIService } from "./services/ai.service";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- REST Endpoints ---

// Check API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Seed Initial Data
app.post("/api/seed", async (req, res) => {
  try {
    // 1. Create Company
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: "Google DeepMind Partner" },
      });
    }

    // 2. Create Recruiter
    let recruiter = await prisma.user.findFirst({
      where: { role: "RECRUITER" },
    });
    if (!recruiter) {
      recruiter = await prisma.user.create({
        data: {
          email: "recruiter@hireai.co",
          name: "Alex Recruiter",
          role: "RECRUITER",
          companyId: company.id,
        },
      });
    }

    // 3. Create Sample Jobs if none exist
    const jobCount = await prisma.job.count();
    if (jobCount === 0) {
      await prisma.job.createMany({
        data: [
          {
            title: "Frontend Engineer (React/TypeScript)",
            description: "Looking for a seasoned developer specializing in Next.js, Framer Motion, and Tailwind CSS. Experience with states and performance is a plus.",
            duration: 45,
            difficulty: "INTERMEDIATE",
            interviewType: "FULL",
            evaluationCriteria: "Strong focus on React Hooks, Next.js optimization, and UI styling principles.",
            companyId: company.id,
          },
          {
            title: "Senior Backend Architect (Node.js/PostgreSQL)",
            description: "Responsible for scaling microservices, system design modeling, database caching, and high concurrent loads.",
            duration: 60,
            difficulty: "SENIOR",
            interviewType: "FULL",
            evaluationCriteria: "Must demonstrate deep knowledge of distributed systems, indexing, and API lifecycle.",
            companyId: company.id,
          },
          {
            title: "Junior Backend Developer",
            description: "Entry-level developer to build Express APIs, run tests, and manage simple schema integrations.",
            duration: 30,
            difficulty: "ENTRY",
            interviewType: "CODING",
            evaluationCriteria: "Basic problem solving, syntax validation, and eagerness to learn.",
            companyId: company.id,
          },
        ],
      });
    }

    res.json({ message: "Database seeded successfully!" });
  } catch (error: any) {
    console.error("Seeding error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Jobs Routes
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/jobs", async (req, res) => {
  const { title, description, duration, difficulty, interviewType, evaluationCriteria } = req.body;
  try {
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({ data: { name: "HireAI Dev Corp" } });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        duration: parseInt(duration) || 30,
        difficulty,
        interviewType,
        evaluationCriteria: evaluationCriteria || "",
        companyId: company.id,
      },
    });
    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/jobs/:id", async (req, res) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Candidates & Invites
app.get("/api/candidates", async (req, res) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where: { isPractice: false },
      include: {
        candidate: true,
        job: true,
        reports: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/candidates/invite", async (req, res) => {
  const { name, email, jobId } = req.body;
  try {
    // 1. Create or Find candidate
    let candidate = await prisma.candidate.findUnique({ where: { email } });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: { name, email },
      });
    }

    // 2. Create session
    const session = await prisma.interviewSession.create({
      data: {
        jobId,
        candidateId: candidate.id,
        status: "NOT_STARTED",
        currentPhase: "INSTRUCTIONS",
        isPractice: false,
      },
      include: {
        candidate: true,
        job: true,
      },
    });

    res.status(201).json({
      sessionId: session.id,
      inviteLink: `http://localhost:3000/interview/${session.id}`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Student Practice Routes
app.post("/api/sessions/practice", async (req, res) => {
  const { name, email, jobTitle, difficulty, interviewType } = req.body;
  try {
    let candidate = await prisma.candidate.findUnique({ where: { email } });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: { name, email },
      });
    }

    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({ data: { name: "Mock Academy" } });
    }

    let job = await prisma.job.findFirst({
      where: { title: jobTitle, difficulty, interviewType, companyId: company.id },
    });
    if (!job) {
      job = await prisma.job.create({
        data: {
          title: jobTitle,
          description: `Self-guided mock practice session for ${jobTitle}.`,
          duration: 30,
          difficulty,
          interviewType,
          companyId: company.id,
        },
      });
    }

    const session = await prisma.interviewSession.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        status: "NOT_STARTED",
        currentPhase: "INSTRUCTIONS",
        isPractice: true,
      },
      include: {
        candidate: true,
        job: true,
      },
    });

    res.status(201).json({
      sessionId: session.id,
      inviteLink: `http://localhost:3000/interview/${session.id}`,
      session,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions/student/:email", async (req, res) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where: {
        candidate: { email: req.params.email },
        isPractice: true,
      },
      include: {
        job: true,
        reports: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Single Session details
app.get("/api/session/:id", async (req, res) => {
  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: req.params.id },
      include: {
        candidate: { include: { resumeData: true } },
        job: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Parse Resume Text
app.post("/api/session/:id/resume", async (req, res) => {
  const { resumeText } = req.body;
  const sessionId = req.params.id;

  if (!resumeText) {
    return res.status(400).json({ error: "Missing resumeText" });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { candidate: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Parse resume via AI
    const parsedData = await AIService.parseResume(resumeText);

    // Save parsed details in ResumeData
    const resumeRecord = await prisma.resumeData.upsert({
      where: { candidateId: session.candidateId },
      update: {
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        projects: parsedData.projects,
        languages: parsedData.languages || "",
      },
      create: {
        candidateId: session.candidateId,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        projects: parsedData.projects,
        languages: parsedData.languages || "",
      },
    });

    // Update candidate's resume URL representing simulated file path
    await prisma.candidate.update({
      where: { id: session.candidateId },
      data: { resumeUrl: `/resumes/${session.candidateId}.txt` },
    });

    res.json({ message: "Resume parsed and profile updated!", data: resumeRecord });
  } catch (error: any) {
    console.error("Resume parse controller error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Parse PDF Resume (Base64)
app.post("/api/session/:id/resume-pdf", async (req, res) => {
  const { fileName, fileData } = req.body;
  const sessionId = req.params.id;

  if (!fileData) {
    return res.status(400).json({ error: "Missing fileData" });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { candidate: true, job: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`Backend: Received PDF resume upload "${fileName}" for candidate ${session.candidate.name}`);

    // Generate high-quality simulated text matching the job position applied to
    const mockResumeText = `
      Candidate Name: ${session.candidate.name}
      Email: ${session.candidate.email}
      Education: B.S. in Computer Science, Tech University
      Job Position: ${session.job.title}
      Experience:
      - 3 Years as Software Developer.
      - Developed scalable user interfaces, database migrations, and unit tests.
      Skills: React, Next.js, TypeScript, Node.js, Express, PostgreSQL, SQLite, REST APIs, Git, Docker.
      Projects:
      - Task Manager Application: Next.js, CSS, Prisma ORM, SQLite.
      - Microservice Middleware: Express, Node.js, Redis caching.
    `;

    // Parse simulated text via AI ATS
    const parsedData = await AIService.parseResume(mockResumeText);

    // Save parsed details in ResumeData
    const resumeRecord = await prisma.resumeData.upsert({
      where: { candidateId: session.candidateId },
      update: {
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        projects: parsedData.projects,
        languages: parsedData.languages || "",
      },
      create: {
        candidateId: session.candidateId,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        projects: parsedData.projects,
        languages: parsedData.languages || "",
      },
    });

    // Update candidate's resume URL representing simulated file path
    await prisma.candidate.update({
      where: { id: session.candidateId },
      data: { resumeUrl: `/resumes/${session.candidateId}_${fileName}` },
    });

    res.json({ message: "PDF resume uploaded and parsed successfully!", data: resumeRecord });
  } catch (error: any) {
    console.error("PDF Resume parse controller error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch Final Evaluation Report & Transcript
app.get("/api/session/:id/report", async (req, res) => {
  try {
    const report = await prisma.report.findFirst({
      where: { sessionId: req.params.id },
    });

    const session = await prisma.interviewSession.findUnique({
      where: { id: req.params.id },
      include: {
        candidate: true,
        job: true,
        questions: {
          include: {
            answers: {
              include: { score: true },
            },
          },
        },
        cheatingEvents: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Build human-readable transcript
    const transcript = session.questions.map((q) => {
      const a = q.answers[0];
      return {
        question: q.text,
        phase: q.phase,
        answer: a ? a.text : "(No answer submitted)",
        codeOutputs: a?.codeOutputs ? JSON.parse(a.codeOutputs) : null,
        scores: a?.score || null,
        durationMs: a?.durationMs || 0,
      };
    });

    res.json({
      session,
      report,
      transcript,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recruiter Dashboard Analytics
app.get("/api/analytics", async (req, res) => {
  try {
    const totalCandidates = await prisma.candidate.count({
      where: { sessions: { some: { isPractice: false } } },
    });
    
    const completedSessions = await prisma.interviewSession.findMany({
      where: { status: { in: ["COMPLETED", "EVALUATED"] }, isPractice: false },
      include: { reports: true },
    });

    const totalSessions = await prisma.interviewSession.count({
      where: { isPractice: false },
    });
    const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

    let totalScoreSum = 0;
    let scoreCount = 0;
    const recDistribution = { STRONG_YES: 0, YES: 0, MAYBE: 0, NO: 0 };

    completedSessions.forEach((s) => {
      const r = s.reports[0];
      if (r) {
        totalScoreSum += r.overallScore;
        scoreCount++;
        const rec = r.hiringRecommendation as keyof typeof recDistribution;
        if (recDistribution[rec] !== undefined) {
          recDistribution[rec]++;
        }
      }
    });

    const averageScore = scoreCount > 0 ? totalScoreSum / scoreCount : 0;

    // Mock/Simulated weak skills and heatmaps for analytics
    const weakSkills = [
      { skill: "Docker", count: 12 },
      { skill: "Redis Caching", count: 8 },
      { skill: "Database Indexing", count: 7 },
      { skill: "React Render Optimization", count: 6 },
      { skill: "TypeScript Generics", count: 4 },
    ];

    res.json({
      totalCandidates,
      interviewsCompleted: completedSessions.length,
      averageScore: parseFloat(averageScore.toFixed(1)),
      completionRate: parseFloat(completionRate.toFixed(1)),
      hiringRecommendationDistribution: recDistribution,
      mostCommonWeakSkills: weakSkills,
      averageInterviewTime: 32, // dummy minutes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server and WebSocket
const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`HireAI Server running on port ${PORT}`);
});
