# OpenRouter vs Groq Comparison

Date: 2026-06-02

Goal: Determine whether OpenRouter should replace Groq as the secondary production provider (Cerebras primary + secondary candidate).

Summary of methodology
- Run 10 iterations per provider per task (adjustable via `ITERATIONS` env).
- Tasks: AI Draft generation, SEO generation.
- Use `scripts/provider-comparison.mjs` which imports the local provider core (`server/ai/providerCore.js`).
- Provide `providers.json` in the repo root with credentials for `openrouter` and `groq`.
- Script outputs `comparison-results.json` with per-run details and aggregated summaries.

Measured metrics
- success rate
- average response time (ms)
- average token usage
- timeout rate
- rate-limit frequency
- quality score (heuristic)

Quality scoring (heuristic)
- AI Draft: score = min(1, textLength / 300)
- SEO: title length <=70 and description <=160 → score up to 1 (simple parsing heuristic)

How to run (local)

1) Create `providers.json` in repo root with both provider entries. Example:

```json
[
  {
    "provider_name": "openrouter",
    "api_key": "<OPENROUTER_API_KEY>",
    "model": "openrouter/free",
    "base_url": "https://openrouter.ai/api/v1"
  },
  {
    "provider_name": "groq",
    "api_key": "<GROQ_API_KEY>",
    "model": "llama-3.1-8b-instant",
    "base_url": "https://api.groq.com/openai/v1"
  }
]
```

2) Run the comparison script (example):

```bash
# from repo root
node scripts/provider-comparison.mjs
```

3) Results are written to `comparison-results.json`. After the run, open this file and update this report with the observed metrics and the final winner.

Decision rule for Winner
- Compare aggregated metrics (success rate, avg time, timeout rate). Favor lower timeouts and higher success.
- If both secondaries are similar, prefer the one with better quality score and lower rate-limits.

Winner (placeholder)
- To be determined after running the script and populating results.

Notes
- This is a validation-only procedure; no production code is modified.
- If you want, I can run the script now — provide `providers.json` or the API keys and I will run 10 iterations and update this report with measured results and pick the winner.
