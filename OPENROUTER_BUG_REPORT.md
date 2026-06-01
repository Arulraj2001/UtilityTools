# OPENROUTER_BUG_REPORT

## Summary

A production OpenRouter failure was traced to unsafe access of `window.location.origin` in the OpenRouter provider wrapper.

## Root cause

In `supabase/functions/_shared/providerCore.js`, the OpenRouter request headers were built with:

```js
'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : ''
```

This check is insufficient in server-side runtime environments where `window` exists but `window.location` is undefined. The resulting failure was:

> Cannot read properties of undefined (reading 'origin')

The exact undefined object was `window.location`.

## Affected file

- `supabase/functions/_shared/providerCore.js`

Additionally patched the duplicate implementation in:

- `server/ai/providerCore.js`

## Affected line

- `supabase/functions/_shared/providerCore.js` at `line 241` (`const callOpenRouter = async ...`)

## Fix applied

Updated the OpenRouter wrapper to:

- safely compute the referer with optional chaining:
  - `const referer = (typeof window !== 'undefined' && window?.location?.origin) || ''`
- avoid any direct `window.location.origin` property access when `window.location` is absent
- add targeted logs for OpenRouter:
  - `[openrouter] request`
  - `[openrouter] response`
  - `[openrouter] error`

The new wrapper logs request metadata, response summary, and sanitized error details without changing provider order or other provider behavior.

## Verification result

PASS — the fallback chain was verified with actual provider attempt logs.

### Verified behavior

A local fallback test was executed using the patched OpenRouter wrapper. The provider sequence and results were:

- `deepseek` failed with 402 Insufficient Balance
- `gemini` failed with 429 quota/rate-limit
- `groq` failed with 413 request-too-large
- `openrouter` request was logged and failed cleanly with a 401 auth error in the forced-failure test
- fallback continued to `cerebras`
- `cerebras` succeeded and returned a final result

### Local verification log evidence

- `[openrouter] request` printed provider, endpoint, model, referer, and prompt length
- `[openrouter] error` printed the OpenRouter failure
- `callAI` returned a Cerebras result after OpenRouter failed
- Attempts array showed ordered provider execution through DeepSeek, Gemini, Groq, OpenRouter, HuggingFace, and Cerebras

## Notes

- This fix is isolated to OpenRouter header construction and logging.
- No provider order changes were made.
- No changes were made to DeepSeek, Gemini, Groq, HuggingFace, or Cerebras logic.

---

Generated on: 2026-06-01
