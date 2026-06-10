# Cost Analysis Report

Audit date: 2026-06-04

## Inputs

Live recent draft average:

| Metric | Value |
| --- | ---: |
| Average tokens per draft, recent 5 drafts | 4,653 |
| Average tokens per current Phase 2 draft | 2,868 |

Cost projection uses the conservative 4,653 tokens/draft average and assumes 80% input tokens / 20% output tokens.

## Pricing Sources

- Cerebras pricing: https://www.cerebras.ai/pricing
- OpenRouter pricing: https://openrouter.ai/pricing
- Groq pricing: https://groq.com/pricing
- Groq Llama 3.1 8B model card: https://console.groq.com/docs/model/llama-3.1-8b-instant

Pricing checked on 2026-06-04.

## Token Volume Projection

| Jobs/month | Estimated tokens/month |
| ---: | ---: |
| 100 | 465,300 |
| 1,000 | 4,653,000 |
| 10,000 | 46,530,000 |

## Provider Cost Estimate

| Provider Scenario | Basis | 100 jobs | 1,000 jobs | 10,000 jobs |
| --- | --- | ---: | ---: | ---: |
| OpenRouter free models | Token price $0, free tier rate limits apply | $0 | $0 | Not viable at 50 req/day |
| Groq Llama 3.1 8B | $0.05/M input, $0.08/M output | $0.03 | $0.26 | $2.61 |
| Groq Llama 3.3 70B | $0.59/M input, $0.79/M output | $0.29 | $2.93 | $29.31 |
| Cerebras Pro | $50/month, 24M tokens/day quota | $50 | $50 | $50 |

OpenRouter states failed/fallback attempts are billed only on successful model runs when routing/fallback is enabled.

## Observations

- Direct token cost is extremely low at current draft sizes.
- The larger practical cost risk is retry storms and provider throttling, not per-token pricing.
- The new API batch cap reduces accidental high-volume admin-triggered spend.
- At 10,000 jobs/month, OpenRouter free-only usage exceeds 50 requests/day.

## Verdict

Cost efficiency is production-ready if provider health is monitored and batch processing remains capped.

