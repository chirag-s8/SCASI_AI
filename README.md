<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-pgvector-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-Private-red" alt="License" />
</p>

<h1 align="center">📧 Scasi AI</h1>

<p align="center">
  <strong>AI-Powered Email & Productivity Platform</strong><br/>
  Auto-categorize, prioritize, draft replies, and track follow-ups — so you never burn out on email again.
</p>

---

## ✨ Features

| Category | Capabilities |
|----------|-------------|
| **Smart Inbox** | 10-category classification, priority scoring (1–100), batch sort |
| **AI Actions** | Summarize, explain, draft replies (6 tones), extract tasks, detect follow-ups |
| **Handle For Me** | 5-step agentic pipeline — classify → summarize → extract → draft → track |
| **Compose with AI** | Natural-language email composition ("Send a mail to Saloni, CC Chirag, about the report due tomorrow") |
| **RAG Search** | Semantic search across all indexed emails (vector + full-text hybrid) |
| **Voice Assistant** | "Hey Scasi" wake word, browser STT/TTS, natural conversation |
| **Calendar Sync** | View, create, delete Google Calendar events; AI extracts event details from emails |
| **Team Collaboration** | Assign emails to team members, track workload, invite teammates |
| **Analytics Dashboard** | Email volume trends, category distribution, burnout & stress detection |
| **Burnout Detection** | Stress level scoring, urgent email count, late-night pattern tracking |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Tailwind CSS, Framer Motion, Lucide React |
| State | Zustand |
| Auth | NextAuth.js (Google & Azure AD OAuth) |
| Database | Supabase — PostgreSQL + pgvector + RLS |
| LLM Routing | Groq (Llama 3), OpenRouter (GPT-OSS, Qwen, Nemotron, DeepSeek), Gemini |
| Local Embeddings | @xenova/transformers (bge-base-en-v1.5, 768-dim) |
| Email | Gmail API (googleapis) |
| Voice | Web SpeechRecognition API + SpeechSynthesis |
| Charts | Recharts |
| Validation | Zod |
| Testing | Jest + Testing Library |

---

## 📂 Project Structure

