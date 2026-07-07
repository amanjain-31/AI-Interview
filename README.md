# 🤖 HireAI — Adaptive AI Technical Interview Platform

<div align="center">

![HireAI Banner](https://img.shields.io/badge/HireAI-Enterprise-FF3300?style=for-the-badge&logo=robot&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)

**A full-stack AI-powered technical screening platform with adaptive voice dialogues, proctoring, live coding sandbox, and auto-generated scorecards.**

[🚀 Live Demo](#) · [📚 Docs](#architecture) · [🐛 Report Bug](https://github.com/amanjain-31/AI-Interview/issues)

</div>

---

## ✨ What is HireAI?

HireAI automates first-round technical interviews using an adaptive AI interviewer that:

- 🎙️ **Conducts voice-based interviews** — asks questions via Text-to-Speech and listens using Web Speech Recognition
- 🧠 **Adapts in real-time** — escalates question difficulty if the candidate answers well, simplifies if they struggle
- 🖥️ **Runs a live code sandbox** — candidates write and submit JavaScript, Python, Java, or C++ code
- 🔒 **Proctors the session** — tracks tab switches, fullscreen exits, copy-paste attempts, and background voices
- 📊 **Auto-generates scorecards** — produces a detailed out-of-50 evaluation report with AI feedback
- 🎤 **Evaluates communication** — scores pronunciation, volume, and fluency directly

---

## 🖼️ Screenshots

| Landing Page | Interview Workspace | Scorecard |
|---|---|---|
| Dark theme hero with animated glow | Mic pulse + live captions | Out of 50 score breakdown |

---

## 🏗️ Architecture

```
AI Interview/
├── frontend/                  # Next.js 15 App Router (React + TailwindCSS v4)
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Landing page + Interactive Demo
│       │   ├── layout.tsx            # Root layout with cursor glow
│       │   ├── globals.css           # Design system & animations
│       │   ├── interview/[id]/       # Candidate interview workspace
│       │   ├── student/              # Student practice portal
│       │   └── recruiter/            # Recruiter dashboard
│       ├── components/
│       │   ├── CodeEditor.tsx        # Monaco-style code editor
│       │   └── CursorGlowBackground.tsx
│       └── lib/
│           └── api.ts                # API client helpers
│
├── backend/                   # Node.js + Express + WebSocket server
│   ├── prisma/
│   │   └── schema.prisma             # SQLite database schema
│   └── src/
│       ├── server.ts                 # Express + HTTP server
│       ├── services/
│       │   ├── ai.service.ts         # Gemini / OpenAI / Mock LLM
│       │   └── db.ts                 # Prisma client singleton
│       └── websocket/
│           └── interview.socket.ts   # Real-time interview engine
│
└── package.json               # Root workspace scripts
```

---

## ⚡ Features

### 👩‍💼 For Recruiters
- Create job postings with title, description, difficulty, and interview type
- Auto-generate shareable candidate invite links
- View live proctor camera feeds during interviews
- Access structured scorecards with hiring recommendations (`STRONG_YES` / `YES` / `MAYBE` / `NO`)
- Anti-cheating telemetry logs with infraction details

### 🎓 For Students / Candidates
- 3 **free** mock practice sessions
- Upload PDF resume — ATS parser extracts skills, experience, and projects
- Adaptive 4-phase interview: Resume → System Design → Behavioral → Coding
- Live mic pulse animation with real-time speech captions
- Detailed scorecard with strengths, weaknesses, and a personalized learning path

### 🤖 AI Interview Engine
| Phase | Description |
|---|---|
| **RESUME_Q** | Personalized questions based on parsed resume |
| **SYSTEM_DESIGN** | Scalability & architecture discussion |
| **BEHAVIORAL** | STAR-format situational questions |
| **CODING** | Live code challenge with test case runner |

### 🛡️ Proctoring System
- Fullscreen enforcement — exits are logged as infractions
- Tab / window switching detection
- Copy-paste blocking with telemetry logging
- Background voice detection during AI speaking cycle
- **Double-strike policy** — 2nd infraction auto-flags session for plagiarism

### 🎤 Interactive Communication Check (Landing Demo)
- AI gives the candidate a phrase to speak — **no questions asked**
- Records full 8-second audio clip
- Real-time **volume meter** via Web Audio API
- Live **speech transcript** via continuous SpeechRecognition
- Scores **volume (40%)** + **pronunciation/fluency (60%)** separately
- Color-coded result card with "Try Again" option

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- A **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com)) or **OpenAI API key**

### 1. Clone the Repository

```bash
git clone https://github.com/amanjain-31/AI-Interview.git
cd AI-Interview
```

### 2. Install All Dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# backend/.env

# Gemini (recommended — free tier available)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# OR use OpenAI
# OPENAI_API_KEY=your_openai_key_here
# OPENAI_MODEL=gpt-4o-mini
```

> ⚠️ **No API key?** The platform runs in **mock mode** automatically — all AI responses are simulated locally. You can test the full flow without any API key.

### 4. Set Up the Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 5. Run the Development Servers

Open **two terminals**:

**Terminal 1 — Backend (port 8000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd frontend
npm run dev
```

Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 API Reference

