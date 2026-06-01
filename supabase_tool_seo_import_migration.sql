-- ============================================================
-- Tool SEO Import History Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This is ADDITIVE and does not modify existing tool records.
-- ============================================================

-- To reverse:
--   DROP TABLE IF EXISTS public.tool_seo_import_history;

CREATE TABLE IF NOT EXISTS public.tool_seo_import_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name      TEXT,
  import_type    TEXT CHECK (import_type IN ('xlsx', 'csv', 'json', 'html', 'zip')),
  rows_processed INTEGER NOT NULL DEFAULT 0,
  rows_updated   INTEGER NOT NULL DEFAULT 0,
  rows_failed    INTEGER NOT NULL DEFAULT 0,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
  options        JSONB NOT NULL DEFAULT '{}'::jsonb,
  rollback_data  JSONB NOT NULL DEFAULT '[]'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed','rolled_back','dry_run')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_seo_import_history_created_at
  ON public.tool_seo_import_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_seo_import_history_status
  ON public.tool_seo_import_history (status);

CREATE INDEX IF NOT EXISTS idx_tool_seo_import_history_user_id
  ON public.tool_seo_import_history (user_id);

ALTER TABLE public.tool_seo_import_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tool_seo_import_history'
    AND policyname = 'admin_tool_seo_import_history_all'
  ) THEN
    CREATE POLICY "admin_tool_seo_import_history_all"
      ON public.tool_seo_import_history
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
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_tool_seo_import_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tool_seo_import_history_updated_at ON public.tool_seo_import_history;
CREATE TRIGGER trg_tool_seo_import_history_updated_at
  BEFORE UPDATE ON public.tool_seo_import_history
  FOR EACH ROW EXECUTE FUNCTION update_tool_seo_import_history_updated_at();
