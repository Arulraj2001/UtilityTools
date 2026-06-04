# Migration Validation

Validation date: 2026-06-04

## Files Reviewed

- `supabase_job_fetching_phase1_migration.sql`
- `supabase_job_fetching_phase1_5_hardening.sql`

## Live Table Checks

Checked through Supabase service-role PostgREST.

| Object | Result |
| --- | --- |
| `job_fetch_logs` | Exists, readable, count 19 |
| `raw_job_notifications` | Exists, readable, count 6 |
| `fetch_failures` | Exists, readable, count 6 after validation probes |
| `job_fetch_duplicates` | Exists, readable, count 6 |
| `job_fetch_source_metrics` | Exists, readable, count 9 |
| `ai_job_sources` | Exists, readable, count 9 |
| `ai_research_queue` | Exists, readable, count 6 |

## Static SQL Validation

Confirmed in migration SQL:

- Primary keys on all new tables.
- FK links to `ai_job_sources`, `ai_research_queue`, and self-reference for duplicate raw notifications.
- Status check constraints on `job_fetch_logs.status` and `raw_job_notifications.status`.
- Required unique duplicate protection on raw notification `hash`.
- URL/PDF unique protections exist.
- Fetch log, failure, duplicate, raw notification, and metrics indexes exist.
- RLS is enabled for all new tables.
- Admin-only policies use `public.admin_users` and `auth.uid()`.

## Fix Applied

The original raw URL/PDF unique indexes did not trim whitespace. Fixed in:

- `supabase_job_fetching_phase1_migration.sql`
- `supabase_job_fetching_phase1_5_hardening.sql`

The Phase 1.5 hardening SQL recreates:

- `uq_raw_job_notifications_notification_url`
- `uq_raw_job_notifications_pdf_url`

## Limitations

Catalog views (`pg_indexes`, `pg_policies`, `information_schema.tables`) are not exposed through PostgREST, and no direct Postgres connection string is configured. Therefore index definitions and RLS policy definitions were validated statically from SQL, while behavior was validated through live CRUD and duplicate probes.

## Verdict

Partially verified.

Tables and runtime behavior exist in production, but catalog-level verification is blocked without direct DB access.
