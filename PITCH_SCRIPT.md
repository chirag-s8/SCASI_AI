# 🚀 SCASI AI — HACKATHON PITCH SCRIPT
### *"The AI That Kills Email Anxiety Forever"*

---

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

**"Not a plugin. Not a Chrome extension. A full-stack intelligent system built from the ground up with a multi-agent AI architecture, a custom LLM router, hybrid vector search, and a real-time streaming interface."**

**"Let me show you what that actually means."**

> *[Open the dashboard on screen]*

---

## 🖥️ LIVE DEMO — THE MONEY SHOTS (2 minutes)

### Shot 1 — The Dashboard
**"This is your inbox, but intelligent. When you ask Scasi to classify an email, it runs through a 10-category system — urgent, action required, meeting, personal, social, promotional, newsletter, financial, spam, and FYI — and assigns a priority score from 1 to 100. And here's the thing: for obvious cases like spam or promotions, it doesn't even call an LLM. It uses a keyword rule engine — instant, free, zero latency. Only ambiguous emails hit the model."**

**"See this burnout score? Scasi tracks your urgent email load over time and tells you when you're heading toward burnout. Your inbox shouldn't be a health hazard."**

### Shot 2 — Handle For Me
**"Click one button — 'Handle For Me' — and watch what happens."**

> *[Click it. Watch the stream.]*

**"In real-time, our orchestrator agent fires a full pipeline: classify the email, generate a structured summary, extract every action item and deadline, and draft a context-aware reply — all streamed token by token to your screen. One click. Done."**

### Shot 3 — The AI Chat
**"Now open the assistant. Ask it anything."**

> *[Type: "Sort my inbox by what I should read first"]*

**"This is a ReAct loop — Reasoning, Acting, Observing — running live. The agent thinks, calls tools, reads your emails through our RAG system, and comes back with a ranked list. It's not a chatbot. It's an agent with memory, tools, and judgment."**

### Shot 4 — Calendar Extraction
**"Got an email about a meeting next Tuesday? Scasi reads it, extracts the event, converts relative dates to absolute timestamps, and drops it in your calendar. With a browser notification 30 minutes before. Zero manual entry."**

### Shot 5 — Analytics
**"And here's the analytics dashboard — email traffic heatmap by day and hour, top senders, category distribution, response time trends. You can finally see your email behavior as data."**

---

## 🧠 THE TECH — WHERE IT GETS WILD (1 minute 30 seconds)

**"Now let me tell you how this actually works, because this is where it gets interesting."**

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

**"Every task has a primary model and a fallback chain. If Groq rate-limits, we automatically retry on OpenRouter. If that fails, we have a universal fallback key. The system never goes down."**

**"We have 5 separate API keys — Groq plus 4 scoped OpenRouter keys — each assigned to a different model group. That's not a hack — that's architecture."**

### The RAG System
**"When you ask the assistant a question, it doesn't just search keywords. It runs hybrid search — combining pgvector cosine similarity on 768-dimensional embeddings with PostgreSQL full-text search — then fuses the results using Reciprocal Rank Fusion, then optionally reranks with a specialized model."**

**"The database has an HNSW index on the vector column — that's Hierarchical Navigable Small World — for sub-millisecond approximate nearest neighbor search at scale."**

**"Emails are chunked by section type: subject, header, body, signature, quoted text, metadata. Each chunk is embedded separately. Context selection is token-aware — we never overflow the LLM's context window."**

### The Agent Architecture
**"The codebase has a proper multi-agent system:"**

- **NLP Agent** — classify, summarize, draft reply, extract tasks, extract entities, explain
- **RAG Agent** — chunk, embed, upsert, hybrid search, rerank, select context
- **Orchestrator Agent** — ReAct loop, intent detection, workflow dispatch, session memory, SSE streaming
- **Testing Agent** — LLM-as-judge evaluation with multi-category scoring and pass/fail thresholds

**"Every agent implements a typed interface. Every input and output is validated with Zod schemas. Every LLM call is traced with duration, model, and token counts. This is production-grade code."**

### The Database
**"Supabase PostgreSQL with Row-Level Security — users can only ever see their own data. pgvector extension for vector storage. Full-text search with tsvector and GIN indexes. 5 migrations. 8 tables. Cascading deletes. HNSW vector index."**

### The Stack
**"Next.js 16 App Router. React 19. TypeScript. Tailwind CSS. Framer Motion. Recharts for data viz. Server-Sent Events for real-time streaming. NextAuth v4 with Google OAuth. The whole thing runs on Node 20."**

---

## 📊 THE NUMBERS (20 seconds)

| Metric | Value |
|--------|-------|
| AI Models Integrated | **9** (across all providers) |
| LLM Providers | **4** (Groq, OpenRouter, Gemini, Local) |
| API Routes | **25** across 12 route groups |
| Email Categories | **10** |
| Agent Modules | **4 active + 1 planned** |
| NLP Operations | **6** |
| Database Tables | **8** |
| DB Migrations | **5** |
| Vector Dimensions | **768** |
| Eval Dataset | **12 emails, 4 scoring categories** |
| Fallback Chains | **Every single task** |

---

## 🎯 THE CLOSER (30 seconds)

**"Email is the last unoptimized frontier in productivity software. Everyone has tried to fix it with filters, folders, and labels. That's just rearranging deck chairs."**

**"We went deeper. We built an AI that understands email the way a brilliant assistant would — reads it, prioritizes it, acts on it, and learns from it."**

**"Scasi isn't a tool that helps you manage email. Scasi is the system that manages email so you can stop thinking about it entirely."**

**"We're Scasi AI. Thank you."**

> *[Step back. Let it land.]*

---

## 🔥 BONUS: JUDGE Q&A CHEAT SHEET

**Q: How do you handle rate limits?**
> "We have 4 separate OpenRouter API keys scoped to different model groups, plus Groq as a separate provider. Each task has a fallback chain. We also have a token-per-minute rate limiter with exponential backoff built into the LLM router. The system degrades gracefully — it never hard-fails."

**Q: What about privacy? You're reading people's emails.**
> "All data is stored in Supabase with Row-Level Security — users can only access their own data. We support local embeddings via Xenova Transformers that run 100% on-device with zero API calls. For the most privacy-sensitive users, the entire embedding pipeline can run offline."

**Q: How is this different from Gmail's built-in AI?**
> "Gmail's AI is a black box you can't control, extend, or query. Scasi is an open agent system — you can ask it anything, it uses tools, it has memory, it runs multi-step workflows, and it gives you full analytics on your email behavior. It's the difference between a smart filter and an intelligent assistant."

**Q: What's the business model?**
> "Freemium SaaS. Free tier with limited AI actions per month. Pro tier unlocks unlimited actions, team collaboration, and advanced analytics. Enterprise tier adds custom model routing and on-premise deployment."

**Q: Can it handle large inboxes?**
> "Yes. The HNSW vector index scales to millions of vectors. Full-text search uses GIN indexes. Emails are chunked and indexed asynchronously. The hybrid search runs in milliseconds even at scale."

**Q: Is the code production-ready?**
> "It has TypeScript throughout the agent layer, Zod validation on every API input and output, structured error handling with error codes, LLM call tracing, rate limiting, response caching, and 5 database migrations. It's not a prototype — it's a system."

---

## 🛠️ TECH STACK QUICK REFERENCE CARD

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

APIS USED
──────────────────────────────────────────────────────────────────
Gmail API (googleapis)    Google OAuth    Supabase REST + Realtime
Groq API                  OpenRouter API  Google Gemini API
```

---

*Built with obsession. Shipped for the hackathon. Ready for the world.*
