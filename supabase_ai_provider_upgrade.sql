-- ============================================================
-- AI Provider Upgrade Migration
-- Run AFTER supabase_ai_jobs_migration.sql
-- Adds: DeepSeek, Cerebras, base_url, health tracking, stats
-- ADDITIVE ONLY — no existing tables or data are modified.
-- ============================================================

-- ── Step 1: Widen the provider_name CHECK constraint ─────────────────────────

ALTER TABLE public.ai_provider_settings
  DROP CONSTRAINT IF EXISTS ai_provider_settings_provider_name_check;

ALTER TABLE public.ai_provider_settings
  ADD CONSTRAINT ai_provider_settings_provider_name_check
  CHECK (provider_name IN ('gemini','openrouter','groq','huggingface','deepseek','cerebras'));

-- ── Step 2: Add new columns (all IF NOT EXISTS, safe to re-run) ──────────────

ALTER TABLE public.ai_provider_settings
  ADD COLUMN IF NOT EXISTS base_url          TEXT             DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS available_models  JSONB            NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_tested       TIMESTAMPTZ      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_latency_ms   INTEGER          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS health_status     TEXT             NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('healthy','degraded','down','unknown')),
  ADD COLUMN IF NOT EXISTS stats             JSONB            NOT NULL DEFAULT
    '{"requests":0,"successes":0,"failures":0,"avg_latency_ms":0,"last_error":null}'::jsonb;

-- ── Step 3: Seed new providers ────────────────────────────────────────────────

INSERT INTO public.ai_provider_settings
  (provider_name, model, priority, is_active, base_url)
VALUES
  ('deepseek',  'deepseek-chat',  5, false, 'https://api.deepseek.com/v1'),
  ('cerebras',  'llama-3.3-70b',  6, false, 'https://api.cerebras.ai/v1')
ON CONFLICT (provider_name) DO NOTHING;

-- ── Step 4: Update priority defaults for all 6 providers ─────────────────────
-- Only sets priority where it is still 0 (unset) to avoid overwriting user changes.

UPDATE public.ai_provider_settings SET priority = 1 WHERE provider_name = 'gemini'      AND priority = 0;
UPDATE public.ai_provider_settings SET priority = 2 WHERE provider_name = 'groq'        AND priority = 0;
UPDATE public.ai_provider_settings SET priority = 3 WHERE provider_name = 'deepseek'    AND priority = 0;
UPDATE public.ai_provider_settings SET priority = 4 WHERE provider_name = 'openrouter'  AND priority = 0;
UPDATE public.ai_provider_settings SET priority = 5 WHERE provider_name = 'cerebras'    AND priority = 0;
UPDATE public.ai_provider_settings SET priority = 6 WHERE provider_name = 'huggingface' AND priority = 0;

-- ── To reverse: ───────────────────────────────────────────────────────────────
-- DELETE FROM public.ai_provider_settings WHERE provider_name IN ('deepseek','cerebras');
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS base_url;
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS available_models;
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS last_tested;
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS last_latency_ms;
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS health_status;
-- ALTER TABLE public.ai_provider_settings DROP COLUMN IF EXISTS stats;
-- ALTER TABLE public.ai_provider_settings DROP CONSTRAINT ai_provider_settings_provider_name_check;
-- ALTER TABLE public.ai_provider_settings ADD CONSTRAINT ai_provider_settings_provider_name_check
--   CHECK (provider_name IN ('gemini','openrouter','groq','huggingface'));
