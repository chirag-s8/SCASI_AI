# Supabase Setup for Scasi-AI

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization, name the project (e.g. `scasi-ai`), set a database password, and pick a region
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

## 5. Test Connection

Start your dev server and visit: `http://localhost:3000/api/test-supabase`

This will verify your Supabase credentials and connection.

## Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | App users (keyed by uuidv5 from email) |
| `emails` | Synced Gmail/Outlook messages with FTS |
| `email_chunks` | Chunked content + embeddings for vector search |
| `assistant_sessions` | Chat/conversation sessions |
| `assistant_messages` | Messages within each session |

**Features:**
- **pgvector** – vector(768) for embeddings
- **HNSW index** – fast similarity search on `email_chunks.embedding`
- **FTS triggers** – auto-update `search_vector` on emails (subject, from, snippet, body)
- **RLS** – users only access their own data via `current_setting('app.user_id')`

## Auth Note

The schema uses a `public.users` table keyed by uuidv5(email) to work with **NextAuth** (Google/Azure OAuth). The `ensureUserExists()` helper in `lib/supabase.ts` automatically creates/updates user records when they sign in.

## Important: Have you run the migration?

If you haven't run the SQL migration yet:
1. Go to your Supabase Dashboard → SQL Editor
2. Copy all content from `supabase/migrations/001_initial_schema.sql`
3. Paste and run it

Without running the migration, the tables won't exist and connections will fail.
