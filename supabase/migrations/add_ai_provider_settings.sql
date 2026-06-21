-- ====================================================
-- AI Provider Settings table schema
-- Run this in Supabase SQL Editor if the table was created
-- without the api_key column visible to direct queries.
-- ====================================================

-- Ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name TEXT NOT NULL UNIQUE,
  api_key TEXT DEFAULT '',
  model TEXT DEFAULT '',
  priority INTEGER DEFAULT 99,
  is_active BOOLEAN DEFAULT FALSE,
  base_url TEXT,
  available_models JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{"requests": 0, "successes": 0, "failures": 0, "avg_latency_ms": 0}'::jsonb,
  health_status TEXT DEFAULT 'unknown',
  last_tested TIMESTAMPTZ,
  last_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the api_key column if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_provider_settings' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE ai_provider_settings ADD COLUMN api_key TEXT DEFAULT '';
  END IF;
END $$;

-- Grant proper permissions
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Policy: only authenticated admins can read (but never expose api_key to client directly)
CREATE POLICY "Admins can read ai_provider_settings"
  ON ai_provider_settings
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_admin = true)
  );

-- Policy: only authenticated admins can update
CREATE POLICY "Admins can update ai_provider_settings"
  ON ai_provider_settings
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_admin = true)
  );

-- Policy: only authenticated admins can insert
CREATE POLICY "Admins can insert ai_provider_settings"
  ON ai_provider_settings
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_admin = true)
  );

-- Seed the 7 providers if not already present
INSERT INTO ai_provider_settings (provider_name, model, priority, is_active, base_url)
VALUES
  ('deepseek', 'deepseek-chat', 1, false, 'https://api.deepseek.com/v1'),
  ('gemini', 'gemini-2.0-flash', 2, false, NULL),
  ('openai', 'gpt-4o-mini', 3, false, NULL),
  ('groq', 'llama-3.1-8b-instant', 4, false, NULL),
  ('openrouter', 'meta-llama/llama-3.1-8b-instruct:free', 5, false, NULL),
  ('huggingface', 'mistralai/Mistral-7B-Instruct-v0.2', 6, false, NULL),
  ('cerebras', 'llama-3.3-70b', 7, false, 'https://api.cerebras.ai/v1')
ON CONFLICT (provider_name) DO NOTHING;