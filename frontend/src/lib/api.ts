const API_BASE_URL = "http://localhost:8000/api";

export interface Job {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  interviewType: string;
  evaluationCriteria: string;
  createdAt: string;
}

export interface CandidateSession {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  currentPhase: string;
  isPractice?: boolean;
  isPlagiarised?: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    resumeUrl?: string;
    resumeData?: {
      education: string;
      experience: string;
      skills: string;
      projects: string;
      languages?: string;
    };
  };
  job: Job;
  reports?: Report[];
}

export interface Report {
  id: string;
  sessionId: string;
  overallScore: number;
  technicalScore: number;
  codingScore: number;
  communicationScore: number;
  behavioralScore: number;
  strengths: string;
  weaknesses: string;
  knowledgeGaps: string;
  projectsDiscussion?: string;
  recommendedLearning?: string;
  hiringRecommendation: string;
  recommendationConfidence: number;
  createdAt: string;
}

export interface Analytics {
  totalCandidates: number;
  interviewsCompleted: number;
  averageScore: number;
  completionRate: number;
  hiringRecommendationDistribution: {
    STRONG_YES: number;
    YES: number;
    MAYBE: number;
    NO: number;
  };
  mostCommonWeakSkills: { skill: string; count: number }[];
  averageInterviewTime: number;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE_URL}/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function createJob(jobData: Partial<Job>): Promise<Job> {
  const res = await fetch(`${API_BASE_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) throw new Error("Failed to create job");
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete job");
}

export async function fetchCandidates(): Promise<CandidateSession[]> {
  const res = await fetch(`${API_BASE_URL}/candidates`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function inviteCandidate(name: string, email: string, jobId: string): Promise<{ inviteLink: string; sessionId: string }> {
  const res = await fetch(`${API_BASE_URL}/candidates/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, jobId }),
  });
  if (!res.ok) throw new Error("Failed to invite candidate");
  return res.json();
}

export async function fetchSession(sessionId: string): Promise<CandidateSession> {
  const res = await fetch(`${API_BASE_URL}/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function uploadResumeText(sessionId: string, resumeText: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/session/${sessionId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });
  if (!res.ok) throw new Error("Failed to parse and upload resume");
  return res.json();
}

export async function fetchReport(sessionId: string): Promise<{ session: CandidateSession; report: Report | null; transcript: any[] }> {
  const res = await fetch(`${API_BASE_URL}/session/${sessionId}/report`);
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${API_BASE_URL}/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function seedDatabase(): Promise<void> {
  await fetch(`${API_BASE_URL}/seed`, { method: "POST" });
}

export async function createPracticeSession(
  name: string,
  email: string,
  jobTitle: string,
  difficulty: string,
  interviewType: string
): Promise<{ inviteLink: string; sessionId: string }> {
  const res = await fetch(`${API_BASE_URL}/sessions/practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, jobTitle, difficulty, interviewType }),
  });
  if (!res.ok) throw new Error("Failed to create practice mock interview session");
  return res.json();
}

export async function fetchStudentPracticeSessions(email: string): Promise<CandidateSession[]> {
  const res = await fetch(`${API_BASE_URL}/sessions/student/${email}`);
  if (!res.ok) throw new Error("Failed to fetch student mock history");
  return res.json();
}
