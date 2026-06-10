# Phase 5B Analytics Report

## Source Intelligence

Implemented calculations:

- Success rate from `job_fetch_logs.status`.
- Failure rate from failed logs and `fetch_failures`.
- Reliability score from success rate, failure resistance, duplicate resistance, and accepted draft rate.
- Average items discovered from `job_fetch_logs.items_found`.
- Accepted and rejected draft averages by source.
- Duplicate rate from `job_fetch_duplicates`.
- Health trend as healthy, degraded, failing, or no data.

## Freshness Intelligence

Implemented calculations:

- Active published jobs.
- Expired published jobs.
- Expiring windows: 1, 3, 7, and 30 days.
- Missing deadline indicators.
- Stale content indicators.

## Category Coverage

Implemented calculations:

- Jobs per category.
- Drafts per category.
- Published jobs per category.
- 30-day growth.
- Underrepresented categories.
- Inactive categories.

## Publishing SLA

Implemented percentile calculations:

- Draft to review: p50, p90, p95.
- Review to approval: p50, p90, p95.
- Approval to publish: p50, p90, p95.
- Total publish cycle: p50, p90, p95.

## Operations Reports

Implemented:

- Source Performance Report.
- Category Coverage Report.
- Draft Quality Report.
- Publishing SLA Report.
- Queue Health Report.
