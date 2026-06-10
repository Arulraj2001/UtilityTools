-- Phase 4 Monitoring, Observability & Operations Platform
-- Additive-only operational tables. Does not modify ingestion, extraction, review, moderation, or publishing workflows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','suppressed')),
  title TEXT NOT NULL,
  message TEXT,
  fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_monitoring_alerts_active_fingerprint
  ON public.monitoring_alerts (fingerprint)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_time
  ON public.monitoring_alerts (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity
  ON public.monitoring_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type
  ON public.monitoring_alerts (type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status
  ON public.monitoring_alerts (status);

CREATE TABLE IF NOT EXISTS public.monitoring_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_type TEXT NOT NULL DEFAULT 'overview',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_snapshots_time
  ON public.monitoring_metrics_snapshots (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_snapshots_type
  ON public.monitoring_metrics_snapshots (snapshot_type);

CREATE OR REPLACE FUNCTION public.update_monitoring_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monitoring_alerts_updated_at ON public.monitoring_alerts;
CREATE TRIGGER trg_monitoring_alerts_updated_at
  BEFORE UPDATE ON public.monitoring_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_monitoring_alerts_updated_at();

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_metrics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can manage monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Admin users can manage monitoring_alerts"
  ON public.monitoring_alerts
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

DROP POLICY IF EXISTS "Admin users can manage monitoring_metrics_snapshots" ON public.monitoring_metrics_snapshots;
CREATE POLICY "Admin users can manage monitoring_metrics_snapshots"
  ON public.monitoring_metrics_snapshots
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
