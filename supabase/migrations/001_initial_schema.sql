-- =============================================================================
-- AlgoQuest / Scasi-AI - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- users: app-level users (keyed by uuidv5 from email)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- emails: stores synced Gmail/Outlook messages
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gmail_id TEXT,
  subject TEXT,
  "from" TEXT,
  "date" TIMESTAMPTZ,
  snippet TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, gmail_id)
);

-- email_chunks: chunked email content for vector search (RAG)
CREATE TABLE IF NOT EXISTS public.email_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- assistant_sessions: chat/conversation sessions
CREATE TABLE IF NOT EXISTS public.assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- assistant_messages: messages within each session
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.assistant_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- users: email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- emails: user lookup, date ordering
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON public.emails("date" DESC);
CREATE INDEX IF NOT EXISTS idx_emails_user_date ON public.emails(user_id, "date" DESC);

-- email_chunks: FK, vector similarity
CREATE INDEX IF NOT EXISTS idx_email_chunks_email_id ON public.email_chunks(email_id);

-- HNSW index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_email_chunks_embedding_hnsw
  ON public.email_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- assistant_sessions: user lookup
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id ON public.assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_updated ON public.assistant_sessions(updated_at DESC);

-- assistant_messages: session lookup
CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id ON public.assistant_messages(session_id);

-- =============================================================================
-- 4. FULL-TEXT SEARCH (FTS)
-- =============================================================================

-- Add tsvector column to emails
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- FTS trigger function for emails
CREATE OR REPLACE FUNCTION public.emails_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."from", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.snippet, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS emails_search_vector_trigger ON public.emails;

-- Create FTS trigger for emails
CREATE TRIGGER emails_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.emails_search_vector_trigger();

-- Backfill existing rows (if any) - triggers search_vector update (emails)
UPDATE public.emails SET updated_at = now() WHERE search_vector IS NULL;

-- GIN index for emails FTS
CREATE INDEX IF NOT EXISTS idx_emails_search_vector
  ON public.emails USING gin(search_vector);

-- =============================================================================
-- 4.5 FULL-TEXT SEARCH (FTS) FOR EMAIL CHUNKS
-- =============================================================================

-- Add tsvector column to email_chunks
ALTER TABLE public.email_chunks ADD COLUMN IF NOT EXISTS chunk_search_vector tsvector;

