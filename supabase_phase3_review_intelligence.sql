-- Phase 3 Review Intelligence + Moderation System
-- Downstream-only migration: starts after ai_job_drafts.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ai_review_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES public.ai_job_drafts(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.ai_research_queue(id) ON DELETE SET NULL,
  raw_notification_id UUID REFERENCES public.raw_job_notifications(id) ON DELETE SET NULL,
  publish_readiness NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (publish_readiness >= 0 AND publish_readiness <= 100),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  decision_band TEXT NOT NULL CHECK (decision_band IN ('recommended_publish','review_recommended','manual_review_required','blocked')),
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  tag_suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_version TEXT NOT NULL DEFAULT 'phase3-review-v1',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_review_results_decision_band
  ON public.ai_review_results (decision_band);
CREATE INDEX IF NOT EXISTS idx_ai_review_results_publish_readiness
  ON public.ai_review_results (publish_readiness DESC);
CREATE INDEX IF NOT EXISTS idx_ai_review_results_confidence
  ON public.ai_review_results (confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ai_review_results_draft_id
  ON public.ai_review_results (draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_results_queue_item_id
  ON public.ai_review_results (queue_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_review_results_active
  ON public.ai_review_results (draft_id, is_stale, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_fact_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES public.ai_job_drafts(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.ai_research_queue(id) ON DELETE SET NULL,
  raw_notification_id UUID REFERENCES public.raw_job_notifications(id) ON DELETE SET NULL,
  verification_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (verification_score >= 0 AND verification_score <= 100),
  source_confidence NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (source_confidence >= 0 AND source_confidence <= 100),
  field_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocking_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_version TEXT NOT NULL DEFAULT 'phase3-verification-v1',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_fact_verifications_draft_id
  ON public.ai_fact_verifications (draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_fact_verifications_score
  ON public.ai_fact_verifications (verification_score);
CREATE INDEX IF NOT EXISTS idx_ai_fact_verifications_source_confidence
  ON public.ai_fact_verifications (source_confidence);
CREATE INDEX IF NOT EXISTS idx_ai_fact_verifications_latest
  ON public.ai_fact_verifications (draft_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID REFERENCES public.ai_job_drafts(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'approve',
    'reject',
    'needs_revision',
    'edit',
    'bulk_approve',
    'bulk_reject',
    'convert_to_draft',
    'publish',
    'override_blocker',
    'run_review'
  )),
  reason_code TEXT,
  notes TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_moderation_actions_draft_id
  ON public.ai_moderation_actions (draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_actions_job_id
  ON public.ai_moderation_actions (job_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_actions_admin_id
  ON public.ai_moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_actions_action
  ON public.ai_moderation_actions (action);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_actions_created
  ON public.ai_moderation_actions (created_at DESC);

ALTER TABLE IF EXISTS public.ai_job_drafts
  ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS latest_review_id UUID REFERENCES public.ai_review_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS latest_verification_id UUID REFERENCES public.ai_fact_verifications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_readiness_score
  ON public.ai_job_drafts (readiness_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_confidence_score
  ON public.ai_job_drafts (confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_latest_review
  ON public.ai_job_drafts (latest_review_id);
CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_latest_verification
  ON public.ai_job_drafts (latest_verification_id);

ALTER TABLE IF EXISTS public.jobs
  ADD COLUMN IF NOT EXISTS ai_draft_id UUID REFERENCES public.ai_job_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_raw_notification_id UUID REFERENCES public.raw_job_notifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_ai_draft_id
  ON public.jobs (ai_draft_id);
CREATE INDEX IF NOT EXISTS idx_jobs_source_raw_notification_id
  ON public.jobs (source_raw_notification_id);
CREATE INDEX IF NOT EXISTS idx_jobs_published_by
  ON public.jobs (published_by);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at
  ON public.jobs (published_at DESC);

CREATE OR REPLACE FUNCTION public.update_phase3_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_review_results_updated_at ON public.ai_review_results;
CREATE TRIGGER trg_ai_review_results_updated_at
  BEFORE UPDATE ON public.ai_review_results
  FOR EACH ROW EXECUTE FUNCTION public.update_phase3_updated_at();

DROP TRIGGER IF EXISTS trg_ai_fact_verifications_updated_at ON public.ai_fact_verifications;
CREATE TRIGGER trg_ai_fact_verifications_updated_at
  BEFORE UPDATE ON public.ai_fact_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_phase3_updated_at();

ALTER TABLE public.ai_review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_fact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can manage ai_review_results" ON public.ai_review_results;
CREATE POLICY "Admin users can manage ai_review_results"
  ON public.ai_review_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin users can manage ai_fact_verifications" ON public.ai_fact_verifications;
CREATE POLICY "Admin users can manage ai_fact_verifications"
  ON public.ai_fact_verifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin users can manage ai_moderation_actions" ON public.ai_moderation_actions;
CREATE POLICY "Admin users can manage ai_moderation_actions"
  ON public.ai_moderation_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_admin = true
    )
  );
