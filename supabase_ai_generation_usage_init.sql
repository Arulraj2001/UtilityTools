-- ============================================================
-- Create ai_generation_usage table
-- Additive-only migration: creates table and RLS policies if missing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id            UUID NOT NULL,
  usage_date          DATE NOT NULL,
  generation_count    INTEGER NOT NULL DEFAULT 0,
  provider_test_count INTEGER NOT NULL DEFAULT 0,
  last_generation_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (admin_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;

-- Drop if exists, then recreate
DROP POLICY IF EXISTS "admin_ai_generation_usage_all" ON public.ai_generation_usage;
CREATE POLICY "admin_ai_generation_usage_all"
  ON public.ai_generation_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_admin = true)
  );

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_ai_generation_usage_updated_at ON public.ai_generation_usage;
CREATE TRIGGER trg_ai_generation_usage_updated_at
  BEFORE UPDATE ON public.ai_generation_usage
  FOR EACH ROW EXECUTE FUNCTION update_ai_table_updated_at();

-- End migration
