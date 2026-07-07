"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchJobs,
  createJob,
  deleteJob,
  fetchCandidates,
  inviteCandidate,
  fetchAnalytics,
  seedDatabase,
  Job,
  CandidateSession,
  Analytics,
} from "../../lib/api";
import {
  Users,
  Award,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Send,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  FileText,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  X,
  PieChart as LucidePieChart,
  Target,
  Briefcase,
  Bot,
  BookOpen
} from "lucide-react";

export default function RecruiterDashboard() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<CandidateSession[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Form states
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    duration: 30,
    difficulty: "INTERMEDIATE",
    interviewType: "FULL",
    evaluationCriteria: "",
  });
  const [newInvite, setNewInvite] = useState({
    name: "",
    email: "",
    jobId: "",
  });

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [activeReportSessionId, setActiveReportSessionId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Toast-like alerts
  const [message, setMessage] = useState<string | null>(null);

  // Recruiter Dashboard tab switcher
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "OPENINGS" | "CANDIDATES">("ANALYTICS");

  const loadData = async () => {
    try {
      setLoading(true);
      const jobsData = await fetchJobs();
      const candidatesData = await fetchCandidates();
      const analyticsData = await fetchAnalytics();

      setJobs(jobsData);
      setCandidates(candidatesData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Error loading recruiter data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSeed = async () => {
    try {
      setLoading(true);
      await seedDatabase();
      setMessage("Sample database successfully seeded!");
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createJob(newJob);
      setMessage("Job posting created successfully!");
      setNewJob({
        title: "",
        description: "",
        duration: 30,
        difficulty: "INTERMEDIATE",
        interviewType: "FULL",
        evaluationCriteria: "",
      });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to create job: " + err.message);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      await deleteJob(id);
      setMessage("Job deleted.");
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvite.jobId) {
      alert("Please select a job opening.");
      return;
    }
    try {
      const res = await inviteCandidate(newInvite.name, newInvite.email, newInvite.jobId);
      setGeneratedLink(res.inviteLink);
      setNewInvite({ name: "", email: "", jobId: "" });
      setMessage("Candidate invite link generated!");
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to invite: " + err.message);
    }
  };

  const viewReport = async (sessionId: string) => {
    try {
      setReportLoading(true);
      setActiveReportSessionId(sessionId);
      const API_BASE_URL = "http://localhost:8000/api";
      const res = await fetch(`${API_BASE_URL}/session/${sessionId}/report`);
      if (!res.ok) throw new Error("Failed to load report data");
      const reportDetails = await res.json();
      setSelectedReport(reportDetails);
    } catch (err) {
      console.error(err);
      alert("Failed to load report data.");
      setActiveReportSessionId(null);
    } finally {
      setReportLoading(false);
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-transparent min-h-screen text-zinc-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 text-sm font-semibold">Configuring Recruiter Workspace...</p>
      </div>
    );
  }

  return (
    <div className="bg-transparent text-zinc-100 min-h-screen font-sans flex flex-col md:flex-row relative">
      <div className="noise-overlay" />

      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Collapsible Recruiter Sidebar */}
      <aside className="w-full md:w-64 bg-white/5 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10/60 p-6 flex flex-col justify-between z-10 backdrop-blur-md shrink-0">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center">
              <Bot className="w-4 h-4 text-zinc-100" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-zinc-100">HireAI Console</span>
              <span className="text-[9px] block text-[#FF3300] font-extrabold tracking-wider uppercase leading-none mt-0.5">Recruiter Hub</span>
            </div>
          </Link>

          <div className="space-y-1.5 pt-2">
            <button 
              onClick={() => setActiveTab("ANALYTICS")}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "ANALYTICS" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
            >
              <TrendingUp className="w-4 h-4" /> Hiring Analytics
            </button>
            <button 
              onClick={() => setActiveTab("OPENINGS")}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "OPENINGS" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
            >
              <Briefcase className="w-4 h-4" /> Job Openings
            </button>
            <button 
              onClick={() => setActiveTab("CANDIDATES")}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left ${activeTab === "CANDIDATES" ? "bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-white font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 backdrop-blur-md/5 backdrop-blur-md"}`}
            >
              <Users className="w-4 h-4" /> Candidate Funnel
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-100 block">HR Manager</span>
            <span className="text-[9px] text-zinc-400 block">recruiter@company.co</span>
          </div>
          <button
            onClick={triggerSeed}
            className="text-[9px] font-bold uppercase tracking-wider text-[#FF3300] hover:text-orange-500 transition-colors"
          >
            Seed DB
          </button>
        </div>
      </aside>

      {/* Main recruiter panel cockpit */}
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-6 overflow-y-auto max-h-screen z-10">
        
        {/* Messages */}
        {message && (
          <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-50 text-xs text-orange-500 font-bold animate-pulse shadow-md">
            ✨ {message}
          </div>
        )}

        {/* WORKSPACE 1: ANALYTICS */}
        {activeTab === "ANALYTICS" && (
          <div className="space-y-6">
            
            {/* KPI grid counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="premium-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl" />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Evaluated</span>
                <div className="text-3xl font-extrabold mt-2 flex items-baseline gap-2 text-zinc-100">
                  {analytics?.totalCandidates || 0}
                  <span className="text-xs text-emerald-600 font-semibold flex items-center"><TrendingUp className="w-3 h-3" /> +8%</span>
                </div>
                <Users className="w-4 h-4 text-[#FF3300] absolute bottom-6 right-6" />
              </div>

              <div className="premium-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 rounded-full blur-xl" />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Interviews Completed</span>
                <div className="text-3xl font-extrabold mt-2 text-zinc-100">
                  {analytics?.interviewsCompleted || 0}
                </div>
                <ClipboardList className="w-4 h-4 text-purple-600 absolute bottom-6 right-6" />
              </div>

              <div className="premium-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/5 rounded-full blur-xl" />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Average Score</span>
                <div className="text-3xl font-extrabold mt-2 flex items-baseline gap-1 text-zinc-100">
                  {analytics?.averageScore || 0}
                  <span className="text-xs text-zinc-400">/ 50</span>
                </div>
                <Award className="w-4 h-4 text-fuchsia-400 absolute bottom-6 right-6" />
              </div>

              <div className="premium-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Completion Rate</span>
                <div className="text-3xl font-extrabold mt-2 text-zinc-100">
                  {analytics?.completionRate || 0}%
                </div>
                <Clock className="w-4 h-4 text-emerald-600 absolute bottom-6 right-6" />
              </div>

            </div>

            {/* Custom SVG line-charts / bar-charts representing analytics distributions */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Strongest skills line bars */}
              <div className="premium-card p-6 space-y-6">
                <h4 className="font-bold text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-4 h-4 text-[#FF3300]" /> Strongest Evaluated Skills</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">React & Next.js Frameworks</span>
                      <span>8.8 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">System Design Architectures</span>
                      <span>7.8 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: "78%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">Space / Time DSA Complexity</span>
                      <span>7.2 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category distributions */}
              <div className="premium-card p-6 space-y-6">
                <h4 className="font-bold text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Award className="w-4 h-4 text-purple-600" /> Category Score outlines</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">Technical Dialogue accuracy</span>
                      <span>8.2 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: "82%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">Communication Clarity</span>
                      <span>8.5 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-zinc-300">Behavioral STAR Framework</span>
                      <span>8.0 / 10</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: "80%" }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* WORKSPACE 2: JOB OPENINGS */}
        {activeTab === "OPENINGS" && (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            
            {/* Create Job openings */}
            <div className="premium-card p-6 md:col-span-1 space-y-5">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-zinc-100 flex items-center gap-1.5"><Plus className="w-4 h-4 text-[#FF3300]" /> Create Position</h3>
              
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-550">Job Title</label>
                  <input
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                    placeholder="e.g. Lead Software Engineer"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-550">Roles & Description</label>
                  <textarea
                    required
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                    rows={3}
                    placeholder="e.g. Optimize React rendering profiles..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-550">Duration (mins)</label>
                    <input
                      type="number"
                      required
                      value={newJob.duration}
                      onChange={(e) => setNewJob({ ...newJob, duration: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-550">Difficulty</label>
                    <select
                      value={newJob.difficulty}
                      onChange={(e) => setNewJob({ ...newJob, difficulty: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1 text-zinc-100"
                    >
                      <option value="ENTRY">Entry</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="SENIOR">Senior</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 bg-[#FF3300] hover:scale-105 transition-transform text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Create Position</button>
              </form>
            </div>

            {/* openings lists */}
            <div className="premium-card p-6 md:col-span-2 space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-zinc-100">Active Positions ({jobs.length})</h3>
              
              {jobs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-zinc-400 text-xs italic">
                  No active job positions found. Create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-4 bg-white/5 backdrop-blur-md/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100">{job.title}</h4>
                        <div className="text-[10px] text-zinc-400 mt-1">Difficulty: {job.difficulty} &bull; Time: {job.duration} mins &bull; Mode: {job.interviewType}</div>
                      </div>
                      <button onClick={() => handleDeleteJob(job.id)} className="p-2 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* WORKSPACE 3: CANDIDATE PIPELINES */}
        {activeTab === "CANDIDATES" && (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            
            {/* Invite candidate form */}
            <div className="premium-card p-6 md:col-span-1 space-y-5">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-zinc-100 flex items-center gap-1.5"><Send className="w-4 h-4 text-[#FF3300]" /> Dispatch Invite Link</h3>
              
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-550">Candidate Name</label>
                  <input
                    type="text"
                    required
                    value={newInvite.name}
                    onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                    placeholder="Steve Rogers"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-550">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                    placeholder="steve@shield.com"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-zinc-550">Target Position</label>
                  <select
                    value={newInvite.jobId}
                    onChange={(e) => setNewInvite({ ...newInvite, jobId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 focus:outline-none focus:border-indigo-500 text-xs mt-1 text-zinc-100"
                  >
                    <option value="">-- Choose Position --</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.difficulty})
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="w-full py-2.5 bg-indigo-655 hover:scale-105 transition-transform text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /> Generate Assessment invite</button>
              </form>

              {/* link widget */}
              {generatedLink && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                  <span className="block font-semibold text-zinc-400">Invite Assessment URL:</span>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={generatedLink} className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 rounded px-2 py-1 text-[10px] select-all outline-none" />
                    <button onClick={() => copyToClipboard(generatedLink)} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-350">{copiedLink === generatedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}</button>
                  </div>
                </div>
              )}
            </div>

            {/* invited candidate lists */}
            <div className="premium-card p-6 md:col-span-2 space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-zinc-100">Screening pipeline ({candidates.length})</h3>
              
              {candidates.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-zinc-400 text-xs italic">
                  No candidates invited yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((session) => {
                    const latestReport = session.reports?.[0];
                    const inviteLink = `http://localhost:3000/interview/${session.id}`;

                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md/5 backdrop-blur-md hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-zinc-100">{session.candidate.name}</h4>
                            {session.isPlagiarised && (
                              <span className="text-[8px] bg-red-950 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase flex items-center gap-0.5"><ShieldAlert className="w-2.5 h-2.5" /> Plagiarism flagged</span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400">Position: {session.job.title} &bull; Email: {session.candidate.email}</div>
                          <div className="flex gap-2 pt-1">
                            <span className="text-[8px] px-2 py-0.5 rounded font-extrabold bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 uppercase">{session.status}</span>
                            {latestReport && (
                              <span className="text-[8px] px-2 py-0.5 rounded font-extrabold bg-orange-50 text-[#FF3300] uppercase">Grade: {latestReport.overallScore}/50 ({latestReport.hiringRecommendation})</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {session.status === "NOT_STARTED" ? (
                            <div className="flex gap-2">
                              <button onClick={() => copyToClipboard(inviteLink)} className="p-2 bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 hover:bg-white/10 rounded-xl text-zinc-350 text-xs flex items-center gap-1.5">{copiedLink === inviteLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} Copy</button>
                            </div>
                          ) : (
                            <button onClick={() => viewReport(session.id)} className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF3300] border border-orange-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
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

          </div>
        )}

      </main>

      {/* Recruiter report card modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-6">
            
            {/* Modal header */}
            <div className="flex items-start justify-between pb-6 border-b border-white/10">
              <div>
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#FF3300] block mb-1">Assessment Performance Report</span>
                <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
                  {selectedReport.session.candidate.name}
                  {selectedReport.session.isPlagiarised && (
                    <span className="text-[8px] bg-red-950 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase">Plagiarism Block</span>
                  )}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Position: <span className="font-semibold text-zinc-100">{selectedReport.session.job.title}</span> &bull; Email: <span className="font-semibold text-zinc-100">{selectedReport.session.candidate.email}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 text-zinc-100 rounded-xl text-xs hover:bg-zinc-850 font-bold flex items-center gap-1.5">Export PDF (Print)</button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scorecard grids */}
            {selectedReport.report ? (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Score breakdown card */}
                <div className="md:col-span-1 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-5 justify-between">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Candidate Grade</span>
                    <div className="text-5xl font-black text-[#FF3300]">{selectedReport.report.overallScore}</div>
                    <span className="text-[9px] text-zinc-400 block mt-1">Normalized / 50 Marks</span>
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

            {/* Anti-Cheating Telemetry logs inside the modal */}
            {selectedReport.session.cheatingEvents && selectedReport.session.cheatingEvents.length > 0 && (
              <div className="border-t border-white/10 pt-6">
                <h4 className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Anti-Cheating Telemetry Log ({selectedReport.session.cheatingEvents.length} events)
                </h4>
                <div className="max-h-36 overflow-y-auto border border-white/10 rounded-xl bg-white/5 backdrop-blur-md/5 backdrop-blur-md p-4 space-y-2">
                  {selectedReport.session.cheatingEvents.map((evt: any, i: number) => (
                    <div key={i} className="flex text-xs justify-between gap-4 border-b border-white/10/60 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-bold text-red-400 uppercase text-[9px] mr-2 px-1.5 py-0.5 rounded bg-red-950/40">{evt.eventType}</span>
                        <span className="text-zinc-300">{evt.description}</span>
                      </div>
                      <span className="text-zinc-400 text-[10px] shrink-0 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript records */}
            <div className="border-t border-white/10 pt-6">
              <h4 className="font-bold text-sm text-zinc-400 uppercase tracking-wider mb-4">Interview Conversation Transcript</h4>
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
