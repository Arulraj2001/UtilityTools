# Duplicate Test Report

Validation date: 2026-06-04

## Method

Ran the production ingestion service twice with:

- active sources
- one-notification cap per source
- service-role Supabase client

## First Run

| Metric | Value |
| --- | ---: |
| Sources processed | 9 |
| Items found | 6 |
| Items saved | 6 |
| Duplicates | 0 |
| Failures | 2 |
| Skipped | 1 |

## Second Run

| Metric | Value |
| --- | ---: |
| Sources processed | 9 |
| Items found | 6 |
| Items saved | 0 |
| Duplicates | 6 |
| Failures | 3 |
| Skipped | 1 |

## Direct Duplicate Insert Probe

Attempted to insert a duplicate raw notification with an existing hash.

Result:

- Blocked by `uq_raw_job_notifications_hash`
- Postgres error code: `23505`

## Verdict

Passed.

Duplicate detection and database unique protection both blocked duplicate raw notifications.
