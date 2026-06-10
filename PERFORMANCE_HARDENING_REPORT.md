# Performance Hardening Report

Audit date: 2026-06-04

## Live Current Phase 2 Draft Latency

Validated current Phase 2 drafts:

| Draft | Provider | Tokens | Generation latency |
| --- | --- | ---: | ---: |
| Railway Recruitment Board | Cerebras | 2,717 | 8,454 ms |
| DRDO/RAC GATE notice | Cerebras | 3,018 | 3,645 ms |

Average current Phase 2 provider generation latency: 6,050 ms.

## Deterministic Local Stress Latency

The local stress test used the real `QueueWorker`, real draft generation, real quality gate, and mocked deterministic extraction/duplicate analysis.

| Items | Total | Avg/item | Success | Failure | Retry |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 39 ms | 4 ms | 100% | 0% | 0% |
| 50 | 146 ms | 3 ms | 100% | 0% | 0% |
| 100 | 284 ms | 3 ms | 100% | 0% | 0% |

Component averages in local stress path:

| Component | Average |
| --- | ---: |
| Extraction mock latency | 1-2 ms |
| SEO/draft generation | <1 ms |
| Duplicate analysis mock | 1 ms |
| Quality gate | <1 ms |

## Queue Exhaustion

Empty queue returned:

`{ status: "success", processed: 0, results: [] }`

## Bottleneck

Provider latency dominates total draft creation time. Local deterministic processing overhead is negligible relative to live AI calls.

## Verdict

Performance is production-ready for admin-triggered batches. For automated high-volume Phase 3, add dashboard alerts on queue age, provider latency, and retry spikes.

