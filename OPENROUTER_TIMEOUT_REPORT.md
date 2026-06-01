# OPENROUTER_TIMEOUT_REPORT

## Goal

Audit OpenRouter timeout behavior and determine whether timeouts originate from:
- OpenRouter API (upstream)
- fetch wrapper / network
- AbortController (local timeout)
- Edge Function execution limit

Target: Ensure AI draft generation completes within 30s.

## What I changed (instrumentation)

- Added OpenRouter-specific timing and enhanced error logging in both provider cores:
  - `supabase/functions/_shared/providerCore.js`
  - `server/ai/providerCore.js`
- New logs to look for when exercising requests:
  - `[openrouter] request` — original request metadata (provider, endpoint, model, prompt length)
  - `[openrouter] fetch_error` — fetch-level errors (network, AbortError), includes `name`, `message`, and timings
  - `[openrouter] response_non_ok` — non-2xx responses and the captured body (redacted)
  - `[openrouter] timings` — structured durations: `fetchMs` (time to receive response headers), `readMs` (time to parse/read body), `totalMs`
  - `[openrouter] parse_error` — JSON parse / content errors

These logs enable separating "time to first byte" vs "time to read body" vs "local aborts".

## How to reproduce (example calls)

1) Tail function logs (deployed or local) so you can see the OpenRouter logs live.

- If using Supabase CLI to tail functions logs (replace with your usage):

```bash
supabase functions tail ai-provider-proxy
```

- Or run the Edge Function locally and watch stdout where logs appear:

```bash
# start local serve (from workspace root)
# (example - replace with your preferred dev command)
supabase functions serve
```

2) Trigger `testProvider` for the OpenRouter provider with a 30s timeout (replace `PROVIDER_JSON` with the provider object or id expected by your function):

```bash
curl -s -X POST https://<YOUR_FUNCTION_BASE>/ai-provider-proxy \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"testProvider","provider": {"id":"<OPENROUTER_PROVIDER_ID>"},"timeoutMs":30000}'
```

3) Run a typical AI draft generation call (use `callAI`) and include `timeoutMs` 30000:

```bash
curl -s -X POST https://<YOUR_FUNCTION_BASE>/ai-provider-proxy \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"callAI","prompt":"Write a concise AI draft...","providers":[{"provider_name":"openrouter","id":"<OPENROUTER_PROVIDER_ID>"}],"timeoutMs":30000}'
```

4) Observe logs for the entries listed above and collect the timing fields.

## How to interpret the logs

- If you see `fetchMs` high (e.g., 2000ms+) and `readMs` small: OpenRouter responded slowly with headers, indicating upstream processing latency (OpenRouter API slow).
- If you see `fetchMs` small but `readMs` very large: response body generation/transfer took long — upstream model generation time or streaming delay.
- If you see `fetch_error` with `name: "AbortError"` and the `message` contains `Provider timed out after`: the local AbortController triggered due to the configured `timeoutMs` (i.e., local timeout).
- If you see non-2xx status codes (408, 504): upstream timed out or gateway timed out — OpenRouter API likely timed out.
- If function logs show process termination or runtime error mentioning execution limit, or if the function environment returns an execution timeout before any provider logs appear: the Edge Function execution limit is being hit.
- Use `attempt.durationMs` (from `callAI` attempts array returned by the proxy) to correlate per-attempt durations with the provider logs.

## Preliminary code-level findings

- The provider fallback system uses `createAttemptSignal()` which creates an `AbortController` and calls `controller.abort(new Error('Provider timed out after ${timeoutMs}ms'))` after `timeoutMs` milliseconds. That means local code can and will abort provider fetches when the configured `timeoutMs` elapses.
- The proxy defaults already set `timeoutMs` to 45_000 in `callAI()` and `testProvider` uses 20_000 by default. The admin proxy also allows overriding via the `timeoutMs` field in the request body.
- The implemented instrumentation will now tell us whether the observed timeout is caused by our AbortController or by upstream behavior.

## Recommended measurement plan

1) Tail logs and run `testProvider` with `timeoutMs=30000`. Capture logs.
2) Run `callAI` with a real AI draft prompt and `timeoutMs=30000`. Capture logs and the returned `attempts` array.
3) For any failing attempt, examine the OpenRouter logs entries:
   - `fetch_error` (network/Abort), `response_non_ok` (HTTP error), or `timings` (durations)
4) Determine source:
   - If `fetch_error` AbortError with our timed message → increase `timeoutMs` or reduce prompt complexity.
   - If `response_non_ok` with 504/408 → upstream timed out; retry with smaller prompt or different provider.
   - If `timings.totalMs` < configured `timeoutMs` but the function still errors with execution limit → investigate Edge Function runtime limits.

## Remediation recommendations

- Short-term (fast):
  - For AI draft generation, set `timeoutMs` to at least 30_000 when calling OpenRouter from the proxy (the proxy already accepts `timeoutMs` in the request body).
  - Ensure `callAI` usage for draft generation passes `timeoutMs: 30000` (or higher if your tests show OpenRouter needs >30s).

- Medium-term (robustness):
  - If OpenRouter is consistently close to or above 30s, add provider-specific fallback tuning: try a faster provider first (Cerebras, Groq) and fall back to OpenRouter.
  - Add prompt compression for OpenRouter calls similar to the Groq compression already implemented to reduce generation time.

- Long-term (production hardening):
  - If upstream latency is the cause, consider: fewer tokens in prompts, using smaller models, or enabling paid project keys to reduce queuing/rate limits on OpenRouter.
  - If Edge Function execution limits are being hit, move long-running provider calls to a background job (worker queue) and return a job id to the caller; publish results when available.

## Next steps I can take for you

- I can run a targeted test invocation (if you provide an admin token and OpenRouter provider id) and collect the logs here.
- I can add additional provider-specific compression for OpenRouter if you want me to implement it.
- I can add a short Node/Deno test harness that calls `testProvider` and `callAI` locally and prints the new OpenRouter log entries.


---
Generated on: 2026-06-01
