# PRODUCTION_PROVIDER_RECOMMENDATION

## Recommendation

Based on the current provider readiness validation run, the best production pairing is:

- `Cerebras` as the primary provider
- `Groq` as the secondary/fallback provider

## Why `Cerebras + Groq`

- `Cerebras` is the only provider that passed all checks in this validation: `testProvider`, `fetchModels`, `aiDraft`, and `seo`.
- `Groq` demonstrated a successful fallback result and is reachable, making it the strongest secondary provider in the current environment.
- `OpenRouter` has partial behavior: it passes model fetch and SEO, but its AI draft call timed out in this run.
- `DeepSeek`, `Gemini`, and `HuggingFace` are currently blocked by quota, permission, or network failures and should not be relied on until those issues are resolved.

## Practical production stance

1. Use `Cerebras` as the stable core provider for general AI generation.
2. Retain `Groq` as the first fallback after any failed upstream providers because it successfully completed the fallback sequence.
3. Treat `OpenRouter` as tertiary or conditional: good for SEO/metadata generation in this run, but not yet a reliable AI draft fallback.

## Notes

- The current fallback chain in the validation run succeeded at `Groq`, proving the kernel fallback logic is working.
- `Groq` should remain active while monitoring for rate-limit / request-size issues.
- `OpenRouter` should be revalidated after fixing its timeout behavior before elevating it to the recommended pair.

## Final answer

**Production pair:** `Cerebras + Groq`

---

Generated on: 2026-06-01
