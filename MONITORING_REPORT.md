# Monitoring Report

Audit date: 2026-06-04

## Existing Visibility

| Area | Current Mechanism | Status |
| --- | --- | --- |
| Provider health | `ai_provider_settings.health_status`, `stats`, `last_latency_ms`, `last_tested` | present |
| Provider failures | `ai_provider_failures` plus analytics fallback | present |
| Queue health | `QueueWorker.getStatus()` and admin status endpoint | present |
| Draft health | `ai_job_drafts.status`, `quality_scores` | present |
| Usage tracking | `ai_generation_usage` | present |
| Duplicate visibility | `ai_duplicate_log` | present |

## Post-fix Snapshot

| Metric | Value |
| --- | ---: |
| Queue pending | 2 |
| Queue drafted | 3 |
| Queue rejected | 1 |
| Raw processed | 3 |
| Raw failed | 1 |
| Provider failures logged | 53 |
| Duplicate logs | 1 |

## Provider Health Concern

Multiple providers are currently down or throttled. OpenRouter was healthy in the post-fix snapshot; Cerebras has strong historical success but was marked down by recent throttling. This is not a blocker because fallback remains available, but it should be watched closely.

## Recommended Dashboards

- Queue age by status, especially oldest pending and oldest processing.
- Draft quality score distribution and rejection reasons.
- Provider health timeline with success rate, latency p95, and failure type.
- Token usage and projected monthly spend.
- Hallucination/validation rejection counts by field.
- Duplicate risk distribution.
- Raw notification lifecycle: queued, processed, failed.

## Alert Recommendations

| Alert | Suggested Threshold |
| --- | --- |
| Oldest pending queue item | > 24 hours |
| Processing item age | > 30 minutes |
| Provider success rate | < 70% over last 20 attempts |
| Provider p95 latency | > 30 seconds |
| Validation failure rate | > 20% over last 20 items |
| Draft metadata secret canary | any provider object in attempts |

## Verdict

Monitoring is adequate for Phase 3 entry, with dashboard polish recommended before fully automated high-volume operation.

