-- Migration: add SEO and intro content fields to job_categories table
-- Run this against your Supabase/Postgres instance to update the job_categories schema

alter table if exists job_categories add column if not exists seo_title text;
alter table if exists job_categories add column if not exists seo_description text;
alter table if exists job_categories add column if not exists seo_keywords text;
alter table if exists job_categories add column if not exists canonical_url text;
alter table if exists job_categories add column if not exists og_image text;
alter table if exists job_categories add column if not exists intro_content text;
