# OpenRouter Production Validation

Date: 2026-06-02

Scope: Run production-like validation evidence collection for OpenRouter only. Tests executed (evidence-based): `testProvider`, `fetchModels`, SEO generation, AI Draft generation. No code changes performed.

Summary of findings
- Provider used: OpenRouter (`model: openrouter/free` where present)
- Observed HTTP status for model-info calls: 404 (model-info endpoint returned Not Found)
- No explicit `[openrouter] timings` entries were present in the captured log file; therefore exact `fetchMs`/`readMs`/`totalMs` values are not available from this dataset.
- Collected log excerpts below include `[openrouter] request`, `[openrouter] response`, and related `fetchOpenAIModelInfo` and response snippets.

Captured log excerpts (raw)
---
(TPM): Limit 6000, Used 4382, Requested 4132. Please try again in 25.14s. Need 
more tokens? Upgrade to Dev Tier today at https://console.groq.
[openrouter] request {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 31
}
---
[fetchOpenAIModelInfo] OpenRouter openrouter/free: 404 
{"error":{"message":"Not Found","code":404}}
[openrouter] response {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 31,
  tokensUsed: 89,
  textLength: 2
}
---
[openrouter] request {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 82
}
---
[fetchOpenAIModelInfo] OpenRouter openrouter/free: 404 
{"error":{"message":"Not Found","code":404}}
[openrouter] response {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 82,
  tokensUsed: 277,
  textLength: 1008
}
---
[openrouter] request {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 133
}
---
[fetchOpenAIModelInfo] OpenRouter openrouter/free: 404 
{"error":{"message":"Not Found","code":404}}
[openrouter] response {
  provider: 'OpenRouter',
  endpoint: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  referer: '(none)',
  promptLength: 133,
  tokensUsed: 725,
  textLength: ...
}
---

Interpretation and captured metrics
- `model used`: `openrouter/free` (per `[openrouter] request` entries).
- `HTTP status`: `404` observed when fetching model metadata (`fetchOpenAIModelInfo`), but `call` responses for chat completions still returned bodies with `tokensUsed` and `textLength`, indicating the runtime chat endpoint produced outputs in these cases.
- `fetchMs`, `readMs`, `totalMs`: Not present in the captured snippet set (no `[openrouter] timings` lines found in the supplied logs). Without those fields we cannot measure TTFB vs read duration from these logs.
- `timeoutMs`: The validation dataset does not contain any `fetch_error` entries indicating local `AbortError` with the message `Provider timed out after ${timeoutMs}ms`. No explicit local-abort evidence was found in this capture.

Timeout classification (per test)
- `testProvider`: logs show successful `[openrouter] request` and short responses (`textLength` values). No `AbortError` or gateway 504/408 in captured blocks → classification: `unknown` (timings not present; no timeout evidence)
- `fetchModels` (model-info): `404` from `fetchOpenAIModelInfo` indicates metadata not available for `openrouter/free` → classification: `upstream_provider` (metadata endpoint returning Not Found)
- `SEO generation`: captured `call`-style responses with `textLength` and `tokensUsed` (e.g., 1008) and no timeout errors → classification: `unknown` (no timings to prove within 30s)
- `AI Draft generation`: captured `call` responses with `tokensUsed` and `textLength`; no `fetch_error` or `timings` logged in these snippets → classification: `unknown` (no explicit timeout evidence)

Notes on evidence gaps
- The instrumentation added to the codebase logs `[openrouter] timings` (fields: `fetchMs`, `readMs`, `totalMs`) but the supplied capture (`validation-output.txt`) does not include those lines for the shown attempts. This prevents precise latency attribution.
- `fetchOpenAIModelInfo` (model metadata) returned 404 in several runs; this affects `fetchModels` checks but is distinct from chat completion latency.
- To fully answer the 30s reliability question we need at least several `[openrouter] timings` entries showing `totalMs` for AI Draft attempts (ideally a distribution of 20+ runs). The current evidence set lacks `timings` entries.

Conclusions
- Based on available log excerpts: OpenRouter produced completions (non-empty `textLength` and `tokensUsed`) in captured runs, and `fetchModels` (model-info) returned 404 for `openrouter/free`.
- Because the captured logs do not include `fetchMs`/`readMs`/`totalMs` or any `fetch_error` indicating a local abort, we cannot definitively prove or disprove OpenRouter's ability to reliably complete AI Draft generation within 30 seconds from this dataset alone.

Final answer (single-word)

WARNING

---

Evidence collected from: `validation-output.txt` (extracted UTF-16 log blocks), `supabase/functions/_shared/providerCore.js` (log instrumentation), `OPENROUTER_TIMEOUT_REPORT.md` (methodology).

If you want, I can now:
- Re-run targeted validations (live) for OpenRouter by invoking `testProvider` and `callAI` with `timeoutMs=30000` and capturing stdout (I will need an admin token / OpenRouter API key or a configured `ai_provider_settings` row in Supabase).
- Or re-run the repository's `provider-readiness-validation.mjs` after you provide Supabase service role credentials so we can collect fresh `[openrouter] timings` entries and produce a definitive PASS/WARNING/FAIL based on measured `totalMs` distribution.
