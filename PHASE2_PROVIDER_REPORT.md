# Phase 2 Provider Report

Audit date: 2026-06-04

## Provider Strategy

Phase 2 uses existing provider infrastructure and server-side keys from `ai_provider_settings`.

Requested priority:

1. Cerebras
2. OpenRouter
3. Groq
4. Gemini
5. DeepSeek

Implementation:

- `providerSelector.js` loads active providers from `ai_provider_settings`.
- Providers without saved keys are excluded.
- Health penalties are applied before fallback ordering.
- Provider priority is normalized for Phase 2 before calling existing `server/ai/providerCore.js`.
- Failed attempts are logged to `ai_provider_failures`.
- Provider stats are updated in `ai_provider_settings.stats`.
- Admin generation usage is recorded in `ai_generation_usage` when an admin id is supplied.

## Live Provider State

| Provider | Active | Health | Notes |
| --- | --- | --- | --- |
| Cerebras | yes | healthy | Used successfully for live Phase 2 draft generation. |
| OpenRouter | yes | down | Previously usable as fallback, but current stats show degraded/down health. |
| Groq | yes | down | Rate-limit failures observed previously. |
| Gemini | yes | down | Auth/permission failures observed previously. |
| DeepSeek | yes | down | Quota failures observed previously. |
| HuggingFace | yes | down | Not part of Phase 2 priority list. |

## Live Phase 2 Calls

| Run | Result |
| --- | --- |
| First live queue item | Draft saved via Cerebras; duplicate self-match later corrected. |
| Second live queue item | Rejected by validation; no draft saved. |
| Third live queue item | Draft saved via Cerebras; final score 74, duplicate risk 0. |

## Fallback Behavior

Fallback is tested with mocked provider attempts in `queueWorker.test.js`:

- Failed provider attempt is retained in draft metadata.
- Successful fallback provider is saved as `ai_provider`.
- Failed attempts do not create partial drafts.

Live provider fallback was not forced because Cerebras succeeded as the primary healthy provider.

## Provider Usage Tracking

Phase 2 records:

- Request/success/failure counters.
- Average latency.
- Last latency.
- Last tested timestamp.
- Health status.
- Provider failure rows for failed attempts.
- Admin generation count when admin id is available.

## Risks

- Most non-Cerebras providers are currently unhealthy.
- If Cerebras becomes unavailable, fallback will try OpenRouter, Groq, Gemini, and DeepSeek, but current health suggests lower success probability.
- Provider failures are expected and safe; the queue worker saves drafts only after validated JSON and complete draft generation.

## Recommendation

Keep Cerebras as the primary provider for Phase 2. Repair OpenRouter/Groq/Gemini/DeepSeek quotas and auth so at least one fallback provider is healthy in production.

