# 🚀 SCASI AI — HACKATHON PITCH SCRIPT
### *"The AI That Kills Email Anxiety Forever"*

> **FORMAT:** 5-minute demo pitch. High energy. No fluff. Every sentence earns its place.
> **VIBE:** Think Tony Stark presenting JARVIS, but for your inbox.

---

## 🎤 OPENING — THE HOOK (30 seconds)

> *[Walk up confidently. Pause. Look at the audience.]*

**"How many of you opened your email this morning and immediately felt a little bit of dread?"**

> *[Wait for hands / nods]*

**"Yeah. That's not a you problem. That's a broken system problem."**

**"The average knowledge worker spends 28% of their workweek just managing email. That's 11 hours a week. 572 hours a year. Gone. Not on building things. Not on thinking. On sorting, reading, replying, and forgetting to follow up."**

**"We built Scasi AI to kill that problem completely."**

---

## ⚡ THE PRODUCT — WHAT IT IS (45 seconds)

**"Scasi is an AI-powered email operating system. It connects to your Gmail, reads your inbox, understands every email, and takes action — so you don't have to."**

**"Not a plugin. Not a Chrome extension. A full-stack intelligent system built from the ground up with a multi-agent AI architecture, a custom LLM router, hybrid vector search, real-time streaming, and now — AI-powered email composition."**

**"Let me show you what that actually means."**

> *[Open the dashboard on screen]*

---

## 🖥️ LIVE DEMO — THE MONEY SHOTS (2 minutes 30 seconds)

### Shot 1 — The Dashboard
**"This is your inbox, but intelligent. Every email gets classified into one of 10 categories — urgent, action required, meeting, personal, social, promotional, newsletter, financial, spam, FYI — and assigned a priority score from 1 to 100."**

**"For obvious cases like spam or promotions, we don't even call an LLM. A keyword rule engine handles it — instant, free, zero latency. Only ambiguous emails hit the model. That's smart cost engineering."**

**"See this burnout score? Scasi tracks your urgent email load over time and tells you when you're heading toward burnout. Your inbox shouldn't be a health hazard."**

### Shot 2 — Compose with AI *(NEW)*
**"Now here's something no email client has ever done properly. Click Compose."**

> *[Open Compose with AI]*

**"Type in plain English: 'Send a mail to Saloni and keep Chirag in CC that she has to send the report by tomorrow.'"**

> *[Type it. Hit Generate.]*

**"Watch what happens. Scasi extracts the recipient name, detects the CC, infers the subject, identifies the tone, picks up the deadline — and drafts a complete, ready-to-send email in under 2 seconds. The To field auto-populates from contacts already in your inbox. CC is resolved automatically. The sign-off uses your real name from your Google account — never a placeholder."**

**"This isn't autocomplete. This is a two-step AI pipeline — intent extraction followed by context-aware drafting — running on our LLM router with Zod-validated structured output."**

### Shot 3 — Handle For Me
**"Now open an email. Click 'Handle For Me'."**

> *[Click it. Watch the stream.]*

**"In real-time, our orchestrator fires a 5-step pipeline: classify, summarize, extract every action item and deadline, draft a context-aware reply, and track follow-ups — all streamed token by token. One click. Done."**

### Shot 4 — The AI Chat
**"Open the assistant. Ask it anything."**

> *[Type: "Sort my inbox by what I should read first"]*

**"This is a ReAct loop — Reasoning, Acting, Observing — running live. The agent thinks, calls tools, reads your emails through our RAG system, and comes back with a ranked list. It's not a chatbot. It's an agent with memory, tools, and judgment."**

### Shot 5 — Calendar Extraction
**"Got an email about a meeting next Tuesday? Scasi reads it, extracts the event, converts relative dates to absolute timestamps, and drops it in your calendar. Browser notification 30 minutes before. Zero manual entry."**

### Shot 6 — Analytics
**"Email traffic heatmap by day and hour, top senders, category distribution, response time trends. You can finally see your email behavior as data."**

---

## 🧠 THE TECH — WHERE IT GETS WILD (1 minute 30 seconds)

