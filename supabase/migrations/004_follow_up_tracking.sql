-- =============================================================================
-- 004: Follow-up tracking table
-- Stores emails where the user is waiting for a response.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_id      UUID REFERENCES public.emails(id) ON DELETE SET NULL,
  gmail_id      TEXT,
  subject       TEXT,
  recipient     TEXT,
  signal        TEXT,           -- the follow-up phrase detected
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | resolved | dismissed
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id   ON public.follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status     ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_detected   ON public.follow_ups(detected_at DESC);

-- RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own follow-ups" ON public.follow_ups;

CREATE POLICY "Users can manage their own follow-ups"
  ON public.follow_ups
  FOR ALL
  USING (user_id = (current_setting('app.user_id', true))::uuid)
  WITH CHECK (user_id = (current_setting('app.user_id', true))::uuid);
