# Performance Validation

Validation date: 2026-06-04

## Live Measurements

Recent fetch logs, capped validation runs:

| Metric | Value |
| --- | ---: |
| Average fetch duration | 3,200 ms |
| Minimum fetch duration | 185 ms |
| Maximum fetch duration | 13,939 ms |
| Duplicate check probe | 899 ms |
| DB insert probe | 115 ms |

## Source Latency Samples

| Source | Status | Duration |
| --- | --- | ---: |
| UPSC | success | 2,295 ms |
| TNPSC | success | 2,228 ms |
| SSC | failed | 13,939 ms |
| SBI | failed before fix | 2,238 ms |
| RRB | success | 2,055 ms |
| NHM | skipped | 318 ms |
| ISRO | success | 1,944 ms |
| IBPS | failed | 664 ms |
| DRDO | success | 2,144 ms |

## Findings

- Successful sources are generally acceptable under a 15s timeout.
- SSC dominates worst-case latency and times out.
- Duplicate checks are acceptable at current scale but should be revisited after data volume grows.

## Verdict

Performance is acceptable for successful sources.

Overall performance validation is not production-ready because SSC timeout behavior remains unresolved.
