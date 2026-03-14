# NeurAX Agent — Autonomous Workflow AI Agent

> **Hackathon Project** | Autonomous AI-powered project management and task distribution system

---

## Problem Statement

Organizations struggle with efficient task distribution, workflow automation, and coordination between employees when handling complex multi-step projects. Managers typically assign tasks manually, leading to delays, inefficient workload distribution, and lack of real-time decision support.

**NeurAX Agent** solves this by autonomously analyzing projects, decomposing them into subtasks, matching employees based on skills and availability, and tracking progress — all with minimal human intervention.

---

## What It Does

NeurAX Agent is an autonomous AI system that acts as an intelligent project manager:

- **Analyzes** project requirements and extracts skill needs automatically
- **Decomposes** complex projects into prioritized, actionable subtasks
- **Understands** employee skills, experience, and current workload
- **Assigns** tasks automatically to the best-fit employees using AI reasoning
- **Tracks** workflow progress in real time with live Firestore updates
- **Updates** decisions dynamically as task statuses change
- **Recommends** the right tools and flags risks proactively

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| AI Brain | Google Gemini 2.0 Flash API |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication |
| Hosting | Firebase Hosting |

---

## Architecture

```
User Input (Project + Employees + History)
            │
            ▼
    ┌─────────────────────┐
    │  Gemini 2.0 Flash   │  ← AI Orchestrator
    │  (Autonomous Agent) │
    └─────────────────────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
Analyze  Decompose  Match
Project  Subtasks   Skills
            │
            ▼
    Auto-Assign Tasks
            │
            ▼
    Firebase Firestore  ← Real-time storage
            │
            ▼
    React Dashboard     ← Live UI with progress tracking
```

---

## Dataset

The system is powered by 4 organizational datasets:

### Employees (6 members)

| ID | Name | Role | Key Skills | Workload |
|---|---|---|---|---|
| EMP001 | Aarav Sharma | AI Engineer | Python, LLMs, LangChain, ML | 40% |
| EMP002 | Riya Patel | Data Scientist | Python, Data Analysis, ML, Pandas | 35% |
| EMP003 | Vikram Singh | Backend Developer | Node.js, APIs, Databases | 50% |
| EMP004 | Sneha Reddy | Frontend Developer | React, UI/UX, JavaScript | 30% |
| EMP005 | Karthik Rao | DevOps Engineer | Docker, Kubernetes, AWS, CI/CD | 45% |
| EMP006 | Meera Nair | AI Researcher | LLMs, NLP, RAG, Deep Learning | 55% |

### Projects (4 active)

| ID | Project | Priority | Deadline |
|---|---|---|---|
| PRJ001 | AI Sales Assistant | High | 30 days |
| PRJ002 | Healthcare Diagnosis Model | High | 45 days |
| PRJ003 | Customer Support Chatbot | Medium | 25 days |
| PRJ004 | Smart Inventory System | Medium | 40 days |

The system also uses **tools data** (OpenAI API, Pinecone, LangChain, etc.) and **project history** (past completed projects with success scores) to make smarter decisions.

---

## AI Agent Capabilities

The Gemini AI agent autonomously produces:

```json
{
  "subtasks": [
    { "task_name": "...", "required_skill": "...", "priority": "High", "estimated_days": 5 }
  ],
  "assignments": [
    {
      "employee_id": "EMP001",
      "employee_name": "Aarav Sharma",
      "task_name": "Build LLM pipeline",
      "reason": "Best match: 4 years experience with LLMs and LangChain, currently at 40% workload",
      "workload_after": 65
    }
  ],
  "estimated_completion_days": 28,
  "risk_flags": ["EMP006 near capacity — monitor workload"],
  "tool_recommendations": ["LangChain", "OpenAI API", "FastAPI"]
}
```

The `reason` field demonstrates true autonomous reasoning — the agent explains *why* each employee was chosen, not just who was assigned.

