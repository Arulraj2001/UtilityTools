-- ============================================================
-- Phase 1.5 Job Fetching Hardening
-- Run after supabase_job_fetching_phase1_migration.sql.
-- Recreates raw notification URL uniqueness with whitespace trim.
-- ============================================================

DROP INDEX IF EXISTS public.uq_raw_job_notifications_notification_url;
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_job_notifications_notification_url
  ON public.raw_job_notifications (LOWER(BTRIM(notification_url)))
  WHERE notification_url IS NOT NULL AND BTRIM(notification_url) <> '';

DROP INDEX IF EXISTS public.uq_raw_job_notifications_pdf_url;
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_job_notifications_pdf_url
  ON public.raw_job_notifications (LOWER(BTRIM(pdf_url)))
  WHERE pdf_url IS NOT NULL AND BTRIM(pdf_url) <> '';
