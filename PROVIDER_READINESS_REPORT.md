# PROVIDER_READINESS_REPORT

## Overview

A full provider readiness validation run was executed with `scripts/provider-readiness-validation.mjs` in the workspace.

The run loaded six configured providers from `ai_provider_settings` and evaluated each provider for:
- `testProvider`
- `fetchModels`
- `aiDraft`
- `seo`

A fallback call was also executed across all active providers in priority order.

## Results Summary

| Provider | Active | Test | Fetch Models | AI Draft | SEO | Notes |
|---|---|---|---|---|---|---|
| deepseek | yes | fail | pass | fail | fail | quota failure, not production-ready |
| gemini | yes | fail | pass | fail | fail | quota/rate-limit failure, not production-ready |
| groq | yes | pass | pass | fail | fail | strong test success, AI/SEO blocked by rate limits/request size |
| openrouter | yes | pass | pass | fail | pass | partial reliability; test OK and SEO OK, AI draft timed out |
| huggingface | yes | fail | pass | fail | fail | network/dns failure, not production-ready |
| cerebras | yes | pass | pass | pass | pass | healthy and production-ready |

## Provider-by-Provider Findings

### Cerebras
- `testProvider`: passed
- `fetchModels`: passed
- `aiDraft`: passed
- `seo`: passed
- Status: healthy
- Notes: reliable and fully functional in this validation run.

### Groq
- `testProvider`: passed
- `fetchModels`: passed
- `aiDraft`: failed due to rate-limit (`429`) from Groq during fallback AI draft evaluation
- `seo`: failed due to the same Groq rate-limit condition
- Status: usable as a fallback provider; succeeded in the fallback chain.
- Notes: provider itself is reachable and functional, but current service tier/rate limits are a risk for high-volume AI calls.

### OpenRouter
- `testProvider`: passed
- `fetchModels`: passed
- `aiDraft`: failed due to timeout after 30s
- `seo`: passed
- Status: partially reliable
- Notes: good for metadata/SEO generation in this run, but not yet dependable for general AI draft tasks.

### DeepSeek
- `testProvider`: failed due to quota/insufficient balance
- `fetchModels`: passed
- `aiDraft`: failed
- `seo`: failed
- Status: not production-ready until balance/quota is fixed.

### Gemini
- `testProvider`: failed due to quota/rate-limit
- `fetchModels`: passed
- `aiDraft`: failed
- `seo`: failed
- Status: not production-ready until quota and project access issues are resolved.

### HuggingFace
- `testProvider`: failed due to network/dns failure
- `fetchModels`: passed
- `aiDraft`: failed
- `seo`: failed
- Status: not production-ready until network connectivity/dns issues are resolved.

## Fallback Validation

The fallback call was executed across all active providers with the configured priority order.

Fallback attempt sequence:
1. `deepseek` – failed (quota)
2. `gemini` – failed (quota)
3. `groq` – success

Result:
- Fallback succeeded with `groq` using model `allam-2-7b`
- Final fallback output was generated successfully

## Conclusions

- The fallback chain is functioning correctly in this validation run: it continued through failed providers until `groq` succeeded.
- `cerebras` is the only provider that passed all readiness checks.
- `groq` is the next strongest provider, with a successful fallback result and healthy connectivity, but current rate limits reduce its reliability for sustained AI draft/SEO traffic.
- `openrouter` is currently a partial candidate: OK for SEO but unstable for general AI draft due to timeouts.
- `deepseek`, `gemini`, and `huggingface` are not ready for production without quota, permission, or network fixes.

## Recommendation

- Primary production provider: `cerebras`
- Secondary fallback provider: `groq`
- Keep `openrouter` configured for non-critical SEO-style text generation once timeouts are addressed.

---

Generated on: 2026-06-01