### The LLM Router
**"We don't use one AI model. We use a fleet — and we built a custom router that assigns the right model to the right task."**

- **Groq + Llama 3.1 8B Instant** → routing and classification, sub-100ms
- **Groq + Llama 3.3 70B Versatile** → summarization, reply drafting, task extraction
- **GPT-OSS 120B via OpenRouter** → heavy extraction fallback
- **Gemma 3 27B via OpenRouter** → summarization fallback (1M token context window)
- **Nvidia Nemotron 30B via OpenRouter** → lightweight classification fallback
- **Qwen3 VL 235B Thinking via OpenRouter** → LLM-as-judge evaluation
- **Hermes 3 Llama 405B via OpenRouter** → judge fallback
- **Google Gemini embedding-001** → 768-dimensional embeddings (free tier)
- **Xenova bge-base-en-v1.5** → 100% local, offline embeddings — zero API calls, zero cost, zero privacy risk

**"Every task has a primary model and a fallback chain. If Groq rate-limits, we retry on OpenRouter. If that fails, we have a universal fallback key. The system never goes down."**

**"5 separate API keys — each scoped to a different model group. That's not a hack — that's architecture."**

### The Compose Pipeline *(NEW)*
**"Compose with AI runs a two-step LLM pipeline. Step one: intent extraction — recipient, CC names, subject, tone, deadline — all parsed from plain English using a structured Zod schema. Step two: context-aware drafting using the extracted intent. Both steps run through the same LLM router with full fallback chains. The sender's real name is pulled from the Google OAuth session — never a placeholder."**

### The RAG System
**"Hybrid search — pgvector cosine similarity on 768-dimensional embeddings combined with PostgreSQL full-text search — fused with Reciprocal Rank Fusion, then optionally reranked. HNSW index for sub-millisecond approximate nearest neighbor search. Emails chunked by section type. Context selection is token-aware — we never overflow the LLM's context window."**

### The Agent Architecture
- **NLP Agent** — classify, summarize, draft reply, extract tasks, extract entities, explain
- **RAG Agent** — chunk, embed, upsert, hybrid search, rerank, select context
- **Orchestrator Agent** — ReAct loop, intent detection, workflow dispatch, session memory, SSE streaming
- **Testing Agent** — LLM-as-judge evaluation with multi-category scoring and pass/fail thresholds

**"Every agent implements a typed interface. Every input and output is validated with Zod schemas. Every LLM call is traced with duration, model, and token counts."**

### The CI/CD Pipeline *(NEW)*
**"We shipped a production-grade CI/CD pipeline. Every push to main runs 5 gated jobs — lint, security audit, TypeScript type check, unit tests with coverage enforcement, and a production build. Coverage thresholds are enforced — the pipeline fails if coverage drops below 60%. Every pull request gets an automatic Vercel preview deployment with the URL posted as a PR comment. Production deploys only happen after all CI checks pass. Dependabot keeps dependencies updated weekly. CODEOWNERS enforces code review on critical paths. If a production deploy fails, it automatically rolls back to the last stable deployment."**

### The Database
**"Supabase PostgreSQL with Row-Level Security. pgvector for vector storage. Full-text search with tsvector and GIN indexes. 7 migrations. 8 tables. Cascading deletes. HNSW vector index."**

### The Stack
**"Next.js 16 App Router. React 19. TypeScript. Tailwind CSS. Framer Motion. Recharts. Server-Sent Events for real-time streaming. NextAuth v4 with Google OAuth. Node 20."**

---

## 📊 THE NUMBERS (20 seconds)

| Metric | Value |
|--------|-------|
| AI Models Integrated | **9** (across all providers) |
| LLM Providers | **4** (Groq, OpenRouter, Gemini, Local) |
| API Routes | **26** across 13 route groups |
| Email Categories | **10** |
| Agent Modules | **4 active + 1 planned** |
| NLP Operations | **6** |
| Database Tables | **8** |
| DB Migrations | **7** |
| Vector Dimensions | **768** |
| CI/CD Jobs | **5 gated + preview deploy + production deploy** |
| Fallback Chains | **Every single task** |

