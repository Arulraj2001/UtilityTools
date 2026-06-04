-- ============================================================
-- Job Intelligence Query and Duplicate Hardening
-- Run in Supabase SQL Editor after the core jobs migrations.
-- Additive only: does not alter manual job posting UI behavior.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_canonical_url_unique_nonempty
  ON public.jobs (canonical_url)
  WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_notification_pdf_unique_nonempty
  ON public.jobs (notification_pdf)
  WHERE notification_pdf IS NOT NULL AND btrim(notification_pdf) <> '';

CREATE INDEX IF NOT EXISTS idx_jobs_public_listing
  ON public.jobs (status, last_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_public_category
  ON public.jobs (status, category, last_date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_sources_active_tier_checked
  ON public.ai_job_sources (is_active, tier, last_checked DESC);
