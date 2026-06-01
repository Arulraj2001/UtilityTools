# FALLBACK_CHAIN_VERIFICATION_REPORT

## Summary

- Result: FAIL — the proxy rejected the authenticated request before the fallback chain executed.

## Captured outputs

- callAI response:
  - HTTP status: 401
  - body: { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT' }

- Full attempts array from `callAI`: undefined (no attempts executed due to auth failure)

- Provider order used (DB active providers by priority — first 6 shown):
  1. deepseek (id: 389ad9e1-1af6-4379-860d-19054451d10e)
  2. gemini (id: d2dc29ef-a687-4783-a7ef-c4e7d83bab27)
  3. groq (id: 6f12762c-222c-47f4-86a8-e916c2215ce6)
  4. openrouter (id: 802c8f5e-2cae-4fd3-913e-70178040d3b1)
  5. huggingface (id: eb0ce738-6529-49ef-8f46-6ee9b497c935)
  6. cerebras (id: b70b7ed8-c076-4b58-acab-b762c8a82e07)

- Provider count loaded into proxy: 6

- First successful provider: none (no provider calls were attempted)

## Evidence (script output excerpts)

- `providersCount 6`
- `activeProviders` printed with the above order
- `listProviders.status 401`
- `callAI.status 401`
- `callAI.data { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT' }`

## Root cause analysis

The proxy rejected the request due to an invalid admin JWT format in the Authorization header. The validation script sanitized and supplied an admin access token from the environment, but the token was not a valid JWT (script warning: "SUPABASE_ADMIN_ACCESS_TOKEN does not appear to be a valid JWT format"). Consequently, the Edge Function responded 401 and the fallback chain never executed.

The authorization failure originates in the function's admin check at:

- [supabase/functions/ai-provider-proxy/index.ts](supabase/functions/ai-provider-proxy/index.ts#L85-L90)

Specifically, the code calls `supabase.auth.getUser(token)` and throws a 401 when `userError` or `!user`:

```js
const { data: userData, error: userError } = await supabase.auth.getUser(token)
const user = userData?.user
if (userError || !user) {
  const error = new Error('Invalid or expired admin session.')
  ;(error as any).status = 401
  throw error
}
```

This is the point where the request is rejected before any `callAI` provider loop can run.

## Pass criteria check

Required chain for PASS (one of):
- DeepSeek fail → Gemini fail → Groq fail → OpenRouter attempt
- DeepSeek fail → Gemini fail → Groq fail → Cerebras attempt

Observed behavior: no provider attempts executed. PASS criteria not met.

## Next steps (recommended, not implemented here)

- Re-run the verification with a valid admin access token (set `SUPABASE_ADMIN_ACCESS_TOKEN` to the raw JWT access token string copied from an active admin UI session). Ensure no surrounding JSON, quotes, or smart quotes.

- Capture the `callAI` response and full `attempts` array from the proxy logs for a successful authenticated run.


---

Generated on: 2026-06-01
