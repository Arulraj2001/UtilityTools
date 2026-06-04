# Database Validation

Validation date: 2026-06-04

## Live Counts

| Table | Count |
| --- | ---: |
| `raw_job_notifications` | 6 |
| `job_fetch_logs` | 19 |
| `fetch_failures` | 6 |
| `job_fetch_duplicates` | 6 |
| `job_fetch_source_metrics` | 9 |
| `ai_research_queue` | 6 |

## CRUD Validation

| Check | Result |
| --- | --- |
| `raw_job_notifications` insert | Passed via live ingestion run: 6 rows inserted |
| `raw_job_notifications` update | Passed via service update to `status = queued` and `queue_item_id` |
| `job_fetch_logs` insert | Passed via live ingestion and cron duplicate-execution probe |
| `job_fetch_logs` update | Passed via completed/skipped status updates |
| `fetch_failures` insert | Passed with validation probe |
| `fetch_failures` update | Passed with validation probe |
| Duplicate insert rejection | Passed: duplicate hash insert returned Postgres `23505` |

## Duplicate Protection Evidence

Direct duplicate insert against `raw_job_notifications` was blocked:

- Constraint: `uq_raw_job_notifications_hash`
- Error code: `23505`

## Index Usage

Behavioral evidence:

- Duplicate protection is enforced by unique index/constraint behavior.
- Fetch log and status queries returned quickly at current scale.

Limitation:

- `EXPLAIN` and `pg_stat_user_indexes` are not available through current environment credentials. Direct Postgres access is required to prove planner index usage.

## Findings

- Live database has real Phase 1 data.
- Direct DB writes work.
- Queue linkage works.
- Duplicate enforcement works.
- Catalog/index planner verification remains blocked.
