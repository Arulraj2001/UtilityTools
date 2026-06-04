# Database Audit

Audit date: 2026-06-03

## Actual Database

The system uses Supabase PostgreSQL through `@supabase/supabase-js`.

Client config:

- Browser: `src/api/supabaseClient.js`
- Server/API route: `api/homepage.js`
- Edge Function: `supabase/functions/ai-provider-proxy/index.ts`
- Scripts: `scripts/live-production-validation.mjs`, `scripts/provider-readiness-validation.mjs`, `scripts/monitorProviders.js`

## Live Table Counts

Read through Supabase service API:

| Table | Count |
| --- | ---: |
| `jobs` | 1 |
| `job_categories` | 8 |
| `ai_job_sources` | 8 |
| `ai_research_queue` | 1 |
| `ai_job_drafts` | 2 |
| `ai_duplicate_log` | 0 |
| `ai_monitoring_rules` | 0 |
| `ai_update_queue` | 0 |
| `ai_provider_settings` | 6 |
| `ai_provider_failures` | 53 |
| `ai_generation_usage` | 1 |

## Direct Constraint Inspection

`node scripts/inspect-jobs-constraints.js` could not run because no direct Postgres connection string is configured:

- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `SUPABASE_DATABASE_URL`

This is a gap. Supabase REST/service API verified table accessibility and counts, but not live indexes/constraints.

## Schema Findings From Migrations

`jobs` base schema:

- `id uuid primary key`
- `slug text not null unique`
- `status text default 'draft'`
- JSONB fields for `eligibility`, `selection_process`, `important_dates`, `tags`
- SEO fields including `seo_title`, `seo_description`, `seo_keywords`, `canonical_url`

Existing indexes:

- `idx_jobs_status`
- `idx_jobs_last_date`
- `idx_jobs_featured`
- `idx_job_categories_slug`
- AI table status/created indexes
- provider failure indexes
- generation usage admin/date index

RLS:

- Public can select published jobs.
- Admin users can manage job and AI tables.
- Production hardening revokes broad provider secret readback and grants safe columns.
- Edge Function uses service role for provider secrets and rate-limit state.

## Data Quality Findings

Production `ai_job_sources` rows are configured but not operationally used:

- all `last_checked = null`
- all `items_found = 0`
- all `check_count = 0`

`ai_duplicate_log` is empty, and draft scoring commonly uses `duplicateRisk = 0` because existing jobs are not supplied to `scoreJob()`.

## Query Issues Fixed

Before:

- `getJobs()` accepted `page/pageSize` but ignored them.
- user search text was interpolated directly into a PostgREST `.or()` filter.

After:

- `getJobs()` applies `.range()` when `pageSize` is supplied.
- search text is normalized and stripped of PostgREST `.or()` control characters.
- search limits are capped defensively.

## New Migration Added

Added `supabase_job_intelligence_query_hardening.sql`.

It adds:

- unique non-empty `canonical_url`
- unique non-empty `notification_pdf`
- public listing index on `(status, last_date desc, created_at desc)`
- public category index on `(status, category, last_date desc)`
- source monitoring index on `(is_active, tier, last_checked desc)`

This migration is additive and does not modify the manual job posting UI.

## Database Risks

Critical:

- Direct DB constraint verification is blocked without a connection string.

High:

- No applied unique source URL/PDF duplicate protection was verified in production DB.
- Automated ingestion tables exist but are idle.

Medium:

- `jobs.category` is free text; category slug/name consistency depends on UI discipline.
- Duplicate risk scoring is not consistently connected to existing job records.

## Required Next Steps

1. Apply `supabase_job_intelligence_query_hardening.sql` in Supabase SQL Editor.
2. Configure a read-only `DATABASE_URL` or `SUPABASE_DB_URL` for constraint inspection.
3. Add a production migration ledger or Supabase CLI migration workflow.
4. Add duplicate checks that compare title, organization, canonical URL, notification PDF, and source URL before draft creation.
