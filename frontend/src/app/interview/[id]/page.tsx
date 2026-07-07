"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchSession, CandidateSession } from "../../../lib/api";
import CodeEditor from "../../../components/CodeEditor";
import {
  Mic,
  MicOff,
  Volume2,
  Video,
  Play,
  CheckCircle,
  Clock,
  ShieldAlert,
  Loader2,
  MessageSquare,
  AlertCircle,
  FileText,
  X,
  Award,
  BookOpen,
  Monitor,
  Shield,
  VolumeX
} from "lucide-react";

export default function CandidateInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [phase, setPhase] = useState("INSTRUCTIONS"); // INSTRUCTIONS, SETUP, CONNECT_PROMPT, CONNECTING, RESUME_Q, SYSTEM_DESIGN, BEHAVIORAL, CODING, FINISHED

  // Media & file upload states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // WebSocket / Dialogue state
  const socketRef = useRef<WebSocket | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [scoreFeedback, setScoreFeedback] = useState<any>(null);

  // Subtitles / Live Captions
  const [liveCaption, setLiveCaption] = useState("Awaiting interview start...");
  const [wsLog, setWsLog] = useState<string[]>([]);

  // Proctoring telemetry infraction tracking
  const [cheatingAlert, setCheatingAlert] = useState<string | null>(null);
  const cheatingCountRef = useRef(0);
  const [infractions, setInfractions] = useState(0);

  // Speech Synthesis & Recognition references
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 mins default

  // Practice session scorecard details
  const [practiceReport, setPracticeReport] = useState<any>(null);
  const [practiceReportLoading, setPracticeReportLoading] = useState(false);

  const logWs = (msg: string) => {
    console.log(`WS LOG: ${msg}`);
    setWsLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Fetch session details on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const data = await fetchSession(sessionId);
        setSession(data);
        setTimeRemaining(data.job.duration * 60);
        if (data.status === "COMPLETED" || data.status === "EVALUATED") {
          setPhase("FINISHED");
          if (data.isPractice) {
            loadPracticeReport();
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  // Load practice report scorecard
  const loadPracticeReport = async () => {
    try {
      setPracticeReportLoading(true);
      const API_BASE_URL = "http://localhost:8000/api";
      const res = await fetch(`${API_BASE_URL}/session/${sessionId}/report`);
      if (res.ok) {
        const data = await res.json();
        setPracticeReport(data);
      }
    } catch (err) {
      console.error("Error loading mock scorecard:", err);
    } finally {
      setPracticeReportLoading(false);
    }
  };

  // Setup Web Camera video stream
  const startCamera = async () => {
    if (streamRef.current) return; // Camera already running
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Could not access camera device.", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraStream(null);
    }
  };

  useEffect(() => {
    const activeCameraPhases = ["SETUP", "CONNECT_PROMPT", "CONNECTING", "RESUME_Q", "SYSTEM_DESIGN", "BEHAVIORAL", "CODING"];
    if (activeCameraPhases.includes(phase)) {
      startCamera();
    } else if (phase === "FINISHED") {
      stopCamera();
    }
    return () => {};
  }, [phase]);

  // Setup Camera Access
  const handleEnterSetup = async () => {
    // 1. Explicitly Request Permissions
    try {
      logWs("Requesting media permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      logWs("Media permissions granted successfully.");
      setMicTested(true);
      setSpeakerTested(true);
      
      // Request Fullscreen immediately upon user click
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (err) {
      logWs("Permissions denied or microphone/camera not found.");
      alert("⚠️ CAMERA & MICROPHONE ACCESS REQUIRED:\nYou must grant permissions to camera and microphone devices to proceed with this proctored technical interview.");
      return;
    }

    setPhase("SETUP");
  };

  // Re-request Full Screen when starting the interview loop
  const handleStartInterviewLoop = async () => {
    try {
      logWs("Ensuring Full Screen Mode is active...");
      const docEl = document.documentElement as any;
      const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
      if (requestFS && !document.fullscreenElement) {
        await requestFS.call(docEl);
        logWs("Full screen mode verified.");
      }
    } catch (err) {
      logWs("Fullscreen enforcement blocked by browser security.");
    }
    setPhase("CONNECTING");
  };

  // File PDF Uploader state handler
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

  // Resume pdf submit trigger
  const handleParseResume = async () => {
    if (!pdfFile || !pdfBase64) {
      alert("Please upload your PDF resume to continue.");
      return;
    }
    try {
      setIsParsingResume(true);
      const API_BASE_URL = "http://localhost:8000/api";
      const res = await fetch(`${API_BASE_URL}/session/${sessionId}/resume-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: pdfFile.name,
          fileData: pdfBase64
        })
      });

      if (!res.ok) {
        throw new Error("Failed to parse and upload PDF resume");
      }

      setMicTested(true);
      setSpeakerTested(true);
      setPhase("CONNECT_PROMPT");
    } catch (err: any) {
      alert("Failed to parse PDF: " + err.message);
    } finally {
      setIsParsingResume(false);
    }
  };

  // WebSocket hook - Manages session upgrades safely
  useEffect(() => {
    if (!sessionId) return;
    if (socketRef.current) return;

    logWs("Initializing WebSocket connection...");
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = `ws://${host}:8000/interview-ws?sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    const startSession = () => {
      logWs("ws.onopen: Connected! Checking if starting interview...");
      if (phaseRef.current === "CONNECTING") {
        logWs("Sending start_interview payload (open event)...");
        ws.send(JSON.stringify({ type: "start_interview" }));
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      startSession();
    } else {
      ws.onopen = startSession;
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      logWs(`ws.onmessage: Received message type "${msg.type}"`);

      switch (msg.type) {
        case "question":
          setAiQuestion(msg.text);
          setLiveCaption(msg.text);
          resetSpeechSilenceCountdown();
          if (msg.phase !== "CODING" && phaseRef.current !== "CODING") {
            speakText(msg.text);
          }
          break;

        case "phase_change":
          setPhase(msg.phase);
          break;

        case "evaluating_start":
          setIsEvaluating(true);
          break;

        case "evaluating_done":
          setIsEvaluating(false);
          setScoreFeedback(msg.score);
          break;

        case "interview_ended":
          setPhase("FINISHED");
          stopCamera();
          if (sessionRef.current?.isPractice) {
            loadPracticeReport();
          }
          break;

        case "error":
          alert("Error: " + msg.message);
          break;
      }
    };

    ws.onerror = (err) => {
      logWs("ws.onerror: WebSocket error event occurred");
    };

    ws.onclose = (ev) => {
      logWs(`ws.onclose: Connection closed. Code: ${ev.code}, Reason: ${ev.reason}`);
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [sessionId]);

  // Phase transition hook to send start_interview signal when phase becomes CONNECTING
  useEffect(() => {
    if (phase === "CONNECTING") {
      logWs(`Phase updated to CONNECTING. Checking socket state...`);
      if (socketRef.current) {
        logWs(`Socket state: ${socketRef.current.readyState}`);
        if (socketRef.current.readyState === WebSocket.OPEN) {
          logWs("Sending start_interview payload (phase trigger)...");
          socketRef.current.send(JSON.stringify({ type: "start_interview" }));
        } else {
          logWs("Socket is not open yet. start_interview will be handled in ws.onopen.");
        }
      } else {
        logWs("Error: socketRef.current is null during CONNECTING transition.");
      }
    }
  }, [phase]);

  // Web Speech API - Text to Speech (Premium Voice Synthesis)
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/```[\s\S]*?```/g, "[Coding task displayed in editor]");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.includes("en-US") || v.lang.includes("en-GB"));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      utterance.onend = () => {
        logWs("AI finished speaking. Starting 5-second silence verification...");
        startSilenceTimer();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Silence Timer logic - 5 seconds of inactivity auto-skips question
  const startSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    silenceTimerRef.current = setTimeout(() => {
      logWs("Silence timeout elapsed! Transitioning automatically to next question.");
      
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("We are further moving to next question.");
        utterance.rate = 1.0;
        
        utterance.onend = () => {
          handleSubmitTimeoutAnswer();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        handleSubmitTimeoutAnswer();
      }
    }, 5000); // 5 seconds
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      logWs("Silence timer reset (candidate interaction).");
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const triggerSpeechSilenceCountdown = (currentAnswerText: string) => {
    if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
    if (!currentAnswerText.trim()) return;

    logWs("Candidate speaking detected. Starting 3-second auto-submit silence timer...");
    speechSilenceTimerRef.current = setTimeout(() => {
      logWs("3 seconds of silence after speech detected! Auto-submitting candidate answer...");
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        setLiveCaption(currentAnswerText);
        socketRef.current.send(
          JSON.stringify({
            type: "submit_answer",
            text: currentAnswerText,
            durationMs: 4000,
          })
        );
        setTypedAnswer("");
        if (speechSilenceTimerRef.current) {
          clearTimeout(speechSilenceTimerRef.current);
          speechSilenceTimerRef.current = null;
        }
      }
    }, 3000); // 3 seconds
  };

  const resetSpeechSilenceCountdown = () => {
    if (speechSilenceTimerRef.current) {
      logWs("Speech silence countdown reset.");
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
  };

  const handleSubmitTimeoutAnswer = () => {
    resetSilenceTimer();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setLiveCaption("[No Response - Skipped due to inactivity]");
      socketRef.current.send(
        JSON.stringify({
          type: "submit_answer",
          text: "[No Response - Skipped due to inactivity]",
          durationMs: 5000,
        })
      );
      setTypedAnswer("");
    }
  };

  // Continuous Mic Loop and External Voice Detection
  useEffect(() => {
    const activeProctorPhases = ["RESUME_Q", "SYSTEM_DESIGN", "BEHAVIORAL", "CODING"];
    if (!activeProctorPhases.includes(phase)) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    logWs("Starting continuous background speech recognition...");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logWs("Warning: WebSpeech SpeechRecognition not supported by browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      logWs("Continuous mic listener is active.");
      setMicActive(true);
    };

    rec.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      logWs(`Continuous transcribed text: "${transcript}"`);

      resetSilenceTimer();

      if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
        logWs("Warning: Background conversation/voice detected while interviewer is speaking.");
        logCheatingEvent("BACKGROUND_VOICE", `Speech detected during AI speaking cycle: "${transcript}"`);
        setCheatingAlert("Warning: External voice detected. Please keep the environment silent.");
        setTimeout(() => setCheatingAlert(null), 5000);
      }

      if (phaseRef.current !== "CODING") {
        setTypedAnswer((prev) => {
          const nextAnswer = prev ? `${prev} ${transcript}` : transcript;
          setLiveCaption(nextAnswer);
          triggerSpeechSilenceCountdown(nextAnswer);
          return nextAnswer;
        });
      }
    };

    rec.onerror = (err: any) => {
      console.warn("Speech Recognition info:", err?.error || err);
      if (activeProctorPhases.includes(phaseRef.current)) {
        setTimeout(() => {
          try { rec.start(); } catch (e) {}
        }, 1000);
      }
    };

    rec.onend = () => {
      logWs("Continuous SpeechRecognition loop closed.");
      setMicActive(false);
      if (activeProctorPhases.includes(phaseRef.current)) {
        logWs("Auto-restarting background SpeechRecognition...");
        setTimeout(() => {
          try { rec.start(); } catch (e) {}
        }, 1000);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.warn("Could not start continuous speech recognition:", e);
    }

    return () => {
      if (rec) rec.stop();
    };
  }, [phase]);

  // Submit response verbally/typed
  const handleSubmitAnswer = () => {
    resetSilenceTimer();
    resetSpeechSilenceCountdown();
    if (!typedAnswer.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setLiveCaption(typedAnswer);
      socketRef.current.send(
        JSON.stringify({
          type: "submit_answer",
          text: typedAnswer,
          durationMs: 4000,
        })
      );
      setTypedAnswer("");
    }
  };

  // Submit code to backend
  const handleCodeSubmission = (code: string, language: string) => {
    resetSilenceTimer();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setLiveCaption(`[System]: Code submitted for evaluation (${language})`);
      socketRef.current.send(
        JSON.stringify({
          type: "submit_code",
          code,
          language,
        })
      );
    }
  };

  // Terminate/End assessment early
  const handleEarlyEndInterview = () => {
    if (!confirm("Are you sure you want to end and submit the interview early? Your answers submitted so far will be evaluated immediately.")) return;
    resetSilenceTimer();
    resetSpeechSilenceCountdown();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      logWs("Dispatching early end interview request...");
      socketRef.current.send(
        JSON.stringify({
          type: "end_interview"
        })
      );
    }
  };

  // Telemetry logger helper
  const logCheatingEvent = (type: string, description: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "cheating_event",
          eventType: type,
          description,
        })
      );
    }
  };

  // Proctoring Rule: Double-Strike Plagiarism (Tab Switching & Fullscreen Exit)
  const triggerCheatingInfraction = (description: string) => {
    const nextCount = cheatingCountRef.current + 1;
    cheatingCountRef.current = nextCount;
    setInfractions(nextCount);

    logWs(`Anti-Cheating Event: Infraction #${nextCount} - ${description}`);
    logCheatingEvent("TAB_DEVIATION", description);

    if (nextCount === 1) {
      setCheatingAlert("WARNING: Screen/Tab deviation detected. Exiting again will flag your session for Plagiarism!");
      setTimeout(() => setCheatingAlert(null), 7000);
      alert("⚠️ WARNING: You must stay in full screen and focus on the interview. Doing this again will result in an automatic REJECT Plagiarism flag on your scorecard!");
    } else if (nextCount >= 2) {
      setCheatingAlert("🚨 PLAGIARISM DETECTED: This session has been flagged for plagiarism!");
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "flag_plagiarism" }));
      }
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatingInfraction("User minimized browser or switched tabs.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerCheatingInfraction("User exited full screen mode.");
      }
    };

    const handleCopy = () => {
      logCheatingEvent("COPY_PASTE", "Attempted to copy content.");
    };

    const handlePaste = () => {
      triggerCheatingInfraction("Attempted to paste outside text.");
    };

    const activeProctorPhases = ["RESUME_Q", "SYSTEM_DESIGN", "BEHAVIORAL", "CODING"];
    if (activeProctorPhases.includes(phase)) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("copy", handleCopy);
      document.addEventListener("paste", handlePaste);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [phase]);

  // Countdown clock timer
  useEffect(() => {
    const activeClockPhases = ["RESUME_Q", "SYSTEM_DESIGN", "BEHAVIORAL", "CODING"];
    if (!activeClockPhases.includes(phase)) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (socketRef.current) {
            socketRef.current.close();
          }
          setPhase("FINISHED");
          if (sessionRef.current?.isPractice) {
            loadPracticeReport();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="bg-transparent min-h-screen text-zinc-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-550 text-sm">Validating Assessment Token...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-transparent min-h-screen text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Invalid Interview Token</h2>
        <p className="text-zinc-400 text-sm max-w-md">This invite link has expired or is invalid. Student practice sessions can be created via the Student Portal.</p>
        <Link href="/student" className="mt-6 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 border border-white/10 rounded-xl hover:bg-zinc-800 text-xs font-semibold">
          Go to Student Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-transparent text-zinc-100 min-h-screen font-sans flex flex-col relative select-none">
      <div className="noise-overlay" />

      {/* Dynamic glow decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF3300]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-white/10 bg-transparent/95 px-6 h-16 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF3300] to-[#FFB200] flex items-center justify-center shadow-md">
            <Volume2 className="w-4 h-4 text-zinc-100" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 leading-none">
              {session.candidate.name}
              {session.isPractice && (
                <span className="text-[8px] bg-orange-50 text-[#FF3300] px-1.5 py-0.5 rounded border border-orange-500/20 font-bold uppercase">Mock Practice</span>
              )}
              {infractions >= 2 && (
                <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold uppercase flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> Plagiarism Flag</span>
              )}
            </h2>
            <span className="text-[10px] text-zinc-400 block mt-1 font-semibold">{session.job.title}</span>
          </div>
        </div>

        {/* HUD stats */}
        {phase !== "INSTRUCTIONS" && phase !== "SETUP" && phase !== "CONNECT_PROMPT" && phase !== "FINISHED" && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-50 text-[10px] font-bold text-[#FF3300] uppercase tracking-widest">
              {phase === "RESUME_Q" && "Round 1: Welcome & Resume"}
              {phase === "SYSTEM_DESIGN" && "Round 2: System Architecture"}
              {phase === "BEHAVIORAL" && "Round 3: Behavioral STAR"}
              {phase === "CODING" && "Round 4: Code Sandbox (Final)"}
            </div>
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
              <Clock className="w-4 h-4 text-zinc-400" />
              Time Left: <span className="text-white font-bold">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        )}
      </header>

      {/* Proctor alert */}
      {cheatingAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border border-red-300 bg-red-50/90 text-xs text-red-300 font-bold rounded-xl flex items-center gap-2 shadow-lg animate-bounce">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          {cheatingAlert} Telemetry logged.
        </div>
      )}

      {/* STAGE 1: Welcome Guidelines */}
      {phase === "INSTRUCTIONS" && (
        <div className="flex-1 max-w-2xl mx-auto px-6 py-12 flex flex-col justify-center gap-8 z-10">
          <div>
            <span className="text-[9px] text-[#FF3300] font-extrabold uppercase tracking-widest block mb-1">Assessment Session Initiated</span>
            <h1 className="text-3xl font-extrabold text-zinc-100 leading-tight">Welcome to HireAI Technical Interview</h1>
            <p className="text-zinc-400 text-xs mt-3 leading-relaxed">
              This technical interview is conducted by an adaptive AI. You will verify your hardware configuration, complete resume-tailored dialogue checkups, write code solutions inside the compiler panel, and review system tradeoffs.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md space-y-4">
            <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Shield className="w-4 h-4 text-[#FF3300]" /> Proctor Rules & Consent:</h3>
            <ul className="space-y-3.5 text-xs text-zinc-400">
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="w-4 h-4 text-[#FF3300] shrink-0 mt-0.5" />
                <span>You MUST grant Camera and Microphone access. Proctoring feeds are active.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="w-4 h-4 text-[#FF3300] shrink-0 mt-0.5" />
                <span>Entering setup will lock the browser into **Fullscreen Mode**.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle className="w-4 h-4 text-[#FF3300] shrink-0 mt-0.5" />
                <span>**Double-Strike Policy**: Exiting fullscreen or minimizing tabs twice will immediately flag your session for Plagiarism.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleEnterSetup}
            className="w-full py-4 bg-gradient-to-r from-[#FF3300] to-[#FFB200] hover:scale-105 transition-transform text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1"
          >
            Grant Permissions & Enter Fullscreen
          </button>
        </div>
      )}

      {/* STAGE 2: Camera Setup & Resume Upload */}
      {phase === "SETUP" && (
        <div className="flex-1 max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8 items-center z-10">
          <div className="space-y-6">
            <div>
              <span className="text-xs text-[#FF3300] font-bold block">Pre-Assessment Setup</span>
              <h2 className="text-2xl font-black">Hardware Configurations</h2>
              <p className="text-xs text-zinc-400 mt-1">Submit your profile resume PDF and verify mic inputs before starting.</p>
            </div>

            {/* Resume PDF Upload box */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-3">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FF3300]" /> Upload Candidate Resume (PDF Format)
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                  id="pdf-upload-input"
                />
                <label
                  htmlFor="pdf-upload-input"
                  className="w-full p-6 border border-dashed border-white/10 hover:border-indigo-500/50 bg-transparent hover:bg-white/5 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 text-xs transition-all"
                >
                  <FileText className="w-8 h-8 text-zinc-400" />
                  {pdfFile ? (
                    <span className="text-emerald-600 font-bold">{pdfFile.name} ({(pdfFile.size/1024).toFixed(1)} KB)</span>
                  ) : (
                    <span className="text-zinc-400">Click to browse or drag PDF resume here</span>
                  )}
                </label>
              </div>
            </div>

            {/* Device testers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5/40 text-center flex flex-col items-center gap-2">
                <Mic className="w-5 h-5 text-[#FF3300]" />
                <span className="text-[9px] text-zinc-400 uppercase">Microphone</span>
                <span className="text-[10px] font-bold">{micTested ? "Verified" : "Permission pending"}</span>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5/40 text-center flex flex-col items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#FF3300]" />
                <span className="text-[9px] text-zinc-400 uppercase">Speakers</span>
                <span className="text-[10px] font-bold">{speakerTested ? "Verified" : "Permission pending"}</span>
              </div>
            </div>

            <button
              onClick={handleParseResume}
              disabled={isParsingResume}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs shadow-md"
            >
              {isParsingResume ? (
                <span className="flex items-center justify-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" /> Parsing Resume via ATS LLM...
                </span>
              ) : (
                "Save Profile & Verify Connection"
              )}
            </button>
          </div>

          {/* Video preview proctor HUD */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proctor Cam Feed Preview</span>
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 bg-black flex items-center justify-center">
              <div className="absolute inset-0 bg-proctor-scanlines pointer-events-none z-10 opacity-30" />
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              <Video className="w-8 h-8 text-zinc-100 absolute" />
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: WebSockets initiate confirmation */}
      {phase === "CONNECT_PROMPT" && (
        <div className="flex-1 max-w-md mx-auto px-6 py-12 flex flex-col justify-center text-center gap-6 z-10">
          <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-orange-500/20 mx-auto flex items-center justify-center text-[#FF3300]">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">Hardware and Resume Connected</h2>
            <p className="text-xs text-zinc-400 mt-2">All checks completed. Launch WebSocket stream to start technical dialogue rounds.</p>
          </div>
          <button
            onClick={handleStartInterviewLoop}
            className="w-full py-4 bg-gradient-to-r from-[#FF3300] to-[#FFB200] hover:scale-105 transition-transform font-bold rounded-xl text-xs"
          >
            Start Adaptive Interview Loop
          </button>
        </div>
      )}

      {/* CONNECTING LOADER STAGE */}
      {phase === "CONNECTING" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 px-6 max-w-lg mx-auto text-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-400 text-xs font-semibold">Opening speech pipelines & WebSocket streams...</p>
          </div>
          
          <div className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-zinc-400 space-y-1 shadow-lg max-h-[220px] overflow-y-auto">
            <div className="font-extrabold text-zinc-400 border-b border-white/10 pb-1.5 mb-1.5 flex justify-between">
              <span>Client WS Debug HUD</span>
              <span className="text-[9px] uppercase text-[#FF3300]">Diag Stream</span>
            </div>
            {wsLog.length === 0 ? (
              <div className="italic text-zinc-300">Connecting to socket node...</div>
            ) : (
              wsLog.map((log, i) => <div key={i} className="leading-relaxed hover:text-zinc-300">{log}</div>)
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: Adaptive dialogue workspace console */}
      {(phase === "RESUME_Q" || phase === "SYSTEM_DESIGN" || phase === "BEHAVIORAL" || phase === "CODING") && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-10 relative">
          
          {/* Permanent submit early button inside the active workspace screen */}
          <button
            onClick={handleEarlyEndInterview}
            className="fixed bottom-6 right-6 px-4 py-2.5 bg-white/5 backdrop-blur-md hover:bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 z-50 transition-all hover:scale-105"
          >
            <ShieldAlert className="w-4 h-4 text-red-500" /> End Assessment Early
          </button>

          {/* Hidden video element for proctoring */}
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />

          {/* Main screen workspace */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center gap-6 text-center">
            
            {phase === "CODING" ? (
              <div className="flex-1 flex flex-col gap-5 w-full">
                <div className="p-4 rounded-xl border border-indigo-500/15 bg-orange-50/10 text-xs text-left">
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-indigo-450 block mb-1">Coding Challenge Task</span>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{aiQuestion}</p>
                </div>
                <div className="flex-1 min-h-[500px]">
                  <CodeEditor
                    initialCode=""
                    onCodeSubmitted={handleCodeSubmission}
                    isEvaluating={isEvaluating}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-12 w-full max-w-2xl mx-auto h-full min-h-[60vh]">
                
                {/* Large Mic Symbol (Gradient) */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  {micActive && (
                    <>
                      <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ring-pulse-slow" />
                      <div className="absolute inset-3 rounded-full border border-violet-500/20 animate-ring-pulse-fast" />
                    </>
                  )}
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center z-10 shadow-2xl transition-all duration-300 ${micActive ? 'bg-gradient-to-tr from-[#FF3300] to-[#FFB200] shadow-[#FF3300]/20 scale-110' : 'bg-zinc-800/80 scale-100'}`}>
                    {micActive ? <Mic className="w-12 h-12 text-zinc-100 animate-pulse" /> : <MicOff className="w-12 h-12 text-zinc-400" />}
                  </div>
                </div>

                {/* Live Captions */}
                <div className="w-full">
                  <p className="text-xl md:text-2xl text-zinc-100 font-medium italic leading-relaxed tracking-wide min-h-[4rem] transition-all duration-300">
                    "{liveCaption}"
                  </p>
                </div>

                {/* Submit Response Option */}
                <div className="flex flex-col items-center gap-3 mt-4">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating || !typedAnswer.trim()}
                    className="px-8 py-3.5 bg-white/5 backdrop-blur-md hover:bg-zinc-200 text-black rounded-full font-bold text-sm shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Submit Response
                  </button>
                  {isEvaluating && (
                    <div className="text-xs text-[#FF3300] font-bold flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Evaluating answer...
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 5: Complete practice report card */}
      {phase === "FINISHED" && (
        <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8 z-10">
          <div className="text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-955/60 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black">Assessment Completed</h2>
            <p className="text-xs text-zinc-400 mt-2">
              {session.isPractice
                ? "Your mock practice has been graded. Review your evaluation feedback scorecard below to address gaps."
                : "Thank you! Your interview evaluation scores and transcripts have been successfully logged."}
            </p>
          </div>

          {session.isPractice && (
            <div className="space-y-6">
              {practiceReportLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border border-white/10 rounded-3xl bg-white/5">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-zinc-650 text-xs italic">Compiling practice scorecard report...</span>
                </div>
              ) : practiceReport && practiceReport.report ? (
                <div className="grid md:grid-cols-3 gap-6">
                  
                  <div className="p-6 rounded-2xl bg-[#090910] border border-white/10 flex flex-col justify-between gap-6">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Final Score</span>
                      <div className="text-5xl font-black text-[#FF3300]">{practiceReport.report.overallScore}</div>
                      <span className="text-[10px] text-zinc-400 block mt-1">Grade out of 50 total</span>
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Mock Recommendation</span>
                      <div className={`text-lg font-black ${practiceReport.report.hiringRecommendation.includes("REJECT") ? "text-red-600" : "text-emerald-600"}`}>
                        {practiceReport.report.hiringRecommendation.replace("_", " ")}
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-1">Confidence: {practiceReport.report.recommendationConfidence}%</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-400">Technical Score</span>
                        <span>{practiceReport.report.technicalScore}/10</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-400">Coding Score</span>
                        <span>{practiceReport.report.codingScore}/10</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-400">Communication</span>
                        <span>{practiceReport.report.communicationScore}/10</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 p-6 rounded-2xl bg-[#090910]/40 border border-white/10 space-y-6">
                    <div>
                      <h4 className="font-bold text-xs text-emerald-600 uppercase tracking-widest mb-1.5">Strengths</h4>
                      <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{practiceReport.report.strengths}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-red-600 uppercase tracking-widest mb-1.5">Weaknesses</h4>
                      <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{practiceReport.report.weaknesses}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-amber-400 uppercase tracking-widest mb-1.5">Knowledge Gaps</h4>
                      <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{practiceReport.report.knowledgeGaps}</p>
                    </div>
                    {practiceReport.report.recommendedLearning && (
                      <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-50/15">
                        <h4 className="font-bold text-xs text-[#FF3300] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <BookOpen className="w-4 h-4" /> Recommended Learning Path
                        </h4>
                        <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{practiceReport.report.recommendedLearning}</p>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-8 border border-white/10 rounded-3xl bg-white/5/40 text-center text-zinc-400 text-xs italic">
                  Grading completed. Return to Student portal history to view the mock practice scorecard.
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 justify-center max-w-sm mx-auto w-full">
            <Link
              href={session.isPractice ? "/student" : "/"}
              className="w-full py-3 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-zinc-800 border border-white/10 text-white font-bold rounded-xl text-xs text-center transition-all z-10"
            >
              {session.isPractice ? "Return to Student Portal" : "Go to Homepage"}
            </Link>
          </div>

        </div>
      )}

    </div>
  );
}
