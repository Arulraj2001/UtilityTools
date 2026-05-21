-- Migration: create job_categories table
-- Run this against your Supabase/Postgres instance to create job_categories

CREATE TABLE IF NOT EXISTS job_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'briefcase',
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_job_categories_slug ON job_categories (slug);
