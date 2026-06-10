# Phase 4 Cost Report

## Cost Analytics Source

Cost analytics uses:

- `ai_generation_usage`
- `ai_job_drafts.tokens_used`
- `ai_provider_settings`
- Provider cost assumptions in `CostAnalyticsService`

## Live Validation Result

30-day production window:

- Tokens used: 23,263.
- Requests: 9.
- Provider tests: 24.
- Estimated spend: 0.
- Projected monthly cost: 0.

## Interpretation

The current providers/data indicate free or zero-cost provider assumptions for the observed draft volume. The service still exposes provider-level tokens, requests, and spend estimates so paid provider rates can be configured centrally in code if provider pricing changes.

## Result

Pass. Cost visibility exists and is ready for paid-provider calibration.
