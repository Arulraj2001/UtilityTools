-- ============================================================
-- AI Job Intelligence System — Database Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ADDITIVE ONLY: zero changes to any existing table.
-- ============================================================
-- To REVERSE: drop each table in reverse order (see bottom).
-- ============================================================

-- ─── 1. AI Provider Settings ─────────────────────────────────────────────────
-- Stores API keys and configuration for each AI provider.
-- Admin-only via RLS.

CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name TEXT NOT NULL CHECK (provider_name IN ('gemini','openrouter','groq','huggingface')),
  api_key       TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  priority      INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_name)
);

INSERT INTO public.ai_provider_settings (provider_name, model, priority, is_active) VALUES
  ('gemini',      'gemini-1.5-flash',                        1, false),
  ('openrouter',  'mistralai/mistral-7b-instruct:free',       2, false),
  ('groq',        'llama3-8b-8192',                          3, false),
  ('huggingface', 'mistralai/Mistral-7B-Instruct-v0.1',      4, false)
ON CONFLICT (provider_name) DO NOTHING;

-- ─── 2. AI Prompts ────────────────────────────────────────────────────────────
-- Editable prompts per job type. Admins can tune without touching code.

CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type      TEXT NOT NULL,   -- 'government','bank','railway','it','remote','freshers','private'
  name          TEXT NOT NULL,
  prompt_text   TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_type)
);

INSERT INTO public.ai_prompts (job_type, name, prompt_text) VALUES
  ('government', 'Government Job Prompt',
   'You are an expert government job content writer for Indian recruitment portals. Write accurate, factual content about government job notifications. Focus on official details, eligibility criteria, and application process. Use clear, professional language.'),
  ('bank',       'Bank Job Prompt',
   'You are an expert writer for banking sector recruitment. Write detailed content about bank job notifications including IBPS, SBI, RBI, and other banking organizations. Be precise about CWE scores, cutoffs, and selection processes.'),
  ('railway',    'Railway Job Prompt',
   'You are an expert writer for Indian Railways recruitment notifications. Cover RRB, RRC, IRCTC and other railway organizations. Be accurate about zone-specific vacancies, trade apprentices, and CBT exam details.'),
  ('it',         'IT Job Prompt',
   'You are an expert writer for IT sector recruitment. Cover software companies, tech startups, and government IT roles. Include technology stack requirements, remote work options, and compensation details accurately.'),
  ('remote',     'Remote Job Prompt',
   'You are an expert writer for remote work opportunities. Cover work-from-home jobs across sectors. Include time zone requirements, tools needed, and payment terms clearly.'),
  ('freshers',   'Freshers Job Prompt',
   'You are an expert writer for fresher/entry-level job opportunities. Target recent graduates and 0-2 year experience candidates. Emphasize training programs, growth opportunities, and skill requirements.'),
  ('private',    'Private Sector Job Prompt',
   'You are an expert writer for private sector recruitment. Cover MNCs, startups, and established companies. Include industry context, company background, and career growth potential factually.')
ON CONFLICT (job_type) DO NOTHING;

-- ─── 3. AI Job Sources ────────────────────────────────────────────────────────
-- Source URLs to monitor for new job notifications.

CREATE TABLE IF NOT EXISTS public.ai_job_sources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  tier          INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  category      TEXT,    -- 'government','bank','railway','it','remote' etc.
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_checked  TIMESTAMPTZ,
  check_count   INTEGER NOT NULL DEFAULT 0,
  items_found   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_job_sources_tier     ON public.ai_job_sources (tier);
CREATE INDEX IF NOT EXISTS idx_ai_job_sources_active   ON public.ai_job_sources (is_active);

-- Seed common Tier 1 sources
INSERT INTO public.ai_job_sources (name, url, tier, category, description) VALUES
  ('SSC Official',          'https://ssc.nic.in',            1, 'government', 'Staff Selection Commission official portal'),
  ('UPSC Official',         'https://upsc.gov.in',           1, 'government', 'Union Public Service Commission'),
  ('IBPS Official',         'https://ibps.in',               1, 'bank',       'Institute of Banking Personnel Selection'),
  ('SBI Careers',           'https://sbi.co.in/careers',     1, 'bank',       'State Bank of India careers'),
  ('RRB Official',          'https://indianrailways.gov.in', 1, 'railway',    'Railway Recruitment Board'),
  ('NHM Official',          'https://nhm.gov.in',            1, 'government', 'National Health Mission'),
  ('DRDO Official',         'https://drdo.gov.in',           1, 'government', 'Defence Research & Development Organisation'),
  ('ISRO Official',         'https://isro.gov.in',           1, 'government', 'Indian Space Research Organisation')
ON CONFLICT DO NOTHING;

-- ─── 4. AI Research Queue ─────────────────────────────────────────────────────
-- Jobs discovered/entered by admin. Never auto-published.

CREATE TABLE IF NOT EXISTS public.ai_research_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT,
  organization    TEXT,
  source_url      TEXT,
  source_id       UUID REFERENCES public.ai_job_sources(id) ON DELETE SET NULL,
  raw_input       TEXT,          -- Pasted notification text or extracted content
  job_type        TEXT DEFAULT 'government',
  extracted_data  JSONB DEFAULT '{}'::jsonb,
  duplicate_check JSONB DEFAULT '{}'::jsonb,   -- {risk_score, matched_jobs[]}
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','drafted','rejected','saved_later')),
  priority        INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_research_queue_status     ON public.ai_research_queue (status);
