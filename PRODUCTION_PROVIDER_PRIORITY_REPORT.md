# Production Provider Priority Report

Date: 2026-06-02

Source data:
- `ai_provider_settings.redacted.json` (snapshot in `.codex-backups/ai-job-intelligence-20260531-223429`)
- Monitoring script behavior logged to `scripts/monitorProviders.js` (aggregates into `ai_provider_settings.stats`)

Data used (per-provider snapshot)
- Cerebras: requests=15, successes=14, failures=1, avg_latency_ms=1809, last_latency_ms=1030, health_status=healthy
- Groq:    requests=15, successes=7,  failures=8, avg_latency_ms=471,  last_latency_ms=713,  health_status=healthy
- Gemini:  requests=11, successes=2,  failures=9, avg_latency_ms=779,  last_latency_ms=1768, health_status=healthy
- OpenRouter: requests=15, successes=1, failures=14, avg_latency_ms=1419, last_latency_ms=1342, health_status=down, last_error includes 429 rate-limit
- HuggingFace: requests=15, successes=0, failures=15, avg_latency_ms=560, health_status=down, last_error indicates fetch failure
- DeepSeek: requests=13, successes=0, failures=13, avg_latency_ms=1000, health_status=down, last_error indicates 402 insufficient balance

Computed metrics
- Success % = successes / requests
- Failure rate = failures / requests
- Reliability score = success_rate * (1 - min(avg_latency_ms / 5000, 1)) — simple production-oriented heuristic (higher is better). This penalizes high latency.

Per-provider calculations
- Cerebras
  - Success %: 14/15 = 93.33%
  - Avg response time: 1809 ms
  - Failure rate: 6.67%
  - Reliability score: 0.9333 * (1 - 1809/5000) = 0.596 (≈59.6%)
  - Notes: high success rate; higher latency but very reliable overall.

- Groq
  - Success %: 7/15 = 46.67%
  - Avg response time: 471 ms
  - Failure rate: 53.33%
  - Reliability score: 0.4667 * (1 - 471/5000) = 0.423 (≈42.3%)
  - Notes: moderate success rate, low latency, healthy in snapshot.

- Gemini
  - Success %: 2/11 = 18.18%
  - Avg response time: 779 ms
  - Failure rate: 81.82%
  - Reliability score: 0.1818 * (1 - 779/5000) = 0.154 (≈15.4%)
  - Notes: low success rate; occasional successes but unreliable.

- OpenRouter
  - Success %: 1/15 = 6.67%
  - Avg response time: 1419 ms
  - Failure rate: 93.33%
  - Reliability score: 0.0667 * (1 - 1419/5000) = 0.048 (≈4.8%)
  - Notes: `health_status` = down in snapshot; `last_error` contains a 429 rate-limit message indicating upstream rate-limiting; very low success observed in production snapshot.

- HuggingFace
  - Success %: 0/15 = 0.00%
  - Avg response time: 560 ms
  - Failure rate: 100.00%
  - Reliability score: 0
  - Notes: fetch failures recorded; marked `down`.

- DeepSeek
  - Success %: 0/13 = 0.00%
  - Avg response time: 1000 ms
  - Failure rate: 100.00%
  - Reliability score: 0
  - Notes: 402 Insufficient Balance recorded; marked `down`.

Rate-limit and timeout evidence (from snapshot)
- OpenRouter: explicit rate-limit (429) message in `stats.last_error` with provider-supplied metadata indicating upstream temporary rate-limiting.
- No providers show explicit `timeout` or `AbortError` messages in `last_error` in this snapshot; timeouts were not recorded as distinct events in the `stats` snapshot.

Recommendation — production order
(Primary / Secondary / Tertiary) — choose providers that maximize reliability and acceptable latency while reducing outages.

Primary: Cerebras
- Rationale: Highest success rate (93%) and highest reliability score by the heuristic. Despite higher avg latency, its stability and success dominance make it the clear primary.

Secondary: Groq
- Rationale: Healthy status, moderate success (47%) and low latency (471 ms). Empirically outperforms OpenRouter in production snapshot (higher success rate, lower avg latency, no recent 429).

Tertiary: Gemini
- Rationale: Some successes recorded (18%) and healthy flag; better than OpenRouter in this snapshot and preferable as a tertiary fallback.

Providers to disable (recommend temporarily disable until addressed)
- OpenRouter — marked `down`, low success rate (6.7%), upstream rate-limiting observed; not a reliable secondary at present.
- HuggingFace — 0 successes in snapshot; fetch failures recorded.
- DeepSeek — 0 successes and account/billing issue (402 Insufficient Balance) recorded.

Should OpenRouter be above Groq?
- No. Based on current production evidence (snapshot in `ai_provider_settings.redacted.json`), OpenRouter shows a much lower success percentage (6.7% vs Groq 46.7%), higher avg latency (1419 ms vs 471 ms), and an explicit upstream 429 rate-limit error. Therefore OpenRouter should not be promoted above Groq as the secondary provider at this time.

Operational recommendations
- Keep Cerebras as primary.
- Promote Groq as the secondary production provider (replace Groq only if/when its production success rate falls or OpenRouter shows consistent improvement in production stats).
- Disable OpenRouter, HuggingFace, and DeepSeek until their health_status and success rates materially improve.
- Re-run the monitor (`scripts/monitorProviders.js --once`) and re-evaluate after at least 100 monitoring samples or after fixes are applied to OpenRouter (rate-limit resolution) to test whether OpenRouter becomes a viable secondary.
- Capture and persist `[openrouter] timings` (fetchMs/readMs/totalMs) per attempt during the next monitoring window to determine whether slowness or upstream queuing is the primary cause of failures.

Appendix: raw snapshot source
- See `.codex-backups/ai-job-intelligence-20260531-223429/ai_provider_settings.redacted.json` for the source values used in this report.

Decision (compact)
- Primary provider: Cerebras
- Secondary provider: Groq
- Tertiary provider: Gemini
- Providers to disable: OpenRouter, HuggingFace, DeepSeek

Signed-off-by: automated analysis using existing logs/statistics (no code changes or external queries performed).