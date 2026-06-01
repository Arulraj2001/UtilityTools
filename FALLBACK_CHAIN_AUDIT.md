# FALLBACK_CHAIN_AUDIT

## Purpose

Audit the AI provider fallback chain and confirm whether the production proxy will continue past Gemini when earlier providers fail.

## Findings

- The fallback chain logic in `supabase/functions/_shared/providerCore.js` is implemented correctly:
  - active providers are sorted by priority via `sortProvidersForFallback`
  - each provider call is wrapped in `try/catch`
  - failures are classified and recorded
  - the loop continues until one provider succeeds or all providers fail

- The proxy action handler in `supabase/functions/ai-provider-proxy/index.ts` constructs the request payload and uses `loadProviders()` to resolve provider rows before invoking `callAI()`.

- The most likely source of a premature stop is not the fallback loop itself, but an incomplete provider list reaching the proxy.

## Possible gap

- `loadProviders()` previously only resolved providers by `id`.
- If a provider payload were missing `id` or used provider metadata with incomplete fields, valid fallback providers could be dropped before `callAI()` began.

## Fix applied

Updated `supabase/functions/ai-provider-proxy/index.ts` to make provider resolution more robust:

- always load all provider rows from `ai_provider_settings`
- map requested providers by `id` first, then by `provider_name`
- preserve requested order when assembling the fallback chain
- continue to honor provider-specific overrides for `model`, `base_url`, and `available_models`

## Implications

- This fix hardens the proxy against partial request payloads.
- It reduces the risk that active fallback providers like OpenRouter or Cerebras are skipped because a request item was missing its `id`.

## Recommendation

- Validate production callAI request payloads to ensure the full active provider list is being passed from the admin UI.
- If symptoms persist, capture request body and proxy logs for the exact `providers` array used on the failed request.
