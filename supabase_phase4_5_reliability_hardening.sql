-- Phase 4.5 Reliability, Recovery & Scale Hardening
-- Additive-only guards for restart/idempotency behavior.

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_job_drafts_queue_item_id_nonnull
  ON public.ai_job_drafts (queue_item_id)
  WHERE queue_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_ai_draft_id_nonnull
  ON public.jobs (ai_draft_id)
  WHERE ai_draft_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_review_results_active_draft
  ON public.ai_review_results (draft_id)
  WHERE is_stale = false;

CREATE INDEX IF NOT EXISTS idx_ai_research_queue_processing_updated
  ON public.ai_research_queue (status, updated_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_ai_research_queue_pending_priority_created
  ON public.ai_research_queue (status, priority DESC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_queue_item_created
  ON public.ai_job_drafts (queue_item_id, created_at DESC)
  WHERE queue_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_ai_draft_created
  ON public.jobs (ai_draft_id, created_at DESC)
  WHERE ai_draft_id IS NOT NULL;