---

## Features

- **One-click AI analysis** — run the agent on any project and get a full plan in seconds
- **Real-time dashboard** — live project status, assignment cards, progress bars
- **Workload awareness** — agent avoids overloading employees above 75% capacity
- **Task progress tracking** — mark tasks as Not Started / In Progress / Completed
- **Auto project completion** — project status updates automatically when all tasks are done
- **Risk flag detection** — AI proactively warns about capacity issues and skill gaps
- **Tool recommendations** — AI suggests the right tech stack per project
- **Employee directory** — searchable, sorted by availability with workload visualizations

---

## Project Structure

```
neurax-agent/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx        # Project overview + stats
│   │   ├── ProjectDetail.jsx    # Full project + agent panel
│   │   └── Employees.jsx        # Team directory
│   ├── components/
│   │   ├── Navbar.jsx           # Sidebar navigation
│   │   ├── ProjectCard.jsx      # Project summary card
│   │   ├── TaskCard.jsx         # Individual task card
│   │   └── AgentPanel.jsx       # AI agent UI + results
│   ├── services/
│   │   ├── firebase.js          # Firestore connection + helpers
│   │   └── geminiService.js     # Gemini API integration
│   └── hooks/
│       ├── useProjects.js       # Real-time projects hook
│       └── useEmployees.js      # Real-time employees hook
├── data/
│   ├── employees.csv
│   ├── projects.csv
│   ├── tools.csv
│   └── project_history.csv
├── seedFirestore.js             # One-time DB seeding script
├── .env                         # API keys (not committed)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project (Firestore enabled)
- Google Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/neurax-agent.git
cd neurax-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Seed the database

Place your `serviceAccountKey.json` (from Firebase Console → Service Accounts) in the root, then run:

```bash
npm install firebase-admin csv-parse
node seedFirestore.js
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## How to Use

1. Open the **Dashboard** — see all 4 active projects with their status and priority
2. Click any project to open the **Project Detail** page
3. Click **"Run AI Agent"** — Gemini analyzes the project against all employees
4. Review the generated **subtasks**, **assignments**, and **risk flags**
5. Click **"Confirm and Save Plan"** to persist the assignments to Firestore
6. Track progress by updating task statuses on each assignment card
7. Visit **Employees** page to see team availability and workload distribution

---

## API Keys Required

| Key | Source | Cost |
|---|---|---|
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | Free tier |
| Firebase config | [Firebase Console](https://console.firebase.google.com) | Free Spark plan |

---

## Firestore Collections

| Collection | Description |
|---|---|
| `employees` | 6 team members with skills and workload |
| `projects` | 4 active projects with requirements |
| `tools` | Available tools and their purposes |
| `projectHistory` | Past projects with success scores |
| `agentPlans` | AI-generated assignment plans (written at runtime) |

---

## Autonomous Reasoning Demo

When the agent runs on **PRJ001 - AI Sales Assistant** (requires LLM, NLP, APIs), it autonomously:

1. Identifies that LLM + NLP skills are needed
2. Finds EMP001 (Aarav Sharma) — LLMs expert at only 40% workload — best fit for LLM pipeline
3. Finds EMP006 (Meera Nair) — NLP + RAG specialist — assigned NLP processing task
4. Finds EMP003 (Vikram Singh) — APIs expert — assigned backend integration
5. Flags that EMP006 will reach ~80% workload after assignment — risk flagged
6. Recommends LangChain + OpenAI API as tools
7. Estimates 26-day completion vs 30-day deadline — on track

All of this happens in one API call with zero human configuration.

---

## Built With

- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Firebase](https://firebase.google.com)
- [Google Gemini API](https://ai.google.dev)
- [React Router](https://reactrouter.com)

---

## Team

Built for the **Autonomous Workflow AI Agent** hackathon challenge.

---

## License

MIT License — feel free to use, modify, and distribute.
