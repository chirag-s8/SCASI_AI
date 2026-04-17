-- =============================================================================
-- 006: Persistent LLM cache for embeddings
-- Stores embedding vectors so they survive server restarts.
-- Only embedding keys (emb:*) are persisted here — all other cache entries
-- remain in-memory only (search results, generation results).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.llm_cache (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup by expiry for cleanup
CREATE INDEX IF NOT EXISTS idx_llm_cache_expires_at
  ON public.llm_cache (expires_at);

-- Auto-delete expired rows (runs via pg_cron if enabled, otherwise manual cleanup)
-- Rows are also checked on read and skipped if expired.

-- No RLS needed — this table is only accessed via service role key (server-side).
