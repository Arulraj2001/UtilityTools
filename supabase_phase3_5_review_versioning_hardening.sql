-- Phase 3.5 Review Intelligence Versioning Hardening
-- Adds scoring version and draft snapshot tracking for stale-review detection.

ALTER TABLE IF EXISTS public.ai_review_results
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'phase3-scoring-v1',
  ADD COLUMN IF NOT EXISTS draft_snapshot_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_review_results_versions
  ON public.ai_review_results (review_version, scoring_version);

CREATE INDEX IF NOT EXISTS idx_ai_review_results_snapshot_hash
  ON public.ai_review_results (draft_snapshot_hash);