### REST Endpoints (Express)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/session/:id` | Fetch interview session details |
| `POST` | `/api/session/:id/resume-pdf` | Upload and parse candidate PDF resume |
| `GET` | `/api/session/:id/report` | Fetch final scorecard report |
| `GET` | `/api/jobs` | List all job postings |
| `POST` | `/api/jobs` | Create a new job posting |
| `POST` | `/api/jobs/:id/invite` | Generate candidate invite link |
| `GET` | `/api/recruiter/sessions` | List all candidate sessions for recruiter |

### WebSocket Protocol (`ws://localhost:8000/interview-ws?sessionId=<id>`)

**Client → Server:**

| Message Type | Payload | Description |
|---|---|---|
| `start_interview` | — | Begin the interview loop |
| `submit_answer` | `{ text, durationMs }` | Submit a verbal/typed answer |
| `submit_code` | `{ code, language }` | Submit code solution |
| `end_interview` | — | End interview early |
| `cheating_event` | `{ eventType, description }` | Log a proctoring infraction |
| `flag_plagiarism` | — | Mark session as plagiarised |

**Server → Client:**

| Message Type | Payload | Description |
|---|---|---|
| `phase_change` | `{ phase }` | Interview round transitioned |
| `question` | `{ text, phase }` | New question from AI interviewer |
| `evaluating_start` | — | AI is scoring the answer |
| `evaluating_done` | `{ score }` | Score object returned |
| `interview_ended` | `{ reportId }` | Session completed |
| `error` | `{ message }` | Server error |

---

## 🗄️ Database Schema (Prisma / SQLite)

```prisma
model Job               # Job postings by recruiters
model Candidate         # Candidate profiles
model ResumeData        # Parsed resume details (skills, experience, etc.)
model InterviewSession  # Active/completed interview sessions
model Question          # AI-generated questions per phase
model Answer            # Candidate responses
model Score             # Per-answer rubric scores (5 dimensions × 10)
model Report            # Final scorecard with hiring recommendation
model CheatingEvent     # Proctoring infraction log
```

---

## 🤖 AI Scoring Rubric

Each answer is scored across **5 dimensions (0–10 each)**:

| Dimension | Weight | Description |
|---|---|---|
| Technical Accuracy | 10 | Correctness of the answer |
| Depth of Knowledge | 10 | Complexity and nuance demonstrated |
| Problem Solving | 10 | Structured thinking and approach |
| Communication Clarity | 10 | Articulation of thoughts |
| Confidence | 10 | Certainty and security of explanation |

**Total possible score: 50 points**

| Score Range | Recommendation |
|---|---|
| 40–50 | `STRONG_YES` |
| 30–39 | `YES` |
| 18–29 | `MAYBE` |
| 0–17 | `NO` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React, TypeScript |
| **Styling** | TailwindCSS v4, Custom CSS animations |
| **Voice** | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| **Audio** | Web Audio API (AnalyserNode for volume metering) |
| **Backend** | Node.js, Express, TypeScript |
| **Real-time** | WebSocket (`ws` library) |
| **ORM** | Prisma |
| **Database** | SQLite (dev) — swap to PostgreSQL for production |
| **AI/LLM** | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini / Local Mock |
| **Icons** | Lucide React |

---

## 🔄 Interview Flow Diagram

```
Candidate opens invite link
         │
         ▼
  [INSTRUCTIONS] → Grant camera + mic permissions → Enter fullscreen
         │
         ▼
  [SETUP] → Upload PDF resume → ATS parser extracts profile
         │
         ▼
  [CONNECT_PROMPT] → Start WebSocket stream
         │
         ▼
  [RESUME_Q] → 2 questions → adaptive follow-up
         │
         ▼
  [SYSTEM_DESIGN] → 1 question
         │
         ▼
  [BEHAVIORAL] → 1 question (STAR format)
         │
         ▼
  [CODING] → Code challenge → test case runner
         │
         ▼
  [FINISHED] → AI generates report → Scorecard displayed
```

---

## 📁 Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `GEMINI_API_KEY` | `backend/.env` | Google Gemini API key |
| `GEMINI_MODEL` | `backend/.env` | Model name (default: `gemini-1.5-flash`) |
| `OPENAI_API_KEY` | `backend/.env` | OpenAI API key (alternative) |
| `OPENAI_MODEL` | `backend/.env` | OpenAI model (default: `gpt-4o-mini`) |

---

## 🚀 Production Deployment

For production, swap SQLite for PostgreSQL in `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

And update `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/hireai
```

Build the frontend:
```bash
cd frontend && npm run build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by **Aman Jain** · [GitHub](https://github.com/amanjain-31)

⭐ Star this repo if you found it useful!

</div>
