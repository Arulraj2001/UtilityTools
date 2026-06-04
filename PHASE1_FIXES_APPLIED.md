# Phase 1.5 Fixes Applied

Validation date: 2026-06-04

## Fix 1

File:

- `api/_lib/fetchApi.js`

Issue:

- Supabase client creation failed on Node 20 without native WebSocket support.

Fix:

- Imported `ws`.
- Passed `realtime: { transport: ws }` to the service-role Supabase client.

Reason:

- Required for production/serverless endpoint execution on this runtime.

## Fix 2

Files:

- `supabase_job_fetching_phase1_migration.sql`
- `supabase_job_fetching_phase1_5_hardening.sql`

Issue:

- Raw notification URL/PDF unique indexes did not trim whitespace, allowing potential duplicate bypasses with leading/trailing spaces.

Fix:

- Changed unique index expressions to `LOWER(BTRIM(...))`.
- Added Phase 1.5 hardening SQL to recreate indexes for already-migrated databases.

Reason:

- Strengthens duplicate protection before production cron is enabled.

## Fix 3

File:

- `src/jobs/fetchers/officialNotificationParser.js`

Issue:

- PDF URLs shaped like `.pdf/...` were not detected as PDFs.
- SBI validation attempted to fetch a PDF body and produced a warning.

Fix:

- Updated PDF detection to match `.pdf` before `/`, `?`, `#`, or end of URL.
- Fallback now uses the cleaned contextual title for generic PDF link labels.

Reason:

- Prevents PDF-body fetch attempts and improves notification normalization for official pages that use document-routing URLs.
