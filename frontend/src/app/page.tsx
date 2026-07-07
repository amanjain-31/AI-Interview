"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, 
  Terminal, 
  BrainCircuit, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  ShieldAlert, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare,
  Lock,
  Star,
  Users,
  GraduationCap,
  Mic,
  Video,
  Play,
  Cpu,
  ShieldCheck,
  Award,
  Loader2
} from "lucide-react";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive demo states
  const [demoState, setDemoState] = useState<"IDLE" | "TALKING" | "LISTENING" | "EVALUATING" | "RESULT">("IDLE");
  const [demoText, setDemoText] = useState("Click 'Start Communication Check' to begin. The AI will give you a phrase to say — just speak it clearly and confidently!");
  const [demoScore, setDemoScore] = useState<number | null>(null);
  const [demoFeedback, setDemoFeedback] = useState<string>("");
  const [demoTranscript, setDemoTranscript] = useState<string>("");
  const [demoVolume, setDemoVolume] = useState<number>(0);
  const demoRecorderRef = typeof window !== "undefined" ? { current: null as MediaRecorder | null } : { current: null };
  const demoAnalyserRef = typeof window !== "undefined" ? { current: null as AnalyserNode | null } : { current: null };
  const demoAnimFrameRef = typeof window !== "undefined" ? { current: null as number | null } : { current: null };

  // The phrase the candidate must say (not a question — just a communication prompt)
  const DEMO_PHRASE = "My name is [your name], and I am excited to demonstrate my communication skills for this technical interview today."

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const startDemoSequence = () => {
    if (demoState !== "IDLE" && demoState !== "RESULT") return;

    // Reset state
    setDemoScore(null);
    setDemoFeedback("");
    setDemoTranscript("");
    setDemoVolume(0);
    setDemoState("TALKING");

    const instruction = `Please say the following phrase clearly and confidently. Speak at a good volume with clear pronunciation. Here is your phrase: "${DEMO_PHRASE}"`;
    setDemoText(`🎙️ AI Instruction: Say the following phrase aloud:\n\n"${DEMO_PHRASE}"`);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.includes("en-US") || v.lang.includes("en-GB"));
      if (engVoice) utterance.voice = engVoice;
      utterance.onend = () => startRecording();
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => startRecording(), 4000);
    }
  };

  const startRecording = async () => {
    setDemoState("LISTENING");
    setDemoText(`🔴 Recording... Say the phrase now:\n\n"${DEMO_PHRASE}"\n\n(Recording for 8 seconds — speak clearly!)`);

    let capturedTranscript = "";
    let peakVolume = 0;

    // --- Volume meter via Web Audio API ---
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      demoAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const measureVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setDemoVolume(normalized);
        if (normalized > peakVolume) peakVolume = normalized;
        demoAnimFrameRef.current = requestAnimationFrame(measureVolume);
      };
      measureVolume();

      // Stop stream tracks after 8 seconds
      setTimeout(() => {
        if (demoAnimFrameRef.current) cancelAnimationFrame(demoAnimFrameRef.current);
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
      }, 8200);
    } catch (e) {
      console.warn("Volume meter not available:", e);
    }

    // --- Speech Recognition for transcript ---
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        capturedTranscript = (final + interim).trim();
        setDemoTranscript(capturedTranscript);
      };

      rec.onerror = () => {};

      try { rec.start(); } catch (e) {}

      // Record for 8 seconds then auto-evaluate
      setTimeout(() => {
        try { rec.stop(); } catch (e) {}
        setTimeout(() => {
          evaluateTranscript(capturedTranscript, peakVolume);
        }, 600);
      }, 8000);
    } else {
      // No speech recognition — evaluate after 8 seconds with empty transcript
      setTimeout(() => {
        evaluateTranscript("", peakVolume);
      }, 8000);
    }
  };

  const evaluateTranscript = (transcript: string, peakVolume: number) => {
    setDemoState("EVALUATING");
    setDemoText("⏳ Analyzing your communication quality, volume, and pronunciation...");
    setDemoVolume(0);

    setTimeout(() => {
      const clean = transcript.trim().toLowerCase();

      // --- Volume Score (0-10) ---
      // peakVolume is 0-100 from audio analyser
      let volumeScore: number;
      let volumeNote: string;
      if (peakVolume === 0 && !clean) {
        volumeScore = 0;
        volumeNote = "No audio detected.";
      } else if (peakVolume >= 60) {
        volumeScore = 10;
        volumeNote = "Excellent volume level.";
      } else if (peakVolume >= 35) {
        volumeScore = 7;
        volumeNote = "Good volume, slightly soft.";
      } else if (peakVolume >= 15) {
        volumeScore = 4;
        volumeNote = "Low volume. Speak louder.";
      } else {
        volumeScore = 1;
        volumeNote = "Very low or no volume detected.";
      }

      // --- Pronunciation/Communication Score based on key words from the phrase ---
      const keyWords = ["name", "excited", "demonstrate", "communication", "skills", "technical", "interview", "today", "my"];
      let matchCount = 0;
      keyWords.forEach(w => { if (clean.includes(w)) matchCount++; });

      const wordCount = clean.split(/\s+/).filter(Boolean).length;
      const fluencyBonus = wordCount >= 15 ? 2 : wordCount >= 8 ? 1 : 0;

      const pronunciationRatio = matchCount / keyWords.length;
      let pronunciationScore: number;
      let pronunciationNote: string;

      if (!clean) {
        pronunciationScore = 0;
        pronunciationNote = "No speech captured.";
      } else if (pronunciationRatio >= 0.75) {
        pronunciationScore = Math.min(10, 8 + fluencyBonus);
        pronunciationNote = "Clear pronunciation with excellent fluency.";
      } else if (pronunciationRatio >= 0.4) {
        pronunciationScore = 5 + fluencyBonus;
        pronunciationNote = "Moderate pronunciation. Some words unclear.";
      } else if (pronunciationRatio >= 0.1) {
        pronunciationScore = 3;
        pronunciationNote = "Poor pronunciation match. Significant mispronunciation detected.";
      } else {
        pronunciationScore = 1;
        pronunciationNote = "Speech captured but phrase was not clearly spoken.";
      }

      // --- Overall Communication Score (weighted) ---
      const overallScore = !clean
        ? 1.0
        : Number(((volumeScore * 0.4) + (pronunciationScore * 0.6)).toFixed(1));

      let overallFeedback: string;
      let recommendation: string;

      if (overallScore >= 8) {
        overallFeedback = `Outstanding communication! ${volumeNote} ${pronunciationNote} You spoke with confidence and clarity — full marks for this category.`;
        recommendation = "✅ Communication: EXCELLENT";
      } else if (overallScore >= 5.5) {
        overallFeedback = `Good communication. ${volumeNote} ${pronunciationNote} Some improvements in volume or pronunciation would help.`;
        recommendation = "🟡 Communication: GOOD";
      } else if (overallScore >= 3) {
        overallFeedback = `Needs improvement. ${volumeNote} ${pronunciationNote} Work on speaking louder and clearer.`;
        recommendation = "🔴 Communication: NEEDS IMPROVEMENT";
      } else {
        overallFeedback = `Very poor communication. ${volumeNote} ${pronunciationNote} No meaningful speech was detected or extremely low volume.`;
        recommendation = "🚫 Communication: POOR";
      }

      setDemoScore(overallScore);
      setDemoFeedback(overallFeedback);
      setDemoState("RESULT");
      setDemoText(`Communication Score: ${overallScore}/10\n${recommendation}\n\n${overallFeedback}${
        transcript ? `\n\nYour transcript:\n"${transcript}"` : "\n\n(No transcript captured — microphone may not be enabled)"
      }`);

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const spokenFeedback = `Your communication score is ${overallScore} out of 10. ${overallFeedback}`;
        const utterance = new SpeechSynthesisUtterance(spokenFeedback);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }, 1800);
  };

  const faqs = [
    {
      q: "How does the AI Interviewer adapt during the mock or recruiter session?",
      a: "Our AI dialogue engine maps responses in real-time. If you give a strong answer with complex details, the interviewer escalates the depth of follow-up questions. If you struggle, it dynamically pivots to foundational concepts to review your boundaries of knowledge."
    },
    {
      q: "Are the first 3 practice mock interviews for students actually free?",
      a: "Yes! Students can register instantly using their name and email, paste their resumes, select their target positions (Frontend, Backend, etc.), and complete up to 3 comprehensive mock evaluations completely free of charge. No credit card required."
    },
    {
      q: "What coding languages are supported in the compiler sandbox?",
      a: "The built-in code editor supports JavaScript, Python, C++, and Java. It executes test cases locally, tracks memory footprint and execution speed, and feeds code structure logs to the evaluator LLM for Space and Time Complexity scoring."
    },
    {
      q: "How does HireAI handle anti-cheating?",
      a: "We track client-side proctoring telemetry: browser tab switching, copy-pasting, face verification alerts, and microphone telemetry. All events are logged for recruiter audit scorecard reviews."
    }
  ];

  return (
    <div className="bg-transparent text-zinc-100 min-h-screen font-sans overflow-x-hidden relative">
      
      {/* Radiant glow elements */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#FF3300]/5 via-[#FFB200]/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[1200px] right-[-10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating navigation header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050816]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-100 font-[Outfit]">
                HireAI
              </span>
              <span className="text-[9px] block text-[#FF3300] font-extrabold tracking-widest uppercase">
                Enterprise
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <a href="#features" className="premium-glow-link">Features</a>
            <a href="#demo" className="premium-glow-link">Interactive Demo</a>
            <a href="#pricing" className="premium-glow-link">Pricing</a>
            <a href="#faq" className="premium-glow-link">FAQ</a>
          </nav>

          <div className="flex items-center gap-5">
            <Link 
              href="/student" 
              className="text-xs font-bold hover:text-[#FF3300] transition-colors flex items-center gap-1.5 text-zinc-400"
            >
              <GraduationCap className="w-4 h-4 text-[#FF3300]" /> Student Arena
            </Link>
            <Link 
              href="/recruiter" 
              className="px-5 py-2.5 rounded-full btn-vibrant flex items-center gap-1.5 text-xs font-bold"
            >
              Recruiter Hub <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF3300]/20 bg-[#FF3300]/5 text-[10px] font-bold text-[#FF3300] uppercase tracking-widest mb-8 animate-pulse shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Proctored Verbal Interview Pipelines
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl leading-[1.1] mb-8 text-zinc-100 font-[Outfit]">
          Automate Tech Screenings with <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF3300] to-[#FFB200]">
            Adaptive AI Interviewers
          </span>
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed mb-12 font-medium">
          Experience first-round voice dialogues customized to resumes, check algorithms inside the sandbox, and generate structured recruiter scorecards instantly.
        </p>

        {/* Action portals cards */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mt-4">
          
          {/* Recruiters Portal Card */}
          <div className="premium-card p-8 text-left flex flex-col justify-between gap-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FF3300]/10 border border-[#FF3300]/20 flex items-center justify-center text-[#FF3300]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2 font-[Outfit]">Recruiters & HR Hub</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Post positions, dispatch invite links, monitor live proctor camera feeds, and view candidate completion analytics out of 50 marks.
                </p>
              </div>
            </div>
            <Link 
              href="/recruiter" 
              className="w-full py-3.5 bg-gradient-to-r from-[#FF3300] to-[#FFB200] hover:scale-[1.02] text-white font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all"
            >
              Enter Recruiter Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Students Portal Card */}
          <div className="premium-card p-8 text-left flex flex-col justify-between gap-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2 font-[Outfit]">Student Practice Arena</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Upload your PDF resume, practice standard system design, behaviorals, or compiler sandboxes. Review scores directly.
                </p>
              </div>
            </div>
            <Link 
              href="/student" 
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-[1.02]"
            >
              Practice Free Mocks (3 Free) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Marquee Companies banner */}
        <div className="mt-28 w-full max-w-5xl">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest block mb-8">Trusted by technical teams globally</span>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale hover:opacity-80 transition-opacity">
            <span className="font-black text-sm tracking-widest text-zinc-200">STRIPE</span>
            <span className="font-black text-sm tracking-widest text-zinc-200">LINEAR</span>
            <span className="font-black text-sm tracking-widest text-zinc-200">VERCEL</span>
            <span className="font-black text-sm tracking-widest text-zinc-200">OPENAI</span>
            <span className="font-black text-sm tracking-widest text-zinc-200">FIGMA</span>
          </div>
        </div>
      </section>

      {/* Interactive product demo console */}
      <section id="demo" className="py-24 px-6 border-t border-white/10 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black mb-4 text-zinc-100 font-[Outfit]">Communication Check Demo</h2>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium">Say the given phrase clearly and confidently. The AI records your full response and evaluates <strong className="text-zinc-200">volume</strong>, <strong className="text-zinc-200">pronunciation</strong>, and <strong className="text-zinc-200">communication clarity</strong> — assigning marks accordingly.</p>
          </div>

          <div className="premium-card bg-white/5 backdrop-blur-md p-6 relative overflow-hidden flex flex-col gap-6">
            {/* Visual glow overlay */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB200]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF3300]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs font-bold">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#FF3300]" />
                <span className="text-zinc-200">HireAI Communication Check — Interactive Demo</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                <span className={`w-2 h-2 rounded-full ${
                  demoState === "LISTENING" ? "bg-red-500 animate-ping" :
                  demoState === "RESULT" ? "bg-emerald-400" :
                  demoState !== "IDLE" ? "bg-orange-400 animate-pulse" :
                  "bg-gray-500"
                }`} />
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">{demoState}</span>
              </div>
            </div>

            {/* Phrase card */}
            <div className="p-4 rounded-2xl border border-[#FF3300]/20 bg-[#FF3300]/5 text-center">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FF3300] block mb-2">📢 Your Communication Prompt — Say This Phrase:</span>
              <p className="text-sm text-zinc-200 font-semibold italic leading-relaxed">
                &quot;{DEMO_PHRASE}&quot;
              </p>
              <span className="text-[10px] text-zinc-500 mt-2 block">You have 8 seconds to say it clearly. Speak with good volume and correct pronunciation.</span>
            </div>

            {/* Avatar + live status area */}
            <div className="flex flex-col items-center gap-6 text-center z-10 py-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full border border-[#FF3300]/30 ${
                  demoState === "TALKING" ? "animate-ring-pulse-slow" :
                  demoState === "LISTENING" ? "animate-ring-pulse-fast" : "opacity-0"
                }`} />
                <div className={`absolute inset-4 rounded-full border border-[#FFB200]/20 ${
                  demoState === "LISTENING" ? "animate-ring-pulse-slow" : "opacity-0"
                }`} />
                <div className={`w-20 h-20 rounded-full flex items-center justify-center z-10 shadow-2xl transition-all duration-300 ${
                  demoState === "LISTENING" ? "bg-gradient-to-tr from-red-600 to-[#FF3300] shadow-red-500/30 scale-110" :
                  demoState === "RESULT" && demoScore !== null && demoScore >= 7 ? "bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-emerald-500/30" :
                  demoState === "RESULT" ? "bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-500/30" :
                  "bg-gradient-to-tr from-[#FF3300] to-[#FFB200] shadow-orange-500/30"
                }`}>
                  {demoState === "LISTENING" ? <Mic className="w-9 h-9 text-white animate-pulse" /> :
                   demoState === "EVALUATING" ? <Loader2 className="w-8 h-8 text-white animate-spin" /> :
                   demoState === "RESULT" ? <Award className="w-9 h-9 text-white" /> :
                   <Bot className="w-9 h-9 text-white" />}
                </div>
              </div>

              {/* Volume meter — only during LISTENING */}
              {demoState === "LISTENING" && (
                <div className="w-full max-w-xs space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">🎙️ Live Volume Level</span>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${demoVolume}%`,
                        background: demoVolume > 60 ? "linear-gradient(90deg,#16a34a,#4ade80)" :
                          demoVolume > 30 ? "linear-gradient(90deg,#FF3300,#FFB200)" :
                          "linear-gradient(90deg,#ef4444,#f97316)"
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Too soft</span>
                    <span className="font-bold text-zinc-300">{demoVolume}%</span>
                    <span>✅ Excellent</span>
                  </div>
                  {demoTranscript && (
                    <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/10 text-left">
                      <span className="text-[9px] uppercase text-[#FF3300] font-bold block mb-1">Live Transcript</span>
                      <p className="text-xs text-zinc-300 italic">&quot;{demoTranscript}&quot;</p>
                    </div>
                  )}
                </div>
              )}

              {/* Score card — only in RESULT state */}
              {demoState === "RESULT" && demoScore !== null && (
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center justify-center gap-5">
                    <div className="text-center">
                      <div className={`text-5xl font-black ${
                        demoScore >= 7 ? "text-emerald-400" :
                        demoScore >= 5 ? "text-[#FFB200]" : "text-red-400"
                      }`}>{demoScore}</div>
                      <div className="text-[10px] text-zinc-400 mt-1 font-bold">/ 10</div>
                    </div>
                    <div className="text-left max-w-xs">
                      <div className="text-xs font-bold text-zinc-200 mb-1">Communication Score</div>
                      <div className="text-[11px] text-zinc-400 leading-relaxed">{demoFeedback}</div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(demoScore / 10) * 100}%`,
                        background: demoScore >= 7 ? "linear-gradient(90deg,#16a34a,#4ade80)" :
                          demoScore >= 5 ? "linear-gradient(90deg,#FF3300,#FFB200)" :
                          "linear-gradient(90deg,#ef4444,#f97316)"
                      }}
                    />
                  </div>
                  {demoTranscript && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left">
                      <span className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">Captured Speech</span>
                      <p className="text-xs text-zinc-300 italic leading-relaxed">&quot;{demoTranscript}&quot;</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status text — shown when IDLE, TALKING, or EVALUATING */}
              {(demoState === "IDLE" || demoState === "TALKING" || demoState === "EVALUATING") && (
                <div className="max-w-lg bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
                    {demoText}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center border-t border-white/10 pt-5 z-10">
              {(demoState === "IDLE" || demoState === "RESULT") && (
                <button
                  onClick={startDemoSequence}
                  className="px-8 py-3 bg-gradient-to-r from-[#FF3300] to-[#FFB200] hover:scale-105 text-white font-bold text-xs rounded-full shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  {demoState === "RESULT" ? "Try Again" : "Start Communication Check"}
                </button>
              )}
              {(demoState === "TALKING" || demoState === "LISTENING" || demoState === "EVALUATING") && (
                <div className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF3300]" />
                  {demoState === "TALKING" ? "AI is giving your speaking prompt..." :
                   demoState === "LISTENING" ? "🔴 Recording — speak your phrase now! (8 sec)" :
                   "Analyzing communication quality..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black mb-4 text-zinc-100 font-[Outfit]">Modern Proctor Evaluation Features</h2>
            <p className="text-zinc-400 text-sm font-medium">A comprehensive suite engineered for recruiters who prioritize academic integrity and capability.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* feature 1 */}
            <div className="premium-card p-8 flex flex-col gap-5 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-zinc-100 font-[Outfit]">Adaptive Dialogue Engines</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Adaptive follow-up algorithm maps candidate answers. If they show proficiency, it automatically pivots to low-level details.
              </p>
            </div>

            {/* feature 2 */}
            <div className="premium-card p-8 flex flex-col gap-5 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Terminal className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-zinc-100 font-[Outfit]">Blank Signature Editor</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Clean sandbox compiling JavaScript, Python, Java, C++ code templates. Analyzes runtime footprints and syntax execution speed.
              </p>
            </div>

            {/* feature 3 */}
            <div className="premium-card p-8 flex flex-col gap-5 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-zinc-100 font-[Outfit]">Proctor Telemetry Logs</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Tracks screen deviation switches, browser tab changes, copy-pasting triggers, and microphone ambient noise.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 border-t border-white/10 bg-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black mb-4 text-zinc-100 font-[Outfit]">Flexible Pricing Architecture</h2>
          <p className="text-zinc-400 text-sm mb-12 font-medium">Choose a subscription to match your candidate screening volume.</p>

          {/* Toggle monthly/yearly */}
          <div className="flex items-center justify-center gap-3 mb-12 text-sm font-bold text-zinc-400">
            <span>Monthly Billing</span>
            <button 
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="w-12 h-6 rounded-full bg-white/10 relative p-1 transition-colors hover:bg-white/20"
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${billingCycle === "yearly" ? "translate-x-6" : ""}`} />
            </button>
            <span className="text-zinc-100">Yearly <span className="text-[#FF3300]">(Save 20%)</span></span>
          </div>
 
          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left items-stretch">
            
            {/* tier 1 */}
            <div className="premium-card p-8 flex flex-col justify-between gap-8">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block">Student Practice</span>
                <div>
                  <h4 className="text-4xl font-black text-zinc-100">$0</h4>
                  <span className="text-xs text-zinc-400 font-medium">3 mock runs included</span>
                </div>
                <ul className="space-y-4 text-sm text-zinc-400 pt-6 border-t border-white/10 font-medium">
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> Free trials (3 total)</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> All dialogue templates open</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> Executive scorecard reports</li>
                </ul>
              </div>
              <Link href="/student" className="block text-center py-3.5 bg-white/5 backdrop-blur-md border-2 border-white/10 hover:border-[#FF3300] text-zinc-100 hover:text-[#FF3300] font-bold text-sm rounded-full transition-all">Register Sandbox</Link>
            </div>
 
            {/* tier 2 */}
            <div className="premium-card p-8 border-2 border-[#FF3300] flex flex-col justify-between gap-8 relative transform md:-translate-y-4 shadow-[0_20px_50px_rgba(255,51,0,0.1)] !overflow-visible">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-[#FF3300] to-[#FFB200] text-white text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-widest shadow-lg z-20">Startup Focus</div>
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black text-[#FF3300] tracking-widest block">Hiring Agency</span>
                <div>
                  <h4 className="text-4xl font-black text-zinc-100">${billingCycle === "yearly" ? "199" : "249"}</h4>
                  <span className="text-xs text-zinc-400 font-medium"> / billing month</span>
                </div>
                <ul className="space-y-4 text-sm text-zinc-400 pt-6 border-t border-white/10 font-medium">
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> 50 Candidate screens/mo</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> Proctoring camera feeds enabled</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-[#FF3300]" /> Competency line graphs</li>
                </ul>
              </div>
              <Link href="/recruiter" className="block text-center py-3.5 bg-gradient-to-r from-[#FF3300] to-[#FFB200] hover:scale-105 text-white font-bold text-sm rounded-full shadow-lg shadow-orange-500/25 transition-all">Deploy Agency Hub</Link>
            </div>

            {/* tier 3 */}
            <div className="premium-card p-8 flex flex-col justify-between gap-8">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block">Enterprise Group</span>
                <div>
                  <h4 className="text-4xl font-black text-zinc-100">Custom</h4>
                  <span className="text-xs text-zinc-400 font-medium">Flexible billing scale</span>
                </div>
                <ul className="space-y-4 text-sm text-zinc-400 pt-6 border-t border-white/10 font-medium">
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-indigo-500" /> Unlimited screens</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-indigo-500" /> Dedicated SLA support</li>
                  <li className="flex gap-2.5 items-center"><CheckCircle className="w-5 h-5 text-indigo-500" /> ATS integrations & Webhooks</li>
                </ul>
              </div>
              <button className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-full transition-colors">Contact Sales</button>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-5xl font-black text-center mb-12 text-zinc-100 font-[Outfit]">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button 
                onClick={() => toggleFaq(index)}
                className="w-full p-6 text-left text-sm font-bold flex justify-between items-center hover:bg-white/5 text-zinc-200"
              >
                <span>{faq.q}</span>
                {activeFaq === index ? <ChevronUp className="w-5 h-5 text-[#FF3300]" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
              </button>
              {activeFaq === index && (
                <div className="p-6 pt-0 text-zinc-400 text-sm leading-relaxed font-medium">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 text-zinc-400 text-[10px] tracking-wide bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-xs">&copy; {new Date().getFullYear()} HireAI Platform Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-6 uppercase font-bold text-[10px] text-zinc-400">
            <a href="#" className="hover:text-[#FF3300] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#FF3300] transition-colors">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

