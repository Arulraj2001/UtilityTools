-- ============================================================
-- Production Hardening Migration
-- Run in Supabase SQL Editor after the AI job migrations.
-- ============================================================

-- Server-side AI rate limiting.
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generation_count INTEGER NOT NULL DEFAULT 0,
  provider_test_count INTEGER NOT NULL DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  last_provider_test_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_usage_admin_date
  ON public.ai_generation_usage (admin_id, usage_date DESC);

ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ai_generation_usage_own_select" ON public.ai_generation_usage;
CREATE POLICY "admin_ai_generation_usage_own_select"
  ON public.ai_generation_usage
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "admin_ai_generation_usage_service_only" ON public.ai_generation_usage;
CREATE POLICY "admin_ai_generation_usage_service_only"
  ON public.ai_generation_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Prevent browser/PostgREST readback of saved provider secrets.
-- Provider calls and secret writes now go through the Edge Function using service_role.
REVOKE SELECT ON public.ai_provider_settings FROM anon, authenticated;
GRANT SELECT (
  id,
  provider_name,
  model,
  priority,
  is_active,
  base_url,
  available_models,
  stats,
  health_status,
  last_tested,
  last_latency_ms,
  updated_at
) ON public.ai_provider_settings TO authenticated;

REVOKE UPDATE ON public.ai_provider_settings FROM authenticated;
GRANT UPDATE (
  model,
  priority,
  is_active,
  base_url,
  available_models,
  stats,
  health_status,
  last_tested,
  last_latency_ms,
  updated_at
) ON public.ai_provider_settings TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.ai_generation_usage TO service_role;
