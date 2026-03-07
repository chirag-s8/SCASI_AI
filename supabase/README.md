# Supabase Setup for AlgoQuest / Scasi-AI

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization, name the project (e.g. `algoquest`), set a database password, and pick a region
4. Wait for the project to be provisioned

## 2. Run the SQL Migration

### Option A: SQL Editor (recommended for first-time setup)

1. In your Supabase project, open **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor and click **Run**

### Option B: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project (get project ref from Dashboard > Settings > General)
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## 3. Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (keep secret!) → `SUPABASE_SERVICE_ROLE_KEY`

## 4. Add to `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Schema Summary

| Table | Purpose |
|-------|---------|
| `emails` | Synced Gmail/Outlook messages with FTS |
| `email_chunks` | Chunked content + embeddings for vector search |
| `assistant_sessions` | Chat/conversation sessions |
| `assistant_messages` | Messages within each session |

**Features:**
- **pgvector** – vector(1536) for OpenAI embeddings
- **HNSW index** – fast similarity search on `email_chunks.embedding`
- **FTS triggers** – auto-update `search_vector` on emails (subject, from, snippet, body)
- **RLS** – users only access their own data

## Auth Note

The schema uses `auth.users(id)` for `user_id`. If you use **Supabase Auth**, RLS works automatically. If you use **NextAuth** (Google/Azure), you’ll need to either:

- Sync users to Supabase Auth, or
- Use the service role key for server-side queries and enforce user_id in your app logic
