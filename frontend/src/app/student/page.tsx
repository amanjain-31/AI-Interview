"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createPracticeSession,
  fetchStudentPracticeSessions,
  CandidateSession
} from "../../lib/api";
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  Copy,
  Check,
  Clock,
  Sparkles,
  Play,
  FileText,
  Loader2,
  Users,
  History,
  TrendingUp,
  Award,
  BookOpen,
  Settings,
  ChevronRight,
  Shield,
  Briefcase,
  Layers,
  X
} from "lucide-react";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Free trial counter
  const [trialsLeft, setTrialsLeft] = useState(3);

  // Setup practice parameters
  const [jobTitle, setJobTitle] = useState("Frontend Engineer (React/TypeScript)");
  const [difficulty, setDifficulty] = useState("INTERMEDIATE");
  const [interviewType, setInterviewType] = useState("FULL");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("Only PDF format resumes are accepted.");
        return;
      }
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setPdfBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Student mock history
  const [practiceSessions, setPracticeSessions] = useState<CandidateSession[]>([]);

  // Report Modal
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeReportSessionId, setActiveReportSessionId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Active Tab state for student sidebar workspace
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PRACTICE" | "HISTORY">("OVERVIEW");

  useEffect(() => {
    const savedName = localStorage.getItem("student_name");
    const savedEmail = localStorage.getItem("student_email");
    const savedTrials = localStorage.getItem("mock_trials_left");

    if (savedTrials !== null) {
      setTrialsLeft(parseInt(savedTrials));
    } else {
      localStorage.setItem("mock_trials_left", "3");
      setTrialsLeft(3);
    }

    if (savedName && savedEmail) {
      setStudentName(savedName);
      setStudentEmail(savedEmail);
      setIsLoggedIn(true);
      loadMockHistory(savedEmail);
    }
  }, []);

  const loadMockHistory = async (email: string) => {
    try {
      setHistoryLoading(true);
      const data = await fetchStudentPracticeSessions(email);
      setPracticeSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName && studentEmail) {
      localStorage.setItem("student_name", studentName);
      localStorage.setItem("student_email", studentEmail);
      setIsLoggedIn(true);
      loadMockHistory(studentEmail);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("student_name");
    localStorage.removeItem("student_email");
    setIsLoggedIn(false);
    setStudentName("");
    setStudentEmail("");
    setPracticeSessions([]);
  };

  const handleResetTrials = () => {
    localStorage.setItem("mock_trials_left", "3");
    setTrialsLeft(3);
    setMessage("Free practice trials reset to 3!");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStartMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trialsLeft <= 0) {
      alert("You have run out of free trials. Click the 'Reset Free Trials' button to replenish your account for testing!");
      return;
    }

    try {
      setLoading(true);
      const res = await createPracticeSession(
        studentName,
        studentEmail,
        jobTitle,
        difficulty,
        interviewType
      );

      const newTrials = trialsLeft - 1;
      setTrialsLeft(newTrials);
      localStorage.setItem("mock_trials_left", newTrials.toString());

      if (pdfFile && pdfBase64) {
        const API_BASE_URL = "http://localhost:8000/api";
        const uploadRes = await fetch(`${API_BASE_URL}/session/${res.sessionId}/resume-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: pdfFile.name,
            fileData: pdfBase64
          })
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to parse and upload PDF resume");
        }
      }

      window.open(res.inviteLink, "_blank");
      setMessage("Mock Interview started in a new tab!");
      loadMockHistory(studentEmail);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert("Failed to start mock session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (sessionId: string) => {
    try {
      setReportLoading(true);
      setActiveReportSessionId(sessionId);
      const API_BASE_URL = "http://localhost:8000/api";
      const res = await fetch(`${API_BASE_URL}/session/${sessionId}/report`);
      if (!res.ok) throw new Error("Failed to load practice scorecard");
      const data = await res.json();
      setSelectedReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to retrieve scorecard details.");
    } finally {
      setReportLoading(false);
      setActiveReportSessionId(null);
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="bg-transparent text-zinc-100 min-h-screen font-sans flex flex-col md:flex-row relative">
      <div className="noise-overlay" />

      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-white/5 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10/60 p-6 flex flex-col justify-between z-10 backdrop-blur-md shrink-0">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center">
              <Bot className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-zinc-100">HireAI Student</span>
              <span className="text-[9px] block text-[#FF3300] font-extrabold tracking-wider uppercase leading-none mt-0.5">Mock Arena</span>
            </div>
          </Link>

          {isLoggedIn && (
            <div className="space-y-1.5 pt-2">
              <button 
                onClick={() => setActiveTab("OVERVIEW")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "OVERVIEW" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
              >
                <Layers className="w-4 h-4" /> Overview Dashboard
              </button>
              <button 
                onClick={() => setActiveTab("PRACTICE")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "PRACTICE" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
              >
                <Play className="w-4 h-4 fill-current" /> Start Mock Practice
              </button>
              <button 
                onClick={() => setActiveTab("HISTORY")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "HISTORY" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
              >
                <History className="w-4 h-4" /> Assessment History
              </button>
            </div>
          )}
        </div>

        {isLoggedIn && (
          <div className="pt-6 border-t border-white/10/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-100 block">{studentName}</span>
              <span className="text-[9px] text-zinc-400 block truncate max-w-[120px]">{studentEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main portal cockpit */}
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-6 overflow-y-auto max-h-screen z-10">
        
        {/* Toast alerts */}
        {message && (
          <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-50 text-xs text-orange-500 font-bold animate-pulse shadow-md">
            ✨ {message}
          </div>
        )}

        {/* WELCOME / SETUP (NOT LOGGED IN) */}
        {!isLoggedIn ? (
          <div className="max-w-md w-full mx-auto my-auto p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md backdrop-blur-md flex flex-col gap-6 shadow-2xl relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="w-8 h-8 text-zinc-100" />
            </div>

            <div className="text-center pt-8">
              <h2 className="text-2xl font-black mb-1">Mock Practice Portal</h2>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">Enter details to generate adaptive mock runs, verify code sandbox environments, and review executive scorecards.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div>
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Candidate Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs text-zinc-100 mt-1.5"
                  placeholder="Aman Jain"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs text-zinc-100 mt-1.5"
                  placeholder="aman.jain@example.com"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white hover:scale-105 transition-transform font-bold text-xs shadow-md"
              >
                Access Student Arena
              </button>
            </form>
          </div>
        ) : (
          /* LOGGED IN WORKSPACES */
          <div className="space-y-8">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === "OVERVIEW" && (
              <div className="space-y-6">
                {/* Greeting widget banner */}
                <div className="premium-card p-6 border border-white/10 bg-white/5 backdrop-blur-md/5 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-[#FF3300] tracking-widest block">Candidate Assessment Dashboard</span>
                    <h2 className="text-2xl font-black text-zinc-100">Welcome back, {studentName}!</h2>
                    <p className="text-xs text-zinc-400">Your practice assessment profile is configured. Get detailed analytics of DSA and STAR behaviorals.</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                    <div className="text-center pr-4 border-r border-white/10">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">Streak</span>
                      <span className="text-xl font-black text-zinc-100">2 Days</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">Free Trials</span>
                      <span className="text-xl font-black text-[#FF3300]">{trialsLeft} / 3 Left</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  
                  {/* Skill Radar mock visualization via clean custom SVG */}
                  <div className="premium-card p-6 md:col-span-1 flex flex-col justify-between min-h-[300px]">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-4">Competency Map</span>
                    <div className="flex-1 flex items-center justify-center">
                      <svg width="160" height="160" viewBox="0 0 160 160" className="opacity-80">
                        {/* pentagon grids */}
                        <polygon points="80,10 146,58 121,136 39,136 14,58" fill="none" stroke="#27272a" strokeWidth="1" />
                        <polygon points="80,30 130,66 111,122 49,122 30,66" fill="none" stroke="#27272a" strokeWidth="1" />
                        <polygon points="80,50 113,74 100,108 60,108 47,74" fill="none" stroke="#27272a" strokeWidth="1" />
                        
                        {/* pentagon lines axis */}
                        <line x1="80" y1="80" x2="80" y2="10" stroke="#27272a" strokeWidth="1" />
                        <line x1="80" y1="80" x2="146" y2="58" stroke="#27272a" strokeWidth="1" />
                        <line x1="80" y1="80" x2="121" y2="136" stroke="#27272a" strokeWidth="1" />
                        <line x1="80" y1="80" x2="39" y2="136" stroke="#27272a" strokeWidth="1" />
                        <line x1="80" y1="80" x2="14" y2="58" stroke="#27272a" strokeWidth="1" />

                        {/* candidate score overlay pentagon polygon */}
                        <polygon points="80,25 125,62 108,122 55,108 28,66" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-400 font-extrabold uppercase mt-2">
                      <span>Tech</span>
                      <span>Code</span>
                      <span>Sys</span>
                      <span>Comm</span>
                      <span>STAR</span>
                    </div>
                  </div>

                  {/* Career Roadmaps list */}
                  <div className="premium-card p-6 md:col-span-2 space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Recommended Practice Syllabus</span>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-white/5 backdrop-blur-md/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-[#FF3300]" /> Resume dialogue prep</h4>
                          <p className="text-[10px] text-zinc-400">Tailored verbal drills focusing on projects in profile resume.</p>
                        </div>
                        <button onClick={() => { setInterviewType("TECHNICAL"); setActiveTab("PRACTICE"); }} className="p-1.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 text-zinc-400 hover:text-zinc-100"><ChevronRight className="w-4 h-4" /></button>
                      </div>

                      <div className="p-4 bg-white/5 backdrop-blur-md/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-600" /> System Design Architectures</h4>
                          <p className="text-[10px] text-zinc-400">Design caching layers, scaling sockets, load balancer configs.</p>
                        </div>
                        <button onClick={() => { setInterviewType("TECHNICAL"); setJobTitle("System Design Architect"); setActiveTab("PRACTICE"); }} className="p-1.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 text-zinc-400 hover:text-zinc-100"><ChevronRight className="w-4 h-4" /></button>
                      </div>

                      <div className="p-4 bg-white/5 backdrop-blur-md/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Coding Algorithms Sandbox</h4>
                          <p className="text-[10px] text-zinc-400">Longest substring without repeating characters compiler sandbox.</p>
                        </div>
                        <button onClick={() => { setInterviewType("CODING"); setActiveTab("PRACTICE"); }} className="p-1.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 text-zinc-400 hover:text-zinc-100"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: START PRACTICE */}
            {activeTab === "PRACTICE" && (
              <div className="grid md:grid-cols-3 gap-8 items-start">
                
                {/* Configuration form */}
                <div className="premium-card p-6 md:col-span-2 space-y-6">
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-100">Start Practice Session</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">Configure your mock challenge below. Mocks left: <strong className="text-zinc-200">{trialsLeft}</strong>.</p>
                  </div>

                  <form onSubmit={handleStartMock} className="space-y-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-zinc-400">Job Title Focus</label>
                      <select
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1.5 text-zinc-100"
                      >
                        <option value="Frontend Engineer (React/TypeScript)">Frontend Engineer (React/TS)</option>
                        <option value="Senior Backend Architect (Node/Postgres)">Senior Backend Architect</option>
                        <option value="Full Stack Developer (Next.js/Node)">Full Stack Developer</option>
                        <option value="System Design Architect">System Design Architect</option>
                        <option value="Behavioral Prep STAR">Behavioral prep (STAR)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1.5 text-zinc-100"
                        >
                          <option value="ENTRY">Entry Level</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="SENIOR">Senior Prep</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Interview Mode</label>
                        <select
                          value={interviewType}
                          onChange={(e) => setInterviewType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1.5 text-zinc-100"
                        >
                          <option value="FULL">Full Assessment</option>
                          <option value="TECHNICAL">Technical only</option>
                          <option value="CODING">Coding only</option>
                          <option value="BEHAVIORAL">Behavioral STAR only</option>
                        </select>
                      </div>
                    </div>

                    {trialsLeft > 0 ? (
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white hover:scale-105 transition-transform font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Orchestrating Session...
                          </>
                        ) : (
                          <>
                            Start Assessment <Play className="w-3.5 h-3.5 fill-current" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[10px] text-red-300 text-center leading-relaxed">
                        ❌ All mock practice trials used. Buy growth plan or reset below.
                      </div>
                    )}
                  </form>
                  
                  <button
                    onClick={handleResetTrials}
                    className="w-full py-2 border border-dashed border-white/10 hover:border-orange-500/50 text-zinc-400 hover:text-[#FF3300] font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all"
                  >
                    Reset Trial Allocations (Demo Tool)
                  </button>
                </div>

                {/* Resume Upload Drag zone */}
                <div className="premium-card p-6 md:col-span-1 space-y-4">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Resume upload</span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="hidden"
                      id="student-dashboard-pdf-uploader"
                    />
                    <label
                      htmlFor="student-dashboard-pdf-uploader"
                      className="w-full p-8 border border-dashed border-white/10 hover:border-orange-500/50 bg-white/5 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 text-xs text-center transition-all"
                    >
                      <FileText className="w-7 h-7 text-zinc-400" />
                      {pdfFile ? (
                        <span className="text-emerald-600 font-bold max-w-[150px] truncate">{pdfFile.name}</span>
                      ) : (
                        <span className="text-zinc-400 leading-normal">Drag profile resume PDF here</span>
                      )}
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: ASSESSMENT HISTORY */}
            {activeTab === "HISTORY" && (
              <div className="premium-card p-6 border border-white/10 bg-white/5 backdrop-blur-md">
                <div className="mb-6">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-100">Mock Assessments History</h3>
                  <p className="text-[10px] text-zinc-400 mt-1">Review completed assessment reports, score distributions, and dialog transcripts.</p>
                </div>

                {historyLoading ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="text-zinc-400 text-xs italic">Loading scorecard reports...</span>
                  </div>
                ) : practiceSessions.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl text-zinc-400 text-xs italic">
                    No mock practice runs completed yet. Create a practice assessment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {practiceSessions.map((session) => {
                      const latestReport = session.reports?.[0];
                      const link = `http://localhost:3000/interview/${session.id}`;

                      return (
                        <div
                          key={session.id}
                          className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md/5 backdrop-blur-md hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-zinc-100">{session.job.title}</h4>
                            <div className="text-[10px] text-zinc-400">
                              Difficulty: {session.job.difficulty} &bull; Mode: {session.job.interviewType}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span
                                className={`text-[8px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                                  session.status === "EVALUATED"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : session.status === "COMPLETED"
                                    ? "bg-orange-50 text-[#FF3300] border-orange-500/20"
                                    : "bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 border-white/10"
                                }`}
                              >
                                {session.status}
                              </span>
                              {latestReport && (
                                <span className="text-[8px] px-2 py-0.5 rounded font-extrabold bg-orange-50 text-[#FF3300] border border-orange-500/20 uppercase">
                                  Grade: {latestReport.overallScore}/50 ({latestReport.hiringRecommendation})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {session.status === "NOT_STARTED" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(link)}
                                  className="p-2 bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 hover:bg-white/10 rounded-xl text-zinc-300 text-xs flex items-center gap-1.5"
                                >
                                  {copiedLink === link ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  Copy
                                </button>
                                <Link
                                  href={`/interview/${session.id}`}
                                  target="_blank"
                                  className="px-4 py-2 bg-[#FF3300] hover:scale-105 transition-transform text-zinc-100 rounded-xl text-xs font-bold flex items-center gap-1"
                                >
                                  Resume <Play className="w-3.5 h-3.5 fill-current" />
                                </Link>
                              </div>
                            ) : (
                              <button
                                onClick={() => viewReport(session.id)}
                                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF3300] border border-orange-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                              >
                                  {activeReportSessionId === session.id && reportLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                View Scorecard
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-6">
            
            {/* Modal header */}
            <div className="flex items-start justify-between pb-6 border-b border-white/10">
              <div>
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#FF3300] block mb-1">Assessment Practice Scorecard</span>
                <h2 className="text-xl font-extrabold text-zinc-100">
                  {selectedReport.session.job.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Difficulty: <span className="font-semibold text-zinc-100">{selectedReport.session.job.difficulty}</span> &bull; Mode: <span className="font-semibold text-zinc-100">{selectedReport.session.job.interviewType}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-zinc-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scorecard grids */}
            {selectedReport.report ? (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Score breakdown card */}
                <div className="md:col-span-1 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10/60 flex flex-col gap-5 justify-between">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Mock Grade</span>
                    <div className="text-5xl font-black text-[#FF3300]">{selectedReport.report.overallScore}</div>
                    <span className="text-[9px] text-zinc-400 block mt-1">Overall / 50 Marks</span>
                  </div>

                  <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">AI Recommendation</span>
                    <div
                      className={`text-lg font-black ${
                        selectedReport.report.hiringRecommendation === "STRONG_YES"
                          ? "text-emerald-600"
                          : selectedReport.report.hiringRecommendation === "YES"
                          ? "text-teal-400"
                          : selectedReport.report.hiringRecommendation === "MAYBE"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {selectedReport.report.hiringRecommendation.replace("_", " ")}
                    </div>
                    <span className="text-[9px] text-zinc-400 block mt-1">
                      Confidence: {selectedReport.report.recommendationConfidence}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Technical Score</span>
                      <span className="font-bold text-zinc-100">{selectedReport.report.technicalScore} / 10</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Coding Score</span>
                      <span className="font-bold text-zinc-100">{selectedReport.report.codingScore} / 10</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Communication Score</span>
                      <span className="font-bold text-zinc-100">{selectedReport.report.communicationScore} / 10</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Behavioral Score</span>
                      <span className="font-bold text-zinc-100">{selectedReport.report.behavioralScore} / 10</span>
                    </div>
                  </div>
                </div>

                {/* Scorecard feedback */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h4 className="font-bold text-xs text-emerald-600 uppercase tracking-widest mb-1.5">Strengths</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{selectedReport.report.strengths}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-red-400 uppercase tracking-widest mb-1.5">Weaknesses</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{selectedReport.report.weaknesses}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-widest mb-1.5">Knowledge Gaps</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{selectedReport.report.knowledgeGaps}</p>
                  </div>
                  {selectedReport.report.recommendedLearning && (
                    <div className="p-4 rounded-xl border border-orange-500/20 bg-indigo-950/15">
                      <h4 className="font-bold text-xs text-[#FF3300] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-4 h-4" /> Recommended Learning Path
                      </h4>
                      <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{selectedReport.report.recommendedLearning}</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white/5 text-center italic text-zinc-400 text-sm">
                Scorecard report could not be compiled.
              </div>
            )}

            {/* Transcript records */}
            <div className="border-t border-white/10 pt-6">
              <h4 className="font-bold text-sm text-zinc-400 uppercase tracking-wider mb-4">Mock Interview Dialog Transcript</h4>
              <div className="space-y-4">
                {selectedReport.transcript.map((chat: any, i: number) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10/60 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-md bg-orange-100 border border-orange-500/20 text-[10px] text-[#FF3300] font-bold flex items-center justify-center shrink-0">Q</span>
                      <p className="text-xs font-semibold text-zinc-100 leading-relaxed">{chat.question}</p>
                    </div>
                    
                    <div className="flex items-start gap-3 pl-6 border-l border-white/10">
                      <span className="w-6 h-6 rounded-md bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 text-[10px] text-zinc-400 font-bold flex items-center justify-center shrink-0">A</span>
                      <div className="text-xs text-zinc-300 leading-relaxed w-full">
                        {chat.answer.startsWith("[Submitted Code") ? (
                          <pre className="p-3 bg-black/40 text-emerald-400 border border-white/10 rounded-lg text-emerald-600 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto leading-relaxed max-w-full">
                            {chat.answer}
                          </pre>
                        ) : (
                          <p>{chat.answer}</p>
                        )}

                        {chat.codeOutputs && (
                          <div className="mt-2.5 p-2 bg-white/10 rounded border border-white/10 text-[10px] text-zinc-400 font-mono">
                            <div className="font-bold text-zinc-400 mb-1">Execution output log:</div>
                            <pre className="text-zinc-300 whitespace-pre">{chat.codeOutputs.logs}</pre>
                            <div className="mt-1 text-[9px] text-zinc-400">
                              Time: {chat.codeOutputs.executionTimeMs}ms &bull; Memory: {chat.codeOutputs.memoryUsageKb}KB
                            </div>
                          </div>
                        )}

                        {chat.scores && (
                          <div className="mt-3 p-3 bg-white/10 border border-white/10 rounded-lg space-y-2">
                            <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
                              <span className="font-bold text-[9px] text-[#FF3300] uppercase tracking-widest">Question Rubrics Grading</span>
                              <span className="font-bold text-[10px] text-zinc-400">
                                Subtotal: {chat.scores.technicalAccuracy + chat.scores.depthOfKnowledge + chat.scores.problemSolving + chat.scores.communicationClarity + chat.scores.confidence} / 50
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-semibold text-zinc-400">
                              <div className="p-1 rounded bg-white/5">
                                <span className="block text-[8px] text-zinc-400">Accuracy</span>
                                <span className="font-bold text-zinc-100">{chat.scores.technicalAccuracy}/10</span>
                              </div>
                              <div className="p-1 rounded bg-white/5">
                                <span className="block text-[8px] text-zinc-400">Depth</span>
                                <span className="font-bold text-zinc-100">{chat.scores.depthOfKnowledge}/10</span>
                              </div>
                              <div className="p-1 rounded bg-white/5">
                                <span className="block text-[8px] text-zinc-400">Problem</span>
                                <span className="font-bold text-zinc-100">{chat.scores.problemSolving}/10</span>
                              </div>
                              <div className="p-1 rounded bg-white/5">
                                <span className="block text-[8px] text-zinc-400">Clarify</span>
                                <span className="font-bold text-zinc-100">{chat.scores.communicationClarity}/10</span>
                              </div>
                              <div className="p-1 rounded bg-white/5">
                                <span className="block text-[8px] text-zinc-400">Confidence</span>
                                <span className="font-bold text-zinc-100">{chat.scores.confidence}/10</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
