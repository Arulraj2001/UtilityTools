-- ============================================================
-- Create structured provider failure log table
-- Additive-only migration: creates table and indexes if missing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_provider_failures (
  id              BIGSERIAL PRIMARY KEY,
  provider_name   TEXT NOT NULL,
  error           TEXT,
  details         JSONB,
  duration_ms     INTEGER,
  occurred_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_failures_provider ON public.ai_provider_failures(provider_name);
CREATE INDEX IF NOT EXISTS idx_ai_provider_failures_occurred_at ON public.ai_provider_failures(occurred_at DESC);

-- End migration