CREATE INDEX IF NOT EXISTS idx_ai_research_queue_created_at ON public.ai_research_queue (created_at DESC);

-- ─── 5. AI Job Drafts ─────────────────────────────────────────────────────────
-- AI-generated job content awaiting human review and moderation.

CREATE TABLE IF NOT EXISTS public.ai_job_drafts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_item_id   UUID REFERENCES public.ai_research_queue(id) ON DELETE SET NULL,
  job_type        TEXT DEFAULT 'government',
  ai_provider     TEXT,          -- Which provider generated this
  prompt_id       UUID REFERENCES public.ai_prompts(id) ON DELETE SET NULL,
  generated_data  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Full job fields
  quality_scores  JSONB DEFAULT '{}'::jsonb,           -- Content/SEO/EEAT/Adsense/Spam/Freshness
  status          TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review','approved','rejected','published','needs_revision')),
  admin_notes     TEXT,
  tokens_used     INTEGER DEFAULT 0,
  generation_ms   INTEGER DEFAULT 0,   -- Time to generate
  published_job_id UUID,               -- Set when converted to actual job
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_status     ON public.ai_job_drafts (status);
CREATE INDEX IF NOT EXISTS idx_ai_job_drafts_created_at ON public.ai_job_drafts (created_at DESC);

-- ─── 6. AI Duplicate Detection Log ───────────────────────────────────────────
-- Records of duplicate checks with match details.

CREATE TABLE IF NOT EXISTS public.ai_duplicate_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_item_id UUID REFERENCES public.ai_research_queue(id) ON DELETE CASCADE,
  draft_id      UUID REFERENCES public.ai_job_drafts(id) ON DELETE CASCADE,
  check_type    TEXT NOT NULL CHECK (check_type IN ('title','organization','content','url')),
  matched_job_id UUID,              -- Existing job that matched
  similarity    NUMERIC(5,2),       -- 0-100 similarity score
  is_duplicate  BOOLEAN DEFAULT false,
  details       JSONB DEFAULT '{}'::jsonb,
  resolved      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_duplicate_log_resolved ON public.ai_duplicate_log (resolved);

-- ─── 7. AI Monitoring Rules ───────────────────────────────────────────────────
-- Track specific job postings for updates / vacancy changes.

CREATE TABLE IF NOT EXISTS public.ai_monitoring_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID,              -- Existing job to monitor (optional)
  source_url      TEXT,              -- Page to monitor
  title           TEXT NOT NULL,
  organization    TEXT,
  last_content    TEXT,             -- Last known content snapshot
  last_checked    TIMESTAMPTZ,
  check_frequency TEXT DEFAULT 'manual' CHECK (check_frequency IN ('manual','daily','weekly')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  changes_found   INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_monitoring_active ON public.ai_monitoring_rules (is_active);

-- ─── 8. AI Update Queue ───────────────────────────────────────────────────────
-- Detected changes to monitored jobs, awaiting admin review.

CREATE TABLE IF NOT EXISTS public.ai_update_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitoring_id   UUID REFERENCES public.ai_monitoring_rules(id) ON DELETE CASCADE,
  job_id          UUID,              -- Related existing job (if any)
  change_type     TEXT CHECK (change_type IN ('vacancy_update','date_change','eligibility_change','salary_revision','status_change','new_notification')),
  previous_data   JSONB DEFAULT '{}'::jsonb,
  new_data        JSONB DEFAULT '{}'::jsonb,
  diff_summary    TEXT,
  ai_analysis     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','applied')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_update_queue_status     ON public.ai_update_queue (status);
CREATE INDEX IF NOT EXISTS idx_ai_update_queue_created_at ON public.ai_update_queue (created_at DESC);

-- ─── RLS Policies (admin-only for all AI tables) ──────────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_provider_settings',
    'ai_prompts',
    'ai_job_sources',
    'ai_research_queue',
    'ai_job_drafts',
    'ai_duplicate_log',
    'ai_monitoring_rules',
    'ai_update_queue'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop if exists, then recreate
    EXECUTE format('DROP POLICY IF EXISTS "admin_ai_%s_all" ON public.%I', tbl, tbl);
    EXECUTE format($pol$
      CREATE POLICY "admin_ai_%s_all"
        ON public.%I
        FOR ALL
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_admin = true)
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_admin = true)
        )
    $pol$, tbl, tbl);
  END LOOP;
END $$;

-- ─── Auto-update triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_ai_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_provider_settings','ai_prompts','ai_job_sources',
    'ai_research_queue','ai_job_drafts','ai_monitoring_rules','ai_update_queue'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', tbl, tbl);
    EXECUTE format($t$
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION update_ai_table_updated_at()
    $t$, tbl, tbl);
  END LOOP;
END $$;

-- ─── To reverse this migration ───────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.ai_update_queue;
-- DROP TABLE IF EXISTS public.ai_monitoring_rules;
-- DROP TABLE IF EXISTS public.ai_duplicate_log;
-- DROP TABLE IF EXISTS public.ai_job_drafts;
-- DROP TABLE IF EXISTS public.ai_research_queue;
-- DROP TABLE IF EXISTS public.ai_job_sources;
-- DROP TABLE IF EXISTS public.ai_prompts;
-- DROP TABLE IF EXISTS public.ai_provider_settings;
-- DROP FUNCTION IF EXISTS update_ai_table_updated_at();
