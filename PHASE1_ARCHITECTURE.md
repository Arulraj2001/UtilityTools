# Phase 1 Architecture

Audit date: 2026-06-04

## Current State

The existing AI Job Intelligence system already has the human review and AI drafting surfaces:

| Table | Role |
| --- | --- |
| `ai_job_sources` | Admin-managed source registry. Existing fields include `url`, `tier`, `category`, `is_active`, `last_checked`, `check_count`, and `items_found`. |
| `ai_research_queue` | Staging queue for job notifications before AI drafting. Manual/admin-created records already work here. |
| `ai_job_drafts` | AI-generated drafts awaiting review, moderation, approval, or publication. |
| `jobs` | Public/manual job table. Existing public routes and admin posting workflows read/write here. |

Existing flow before Phase 1:

Admin/manual input -> `ai_research_queue` -> AI draft generation -> `ai_job_drafts` -> admin review -> `jobs`

Missing before Phase 1:

- No automated source fetching.
- No raw notification storage.
- No fetch logs or fetch failure records.
- No duplicate protection before queue insertion.
- No admin API to trigger ingestion.
- No cron-ready ingestion endpoint.

## New Phase 1 Flow

Official source -> source fetcher -> normalized notification -> duplicate detector -> `raw_job_notifications` -> `ai_research_queue`

Detailed flow:

1. `JobFetchService` loads active rows from `ai_job_sources`.
2. `fetcherRegistry` maps each source to a Phase 1 adapter.
3. The adapter extends `BaseFetcher` and fetches only allowlisted HTTPS domains.
4. `officialNotificationParser` discovers likely recruitment notification links.
5. `normalizeNotification()` emits the required normalized shape.
6. `DuplicateDetector` checks URL, PDF URL, content hash, existing queue rows, and published job URLs.
7. New items are saved to `raw_job_notifications`.
8. A pending item is created in `ai_research_queue`.
9. `job_fetch_logs`, `fetch_failures`, `job_fetch_duplicates`, `job_fetch_source_metrics`, and `ai_job_sources` counters are updated.

## Integration Points

Server modules:

- `src/jobs/jobFetchService.js`
- `src/jobs/fetchHealthService.js`
- `src/jobs/duplicateDetector.js`
- `src/jobs/normalizeNotification.js`
- `src/jobs/fetchers/*`

API endpoints:

- `GET /api/admin/fetch/status`
- `POST /api/admin/fetch/run`
- `POST /api/admin/fetch/source/:id`
- `GET /api/admin/fetch/logs`
- `POST /api/cron/fetch-jobs`

Database migration:

- `supabase_job_fetching_phase1_migration.sql`

## Preserved Workflows

- Manual job posting remains on `jobs`.
- Existing AI draft generation remains on `ai_research_queue` and `ai_job_drafts`.
- Existing admin source management remains on `ai_job_sources`.
- Existing SEO fields and public routes are not changed.

## Security Boundaries

- HTTPS-only fetching.
- Per-source official domain allowlists.
- Redirect validation on every hop.
- Redirect limit of 3.
- Request timeout defaults to 15 seconds.
- Response size cap defaults to 2 MB.
- PDF bodies are not downloaded by the HTML fetcher.
- HTML is sanitized before storage.
- Admin endpoints verify Supabase Auth bearer tokens and `admin_users.is_admin`.
- Cron endpoint requires `JOB_FETCH_CRON_SECRET`, `CRON_FETCH_SECRET`, or `CRON_SECRET`.

## Remaining Phase 2 Work

- Deploy and apply the migration in Supabase.
- Add Vercel cron entries after choosing the schedule.
- Add admin UI buttons for manual fetch runs if desired.
- Add source-specific parsers for sites that need JavaScript-rendered tables.
- Add alerting on `job_fetch_source_metrics.consecutive_failures`.