---

## 🎯 THE CLOSER (30 seconds)

**"Email is the last unoptimized frontier in productivity software. Everyone has tried to fix it with filters, folders, and labels. That's just rearranging deck chairs."**

**"We went deeper. We built an AI that understands email the way a brilliant assistant would — reads it, prioritizes it, composes it, acts on it, and learns from it."**

**"Scasi isn't a tool that helps you manage email. Scasi is the system that manages email so you can stop thinking about it entirely."**

**"We're Scasi AI. Thank you."**

> *[Step back. Let it land.]*

---

## 🔥 JUDGE Q&A CHEAT SHEET

**Q: How do you handle rate limits?**
> "4 separate OpenRouter API keys scoped to different model groups, plus Groq as a separate provider. Each task has a fallback chain with exponential backoff built into the LLM router. The system degrades gracefully — it never hard-fails."

**Q: What about privacy? You're reading people's emails.**
> "All data is stored in Supabase with Row-Level Security — users can only access their own data. We support local embeddings via Xenova Transformers that run 100% on-device with zero API calls. The entire embedding pipeline can run offline."

**Q: How is Compose with AI different from Gmail's Smart Compose?**
> "Gmail's Smart Compose autocompletes one sentence at a time. Ours takes a full natural language instruction — recipient, CC, tone, deadline — and generates a complete ready-to-send email in one shot using a two-step structured LLM pipeline. You describe what you want in plain English and it's done."

**Q: How is this different from Gmail's built-in AI?**
> "Gmail's AI is a black box you can't control, extend, or query. Scasi is an open agent system — you can ask it anything, it uses tools, it has memory, it runs multi-step workflows, and it gives you full analytics on your email behavior. It's the difference between a smart filter and an intelligent assistant."

**Q: What's the business model?**
> "Freemium SaaS. Free tier with limited AI actions per month. Pro tier unlocks unlimited actions, team collaboration, and advanced analytics. Enterprise tier adds custom model routing and on-premise deployment."

**Q: Is the code production-ready?**
> "TypeScript throughout the agent layer, Zod validation on every API input and output, structured error handling, LLM call tracing, rate limiting, response caching, 7 database migrations, and a full CI/CD pipeline with security audits, coverage enforcement, automated rollback, and Dependabot. It's not a prototype — it's a system."

**Q: How does the CI/CD pipeline work?**
> "Every push triggers 5 parallel jobs — lint, security audit, type check, tests with coverage, and build. All must pass before production deploys. Every PR gets a live preview URL automatically. If a production deploy fails, it rolls back automatically. Dependabot opens weekly PRs to keep dependencies patched."

---

## 🛠️ TECH STACK QUICK REFERENCE

```
FRONTEND          BACKEND           AI / LLM
──────────        ──────────        ──────────────────────────────
Next.js 16        Next.js API       Groq:
React 19          NextAuth v4         - llama-3.1-8b-instant
TypeScript        Supabase            - llama-3.3-70b-versatile
Tailwind CSS      PostgreSQL        OpenRouter:
Framer Motion     pgvector            - openai/gpt-oss-120b:free
Recharts          Row-Level Sec.      - google/gemma-3-27b-it:free
Lucide React      Zod validation      - nvidia/nemotron-3-nano-30b
React Markdown    SSE Streaming       - qwen/qwen3-vl-235b-thinking
                  Node.js 20          - nousresearch/hermes-3-405b
                                    Google gemini-embedding-001
                                    Xenova/bge-base-en-v1.5 (local)

DEVOPS
──────────────────────────────────────────────────────────────────
GitHub Actions CI/CD    Vercel (production + preview deploys)
Dependabot              CODEOWNERS + branch protection
Coverage enforcement    Automated rollback on deploy failure

APIS USED
──────────────────────────────────────────────────────────────────
Gmail API (googleapis)    Google OAuth    Supabase REST + Realtime
Groq API                  OpenRouter API  Google Gemini API
```

---

*Built with obsession. Shipped for the hackathon. Ready for the world.*
