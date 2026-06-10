# Stress Test Report

Audit date: 2026-06-04

## Method

Simulated queue batches with:

- real `QueueWorker`
- real draft generation
- real quality gate
- deterministic mocked provider extraction
- deterministic mocked duplicate analysis
- in-memory Supabase-compatible adapter

This avoided creating live production drafts or spending provider tokens.

## Results

| Queue Items | Success Rate | Failure Rate | Retry Rate | Total Time | Drafts Saved | Raw Processed |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 100% | 0% | 0% | 39 ms | 10 | 10 |
| 50 | 100% | 0% | 0% | 146 ms | 50 | 50 |
| 100 | 100% | 0% | 0% | 284 ms | 100 | 100 |

## Provider Utilization

Stress test provider utilization:

| Provider | Attempts |
| --- | ---: |
| mock provider | 160 |

Forced failover test provider utilization:

| Provider | Result |
| --- | --- |
| Cerebras | failed |
| OpenRouter | failed |
| Groq | failed |
| Gemini | succeeded |

## Conclusion

The queue worker itself scales linearly and safely for 100-item deterministic runs. Real throughput will be bounded by provider latency, provider rate limits, and the new API batch cap.

