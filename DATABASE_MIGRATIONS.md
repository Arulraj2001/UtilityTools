# Database Migrations

Audit date: 2026-06-04

## Migration Created

`supabase_job_fetching_phase1_migration.sql`

## Tables Added

### `job_fetch_logs`

Tracks each per-source fetch run.

Required columns included:

- `id`
- `source_id`
- `started_at`
- `completed_at`
- `status`
- `items_found`
- `items_saved`
- `errors`

Additional columns:

- `duration_ms`

### `raw_job_notifications`

Stores raw official notifications before AI drafting.

Required columns included:

- `id`
- `source_id`
- `source_name`
- `notification_url`
- `pdf_url`
- `title`
- `organization`
- `raw_html`
- `raw_text`
- `fetched_at`
- `hash`
- `status`

Additional columns:

- `published_date`
- `last_date`
- `queue_item_id`
- `duplicate_of`
- `metadata`
- `created_at`
- `updated_at`

### `fetch_failures`

Tracks source and item-level fetch/save failures.

Required columns included:

- `id`
- `source_id`
- `url`
- `error_message`
- `created_at`

Additional columns:

- `details`

### `job_fetch_duplicates`

Stores duplicate events before duplicate rows are inserted.

### `job_fetch_source_metrics`

Stores source health rollups:

- success/failure counts
- consecutive failures
- average duration
- total items found/saved
- last status/error

## Duplicate Protection

The migration creates unique indexes for:

- `raw_job_notifications.hash`
- lowercased non-empty `raw_job_notifications.notification_url`
- lowercased non-empty `raw_job_notifications.pdf_url`

The service also checks:

- existing raw notifications
- existing `ai_research_queue.source_url`
- existing `jobs.notification_pdf`
- existing `jobs.apply_link`
- existing `jobs.canonical_url`

## Source Counter Updates

`JobFetchService` now updates existing `ai_job_sources` fields:

- `last_checked`
- `items_found`
- `check_count`
- `updated_at`

## RLS

RLS is enabled on all new tables.

Policies allow authenticated admins only:

- `job_fetch_logs`
- `raw_job_notifications`
- `fetch_failures`
- `job_fetch_duplicates`
- `job_fetch_source_metrics`

Server-side ingestion uses the Supabase service role and still verifies admin role for admin-triggered endpoints.

## Seed Addition

The migration inserts `TNPSC Official` only if no TNPSC source already exists.
