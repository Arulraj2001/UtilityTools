-- ============================================================
-- Phase 1 Automated Job Fetching Migration
-- Additive migration for the AI Job Intelligence ingestion layer.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Per-source fetch run logs.
CREATE TABLE IF NOT EXISTS public.job_fetch_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES public.ai_job_sources(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','partial','failed','skipped')),
  items_found INTEGER NOT NULL DEFAULT 0,
  items_saved INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_job_fetch_logs_source_started
  ON public.job_fetch_logs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_fetch_logs_status_started
  ON public.job_fetch_logs (status, started_at DESC);

-- Raw official notifications discovered before AI drafting.
CREATE TABLE IF NOT EXISTS public.raw_job_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES public.ai_job_sources(id) ON DELETE SET NULL,
  source_name TEXT,
  notification_url TEXT,
  pdf_url TEXT,
  title TEXT,
  organization TEXT,
  raw_html TEXT,
  raw_text TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','queued','duplicate','ignored','failed','processed')),
  published_date DATE,
  last_date DATE,
  queue_item_id UUID REFERENCES public.ai_research_queue(id) ON DELETE SET NULL,
  duplicate_of UUID REFERENCES public.raw_job_notifications(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_job_notifications_source_fetched
  ON public.raw_job_notifications (source_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_job_notifications_status_fetched
  ON public.raw_job_notifications (status, fetched_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_job_notifications_hash
  ON public.raw_job_notifications (hash);
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_job_notifications_notification_url
  ON public.raw_job_notifications (LOWER(BTRIM(notification_url)))
  WHERE notification_url IS NOT NULL AND BTRIM(notification_url) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_job_notifications_pdf_url
  ON public.raw_job_notifications (LOWER(BTRIM(pdf_url)))
  WHERE pdf_url IS NOT NULL AND BTRIM(pdf_url) <> '';

-- Fetch failures that are useful for admin triage and alerting.
CREATE TABLE IF NOT EXISTS public.fetch_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES public.ai_job_sources(id) ON DELETE SET NULL,
  url TEXT,
  error_message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fetch_failures_source_created
  ON public.fetch_failures (source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fetch_failures_created
  ON public.fetch_failures (created_at DESC);

-- Explicit duplicate events. Raw duplicates are not inserted again.
CREATE TABLE IF NOT EXISTS public.job_fetch_duplicates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES public.ai_job_sources(id) ON DELETE SET NULL,
  raw_notification_id UUID REFERENCES public.raw_job_notifications(id) ON DELETE SET NULL,
  notification_url TEXT,
  pdf_url TEXT,
  hash TEXT,
  matched_table TEXT,
  matched_id TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_fetch_duplicates_source_created
  ON public.job_fetch_duplicates (source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_fetch_duplicates_hash
  ON public.job_fetch_duplicates (hash);

-- Rollup metrics used by the fetch health service.
CREATE TABLE IF NOT EXISTS public.job_fetch_source_metrics (
  source_id UUID PRIMARY KEY REFERENCES public.ai_job_sources(id) ON DELETE CASCADE,
  last_status TEXT,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  total_runs INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  total_items_found INTEGER NOT NULL DEFAULT 0,
  total_items_saved INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_fetch_source_metrics_status
  ON public.job_fetch_source_metrics (last_status);
CREATE INDEX IF NOT EXISTS idx_job_fetch_source_metrics_updated
  ON public.job_fetch_source_metrics (updated_at DESC);

-- Seed TNPSC because Phase 1 includes a first-class TNPSC adapter.
INSERT INTO public.ai_job_sources (name, url, tier, category, description)
SELECT
  'TNPSC Official',
  'https://www.tnpsc.gov.in',
  1,
  'government',
  'Tamil Nadu Public Service Commission official portal'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ai_job_sources
  WHERE LOWER(name) LIKE '%tnpsc%'
     OR LOWER(url) LIKE '%tnpsc.gov.in%'
);

ALTER TABLE IF EXISTS public.job_fetch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raw_job_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fetch_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_fetch_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_fetch_source_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can manage job_fetch_logs" ON public.job_fetch_logs;
DROP POLICY IF EXISTS "Admin users can manage raw_job_notifications" ON public.raw_job_notifications;
DROP POLICY IF EXISTS "Admin users can manage fetch_failures" ON public.fetch_failures;
DROP POLICY IF EXISTS "Admin users can manage job_fetch_duplicates" ON public.job_fetch_duplicates;
DROP POLICY IF EXISTS "Admin users can manage job_fetch_source_metrics" ON public.job_fetch_source_metrics;

CREATE POLICY "Admin users can manage job_fetch_logs"
  ON public.job_fetch_logs
  FOR ALL
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

CREATE POLICY "Admin users can manage raw_job_notifications"
  ON public.raw_job_notifications
  FOR ALL
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

CREATE POLICY "Admin users can manage fetch_failures"
  ON public.fetch_failures
  FOR ALL
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

CREATE POLICY "Admin users can manage job_fetch_duplicates"
  ON public.job_fetch_duplicates
  FOR ALL
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

CREATE POLICY "Admin users can manage job_fetch_source_metrics"
  ON public.job_fetch_source_metrics
  FOR ALL
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
