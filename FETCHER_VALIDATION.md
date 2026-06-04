# Fetcher Validation

Validation date: 2026-06-04

## Dry Run

Dry run used official fetchers with no DB writes, capped at 1 notification per source.

| Source | Reachable | Notifications Found | Errors |
| --- | --- | ---: | --- |
| UPSC | Yes | 1 | None |
| SSC | No | 0 | Timeout / no notifications discovered |
| IBPS | No | 0 | TLS/fetch failure |
| SBI Careers | Yes | 1 | Fixed after validation: PDF URL detection now handles `.pdf/...` URLs |
| DRDO | Yes | 1 | None |
| ISRO | Yes | 1 | None |
| RRB | Yes | 1 | Title too generic: `Recruitment` |
| TNPSC | Yes | 1 | Title too generic: `Notification` |
| NHM | No | 0 | No Phase 1 fetcher registered |

## Live Run

Live run used production Supabase service role, active sources, capped at 1 notification per source.

| Source | Reachable | Notifications Found | Saved | Errors |
| --- | --- | ---: | ---: | --- |
| UPSC | Yes | 1 | 1 | None |
| SSC | No | 0 | 0 | No notifications discovered |
| IBPS | No | 0 | 0 | No notifications discovered / fetch failed |
| SBI Careers | Yes | 1 | 1 | First run had PDF-body warning before fix |
| DRDO | Yes | 1 | 1 | None |
| ISRO | Yes | 1 | 1 | None |
| RRB | Yes | 1 | 1 | Extracted title too generic |
| TNPSC | Yes | 1 | 1 | Extracted title too generic |
| NHM | No | 0 | 0 | Skipped, unsupported in Phase 1 |

## Verdict

Failed for Phase 2 approval.

Production ingestion works for several sources, but not every required source is reliable enough:

- SSC extraction is not working from server-rendered HTML.
- IBPS fails from this runtime due fetch/TLS failure.
- RRB and TNPSC need stronger source-specific title extraction.
- NHM is active in production but unsupported by Phase 1 and should be disabled or given an adapter before cron is enabled.
