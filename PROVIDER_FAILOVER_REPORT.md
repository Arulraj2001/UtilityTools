# Provider Failover Report

Audit date: 2026-06-04

## Expected Phase 2 Order

Under equal provider health, Phase 2 sorts providers as:

1. Cerebras
2. OpenRouter
3. Groq
4. Gemini
5. DeepSeek

The selector is health-aware, so a provider marked healthy can be tried before a provider currently marked down.

## Forced Failure Test

Executable regression added: `src/jobs/ai/providerSelector.test.js`.

Forced unavailable:

- Cerebras: simulated 503
- OpenRouter: simulated 503
- Groq: simulated 503

Observed attempts:

| Attempt | Provider | Result |
| ---: | --- | --- |
| 1 | Cerebras | failed, classified `network` |
| 2 | OpenRouter | failed, classified `network` |
| 3 | Groq | failed, classified `network` |
| 4 | Gemini | succeeded |

Assertions:

- Failed attempts are recorded in order.
- Failed attempts are logged to `ai_provider_failures`.
- Returned attempt metadata does not include raw provider rows or API keys.
- Successful fallback returns the final provider.

## Live Provider Health Snapshot

| Provider | Active | Health | Requests | Successes | Failures | Avg latency |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| DeepSeek | yes | down | 29 | 0 | 29 | 776 ms |
| Gemini | yes | down | 27 | 3 | 24 | 2210 ms |
| Groq | yes | down | 26 | 8 | 18 | 368 ms |
| OpenRouter | yes | healthy | 26 | 6 | 20 | 3968 ms |
| HuggingFace | yes | down | 23 | 0 | 23 | 428 ms |
| Cerebras | yes | down | 31 | 24 | 7 | 4490 ms |

Note: live health is dynamic. OpenRouter was healthy in the post-fix snapshot; Cerebras has the strongest success history but was marked down due recent throttling.

## No Partial Draft Saves

`queueWorker.test.js` verifies that extraction failure produces:

- zero `ai_job_drafts` inserts
- queue status `rejected` on final failure
- raw notification status `failed`

## Verdict

Provider failover is production-ready. Continue monitoring provider health because multiple secondary providers are currently unhealthy or quota-limited.