```
Scasi-AI/
├── app/                      # Next.js App Router
│   ├── api/                  #   API routes (AI, Gmail, Calendar, Team, RAG, Auth, DB)
│   ├── dashboard/            #   Dashboard page
│   ├── analytics/            #   Analytics page
│   ├── calendar/             #   Calendar page
│   ├── team/                 #   Team collaboration page
│   └── ...                   #   Landing, features, pricing, how-it-works
├── src/
│   ├── agents/               # Multi-agent AI architecture
│   │   ├── orchestrator/     #   ReAct loop, workflow routing, tool dispatch
│   │   ├── nlp/              #   Classify, extract, reply, summarize (LLM prompts)
│   │   ├── rag/              #   Chunker, embedder, hybrid search, reranker, cache
│   │   ├── voice/            #   Wake word, STT controller, session overlay
│   │   ├── testing/          #   LLM-as-judge eval, prompt versioning, dataset
│   │   └── _shared/          #   Tool bridge, Supabase client, types, utils
│   └── llm/                  # LLM infrastructure
│       ├── router.ts         #   Task-aware model routing
│       ├── registry.ts       #   Provider & model definitions
│       ├── policy.ts         #   Fallback chains & retry logic
│       ├── cache.ts          #   In-memory + persistent LLM cache
│       ├── rate-limiter.ts   #   Token-bucket rate limiting
│       └── tracing.ts        #   Request tracing & observability
├── components/               # React UI components
│   ├── dashboard/            #   ScasiDashboard, EmailCard, FollowUpTracker
│   ├── compose/              #   ComposeWithAI modal
│   ├── analytics/            #   AnalyticsDashboard
│   ├── voice/                #   VoiceWidget, MicButton, SessionOverlay
│   ├── team/                 #   TeamCollaboration, EmailTeamPanel
│   ├── calendar/             #   CalendarView, CalendarNotifier, ReminderPopup
│   ├── inbox/                #   Sidebar, TopNavBar, MailLoadingScreen
│   └── ...                  #   Hero, LaptopDemo, GeminiSidebar, Providers
├── lib/                      # Utilities & hooks
│   ├── inboxStore.ts         #   Zustand global store
│   ├── sseParser.ts          #   SSE stream parser
│   ├── emailAnalysis.ts      #   Phishing detection, urgency scoring
│   ├── emailHelpers.ts       #   Header parsing, snippet extraction
│   ├── dateUtils.ts          #   Relative time formatting
│   ├── openrouter.ts         #   OpenRouter helper
│   ├── supabase.ts           #   Supabase client
│   ├── resolveEmailVerified.ts # OAuth email verification
│   └── hooks/               #   useFetchEmails, useHandleForMe, useReplyFlow, useTriage
├── supabase/
│   └── migrations/           # 6 SQL migrations (schema, pgvector, FTS, evals, cache)
├── .github/workflows/        # CI (lint, typecheck, test, build) & CD pipelines
└── SCASI_AI_Documentation.docx  # 📘 Complete in-depth project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node)
- **Supabase** project with pgvector enabled
- **Google Cloud** project with Gmail API & OAuth enabled
- **API keys** for Groq, OpenRouter, and/or Gemini

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/salonxix/Scasi-AI.git
cd Scasi-AI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in ALL variables in .env.local (see below)

# 4. Run database migrations
# Apply the SQL files in supabase/migrations/ to your Supabase project

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

All variables are documented in [`.env.example`](.env.example). Key groups:

| Group | Variables | Purpose |
|-------|-----------|---------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database access |
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Gmail API & authentication |
| **Azure AD** | `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Enterprise auth |
| **Groq** | `GROQ_API_KEY` | Llama 3 models (routing, replies) |
| **OpenRouter** | `OPENROUTER_API_KEY_GPT_OSS`, `OPENROUTER_API_KEY_NEMOTRON`, `OPENROUTER_API_KEY_QWEN3`, `OPENROUTER_API_KEY_HUNTER` | Multi-model access |
| **Gemini** | `GEMINI_API_KEY` | Embeddings (free tier) |
| **Eval Auth** | `EVAL_ADMIN_EMAILS` | Comma-separated admin emails for eval access |

---

## 🤖 AI Agent Architecture

Scasi uses a **multi-agent architecture** where specialized agents collaborate:

```
User Request
     │
     ▼
┌──────────────┐     ┌──────────────┐
│  Orchestrator │────▶│   NLP Agent  │  classify, summarize, reply, extract
│  (ReAct Loop) │     └──────────────┘
│              │     ┌──────────────┐
│  Tools:      │────▶│   RAG Agent  │  chunk → embed → hybrid search → rerank
│  handle_for_me│    └──────────────┘
│  sort_inbox   │     ┌──────────────┐
│              │────▶│ Voice Agent  │  wake word → STT → TTS
└──────────────┘     └──────────────┘
     │                    │
     ▼                    ▼
┌──────────────────────────────────────┐
│          LLM Router                  │
│  Groq ←→ OpenRouter ←→ Gemini       │
│  (policy fallback chains)            │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│          Supabase (pgvector)         │
│  emails, email_chunks, follow_ups,   │
│  assistant_sessions, eval_runs       │
└──────────────────────────────────────┘
```

### Agent Breakdown

| Agent | Responsibility | Key Files |
|-------|---------------|-----------|
| **Orchestrator** | ReAct loop, tool execution, intent routing (`handle_for_me`, `sort_inbox`) | `src/agents/orchestrator/` |
| **NLP** | Classification (rule-based + LLM), summarization, reply drafting, task extraction | `src/agents/nlp/` |
| **RAG** | Email chunking, embedding (Transformers.js/Gemini), hybrid vector+FTS search, reranking, context selection | `src/agents/rag/` |
| **Voice** | Wake word detection ("Hey Scasi"), browser STT, TTS playback, session management | `src/agents/voice/` |
| **Testing** | LLM-as-judge evaluation (Qwen3), prompt versioning, curated eval dataset, auth-gated | `src/agents/testing/` |

---

## 🔀 Key Flows

### Handle For Me (5-Step Agentic Pipeline)

