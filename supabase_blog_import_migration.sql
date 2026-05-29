-- ============================================================
-- Blog Import History Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This is ADDITIVE — it does NOT modify any existing tables.
-- ============================================================

-- To REVERSE this migration:
--   DROP TABLE IF EXISTS public.blog_import_history;

CREATE TABLE IF NOT EXISTS public.blog_import_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename     TEXT,
  file_type    TEXT CHECK (file_type IN ('xlsx', 'csv', 'json', 'html')),
  total_rows   INTEGER NOT NULL DEFAULT 0,
  imported     INTEGER NOT NULL DEFAULT 0,
  updated      INTEGER NOT NULL DEFAULT 0,
  skipped      INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  errors       JSONB    NOT NULL DEFAULT '[]'::jsonb,
  options      JSONB    NOT NULL DEFAULT '{}'::jsonb,
  imported_ids UUID[]   NOT NULL DEFAULT '{}',
  status       TEXT     NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','completed','failed','rolled_back')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_blog_import_history_created_at
  ON public.blog_import_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_import_history_status
  ON public.blog_import_history (status);

-- Enable RLS
ALTER TABLE public.blog_import_history ENABLE ROW LEVEL SECURITY;

-- Admin-only policy (matches the pattern used by blog_posts admin policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_import_history'
    AND policyname = 'admin_import_history_all'
  ) THEN
    CREATE POLICY "admin_import_history_all"
      ON public.blog_import_history
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

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_blog_import_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_import_history_updated_at ON public.blog_import_history;
CREATE TRIGGER trg_blog_import_history_updated_at
  BEFORE UPDATE ON public.blog_import_history
  FOR EACH ROW EXECUTE FUNCTION update_blog_import_history_updated_at();