-- FTS trigger function for email_chunks
CREATE OR REPLACE FUNCTION public.email_chunks_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.chunk_search_vector := to_tsvector('english', COALESCE(NEW.chunk_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS email_chunks_search_vector_trigger ON public.email_chunks;

-- Create FTS trigger for email_chunks
CREATE TRIGGER email_chunks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.email_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.email_chunks_search_vector_trigger();

-- Backfill existing rows
UPDATE public.email_chunks SET created_at = created_at WHERE chunk_search_vector IS NULL;

-- GIN index for email_chunks FTS
CREATE INDEX IF NOT EXISTS idx_email_chunks_search_vector
  ON public.email_chunks USING gin(chunk_search_vector);

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- users: users can read/update their own profile
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- emails: users see only their own
DROP POLICY IF EXISTS "emails_select_own" ON public.emails;
CREATE POLICY "emails_select_own" ON public.emails
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "emails_insert_own" ON public.emails;
CREATE POLICY "emails_insert_own" ON public.emails
  FOR INSERT WITH CHECK ((current_setting('app.user_id', true))::uuid = user_id);

DROP POLICY IF EXISTS "emails_update_own" ON public.emails;
CREATE POLICY "emails_update_own" ON public.emails
  FOR UPDATE 
  USING ((current_setting('app.user_id', true))::uuid = user_id)
  WITH CHECK ((current_setting('app.user_id', true))::uuid = user_id);

DROP POLICY IF EXISTS "emails_delete_own" ON public.emails;
CREATE POLICY "emails_delete_own" ON public.emails
  FOR DELETE USING ((current_setting('app.user_id', true))::uuid = user_id);

-- email_chunks: via emails (user owns email)
DROP POLICY IF EXISTS "email_chunks_select_via_email" ON public.email_chunks;
CREATE POLICY "email_chunks_select_via_email" ON public.email_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.emails e
      WHERE e.id = email_chunks.email_id AND e.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "email_chunks_insert_via_email" ON public.email_chunks;
CREATE POLICY "email_chunks_insert_via_email" ON public.email_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emails e
      WHERE e.id = email_chunks.email_id AND e.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "email_chunks_update_via_email" ON public.email_chunks;
CREATE POLICY "email_chunks_update_via_email" ON public.email_chunks
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.emails e
      WHERE e.id = email_chunks.email_id AND e.user_id = (current_setting('app.user_id', true))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emails e
      WHERE e.id = email_chunks.email_id AND e.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "email_chunks_delete_via_email" ON public.email_chunks;
CREATE POLICY "email_chunks_delete_via_email" ON public.email_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.emails e
      WHERE e.id = email_chunks.email_id AND e.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

-- assistant_sessions: users see only their own
DROP POLICY IF EXISTS "assistant_sessions_select_own" ON public.assistant_sessions;
CREATE POLICY "assistant_sessions_select_own" ON public.assistant_sessions
  FOR SELECT USING ((current_setting('app.user_id', true))::uuid = user_id);

DROP POLICY IF EXISTS "assistant_sessions_insert_own" ON public.assistant_sessions;
CREATE POLICY "assistant_sessions_insert_own" ON public.assistant_sessions
  FOR INSERT WITH CHECK ((current_setting('app.user_id', true))::uuid = user_id);

DROP POLICY IF EXISTS "assistant_sessions_update_own" ON public.assistant_sessions;
CREATE POLICY "assistant_sessions_update_own" ON public.assistant_sessions
  FOR UPDATE 
  USING ((current_setting('app.user_id', true))::uuid = user_id)
  WITH CHECK ((current_setting('app.user_id', true))::uuid = user_id);

DROP POLICY IF EXISTS "assistant_sessions_delete_own" ON public.assistant_sessions;
CREATE POLICY "assistant_sessions_delete_own" ON public.assistant_sessions
  FOR DELETE USING ((current_setting('app.user_id', true))::uuid = user_id);

-- assistant_messages: via session (user owns session)
DROP POLICY IF EXISTS "assistant_messages_select_via_session" ON public.assistant_messages;
CREATE POLICY "assistant_messages_select_via_session" ON public.assistant_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assistant_sessions s
      WHERE s.id = assistant_messages.session_id AND s.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "assistant_messages_insert_via_session" ON public.assistant_messages;
CREATE POLICY "assistant_messages_insert_via_session" ON public.assistant_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistant_sessions s
      WHERE s.id = assistant_messages.session_id AND s.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "assistant_messages_update_via_session" ON public.assistant_messages;
CREATE POLICY "assistant_messages_update_via_session" ON public.assistant_messages
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_sessions s
      WHERE s.id = assistant_messages.session_id AND s.user_id = (current_setting('app.user_id', true))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistant_sessions s
      WHERE s.id = assistant_messages.session_id AND s.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

DROP POLICY IF EXISTS "assistant_messages_delete_via_session" ON public.assistant_messages;
CREATE POLICY "assistant_messages_delete_via_session" ON public.assistant_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.assistant_sessions s
      WHERE s.id = assistant_messages.session_id AND s.user_id = (current_setting('app.user_id', true))::uuid
    )
  );

-- =============================================================================
-- 6. HELPER: updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS emails_updated_at ON public.emails;
CREATE TRIGGER emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS assistant_sessions_updated_at ON public.assistant_sessions;
CREATE TRIGGER assistant_sessions_updated_at
  BEFORE UPDATE ON public.assistant_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 7. FTS search function (optional convenience)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_emails(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS SETOF public.emails AS $$
  SELECT *
  FROM public.emails
  WHERE user_id = (current_setting('app.user_id', true))::uuid
    AND search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- =============================================================================
-- 8. Vector similarity search function (optional convenience)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_email_chunks_by_embedding(
  p_embedding vector(768),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  email_id UUID,
  chunk_text TEXT,
  similarity FLOAT
) AS $$
  SELECT
    ec.id,
    ec.email_id,
    ec.chunk_text,
    1 - (ec.embedding <=> p_embedding) AS similarity
  FROM public.email_chunks ec
  JOIN public.emails e ON e.id = ec.email_id
  WHERE e.user_id = (current_setting('app.user_id', true))::uuid
    AND ec.embedding IS NOT NULL
    AND 1 - (ec.embedding <=> p_embedding) > p_match_threshold
  ORDER BY ec.embedding <=> p_embedding
  LIMIT p_match_count;
$$ LANGUAGE sql STABLE SECURITY INVOKER;