```
User clicks "Handle For Me" on an email
     │
     ▼  SSE stream to /api/chat
Orchestrator receives intent
     │
     ├─→ Step 1: Classify — assign category + priority score
     ├─→ Step 2: Summarize — extract key ask, deadline, tone
     ├─→ Step 3: Extract Tasks — identify action items & deadlines
     ├─→ Step 4: Draft Reply — compose response in chosen tone
     └─→ Step 5: Detect Follow-ups — schedule reminders for pending items
     │
     ▼
Results streamed to UI in real-time via SSE
```

### RAG Search

```
New email → DB → Chunked → Embedded (bge-base / Gemini) → Stored in email_chunks (pgvector)
                                                          │
Search query → Embed → hybrid_search_chunks(vector + FTS) → Rerank → Top-K results
```

### Voice Assistant

```
"Hey Scasi" → Wake word listener activates
     │
     ▼
STT captures speech → Text sent to /api/chat
     │
     ▼
Orchestrator processes → Response streamed back
     │
     ▼
Browser TTS reads answer aloud
```

---

## 🧪 Testing & Evaluation

Scasi includes a built-in **LLM-as-judge evaluation system**:

- **Eval Dataset:** Curated email samples covering all 10 categories (`src/agents/testing/eval-dataset.ts`)
- **Eval Runner:** Sends samples through NLP pipeline, scores outputs against expected results
- **Judge Model:** Qwen3 235B via OpenRouter for unbiased quality assessment
- **Prompt Versioning:** Track and compare prompt versions over time (`006_eval_prompt_versions` table)
- **Auth-Gated:** Only `EVAL_ADMIN_EMAILS` can run/read evals; requires `email_verified=true`

Run evals:
```bash
# Via API
curl -X POST http://localhost:3000/api/actions/run-evals \
  -H "Authorization: Bearer <session_token>"
```

---

## 📊 Database Schema (Supabase)

7 migrations create the following core tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User profiles | `id`, `email`, `name`, `provider` |
| `emails` | Cached Gmail messages | `gmail_id`, `subject`, `from`, `category`, `priority`, `tsvector` |
| `email_chunks` | RAG chunk store | `content`, `embedding vector(768)`, `email_id` FK |
| `assistant_sessions` | Chat sessions | `id`, `user_id`, `title`, `created_at` |
| `assistant_messages` | Chat messages | `session_id` FK, `role`, `content` |
| `follow_ups` | Follow-up tracking | `email_id` FK, `due_date`, `status`, `assigned_to` |
| `eval_runs` | Evaluation results | `prompt_version`, `scores`, `dataset_hash` |
| `eval_prompt_versions` | Prompt snapshots | `version`, `prompt_text`, `timestamp` |
| `llm_cache` | LLM response cache | `cache_key`, `response`, `model`, `expires_at` |

> Uses **Row Level Security (RLS)**, **pgvector** for similarity search, and **tsvector** triggers for full-text search.

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove `.next` build cache |

---

## 🔄 CI/CD

GitHub Actions pipelines in `.github/workflows/`:

- **`ci.yml`** — Lint, typecheck, test, and build on every PR
- **`cd.yml`** — Automated deployment on merge to main
- **`notify.yml`** — Failure notifications
- **Dependabot** — Automated dependency updates

---

## 📘 Full Documentation

> **For the complete, in-depth documentation covering every agent, route, component, hook, migration, and flow in detail, download [`SCASI_AI_Documentation.docx`](./SCASI_AI_Documentation.docx).**
>
> *Note: GitHub cannot preview .docx files inline — click the file, then "Download" to open it in Word or Google Docs.*

That document includes:

- Deep dives into each AI agent (Orchestrator, NLP, RAG, Voice, Testing)
- Complete LLM infrastructure (Router, Registry, Policy, Cache, Rate Limiter, Tracing)
- Every API route explained with request/response details
- All frontend components and pages documented
- Database schema with all migrations and relationships
- Step-by-step walkthroughs of 7 key flows
- Architecture diagrams
- Troubleshooting guide

---

## 🤝 Team

Built by **Avila Princy M**, **Saloni Kumari**, **Chirag S**, and **Shreya Sherikar**.

---

## 📄 License

Private — All rights reserved.
