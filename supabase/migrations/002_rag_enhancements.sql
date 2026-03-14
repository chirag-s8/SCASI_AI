-- =============================================================================
-- 002: RAG Pipeline Enhancements
-- Adds chunk_type to email_chunks and ingest_status to emails
-- =============================================================================

-- Add chunk_type to email_chunks
ALTER TABLE public.email_chunks
  ADD COLUMN IF NOT EXISTS chunk_type TEXT DEFAULT 'body';

CREATE INDEX IF NOT EXISTS idx_email_chunks_type
  ON public.email_chunks(chunk_type);

-- Add ingest_status to emails
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS ingest_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_emails_ingest_status
  ON public.emails(ingest_status);

-- Hybrid search function: vector + FTS on email_chunks
CREATE OR REPLACE FUNCTION public.hybrid_search_chunks(
  p_user_id UUID,
  p_query_embedding vector(768),
  p_query_text TEXT,
  p_match_count INT DEFAULT 20,
  p_vector_weight FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  email_id UUID,
  chunk_text TEXT,
  chunk_type TEXT,
  chunk_index INT,
  vector_score FLOAT,
  fts_score FLOAT,
  combined_score FLOAT
) AS $$
WITH vector_results AS (
  SELECT
    ec.id AS chunk_id,
    ec.email_id,
    ec.chunk_text,
    ec.chunk_type,
    ec.chunk_index,
    1 - (ec.embedding <=> p_query_embedding) AS score,
    ROW_NUMBER() OVER (ORDER BY ec.embedding <=> p_query_embedding) AS rank
  FROM public.email_chunks ec
  JOIN public.emails e ON e.id = ec.email_id
  WHERE e.user_id = p_user_id
    AND ec.embedding IS NOT NULL
  ORDER BY ec.embedding <=> p_query_embedding
  LIMIT p_match_count * 2
),
fts_results AS (
  SELECT
    ec.id AS chunk_id,
    ec.email_id,
    ec.chunk_text,
    ec.chunk_type,
    ec.chunk_index,
    ts_rank(ec.chunk_search_vector, plainto_tsquery('english', p_query_text)) AS score,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank(ec.chunk_search_vector, plainto_tsquery('english', p_query_text)) DESC
    ) AS rank
  FROM public.email_chunks ec
  JOIN public.emails e ON e.id = ec.email_id
  WHERE e.user_id = p_user_id
    AND ec.chunk_search_vector @@ plainto_tsquery('english', p_query_text)
  ORDER BY score DESC
  LIMIT p_match_count * 2
),
combined AS (
  SELECT
    COALESCE(v.chunk_id, f.chunk_id) AS chunk_id,
    COALESCE(v.email_id, f.email_id) AS email_id,
    COALESCE(v.chunk_text, f.chunk_text) AS chunk_text,
    COALESCE(v.chunk_type, f.chunk_type) AS chunk_type,
    COALESCE(v.chunk_index, f.chunk_index) AS chunk_index,
    COALESCE(v.score, 0) AS vector_score,
    COALESCE(f.score, 0) AS fts_score,
    p_vector_weight * COALESCE(1.0 / (60 + v.rank), 0) +
    (1.0 - p_vector_weight) * COALESCE(1.0 / (60 + f.rank), 0) AS combined_score
  FROM vector_results v
  FULL OUTER JOIN fts_results f ON v.chunk_id = f.chunk_id
)
SELECT * FROM combined
ORDER BY combined_score DESC
LIMIT p_match_count;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- =============================================================================
-- Fix FK constraints to point explicitly to public.users and not auth.users
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'emails_user_id_fkey' AND table_name = 'emails'
  ) THEN
    ALTER TABLE public.emails DROP CONSTRAINT emails_user_id_fkey;
  END IF;
  
  ALTER TABLE public.emails
    ADD CONSTRAINT emails_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;
