# API Key and Provider Audit

Audit date: 2026-06-03

## Environment Variable Names Found

Local `.env` variable names were inspected without printing values.

Present:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_USERNAME`
- `VITE_ADMIN_PASSWORD`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_API_BASE`
- `DEEPSEEK_API_KEY`
- `cerebras_api_key`
- `huggingface_api_key`
- `VITE_GROQ_API_KEY`
- conversion and quality-control variables

Not found:

- `GROQ_API_KEY` as a server-only variable
- `RAPIDAPI_KEY`
- `JSEARCH_API_KEY`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `REMOTIVE_API_KEY`

## Key Storage Model

The production AI provider keys are primarily stored in Supabase table `ai_provider_settings`, not read directly from frontend env variables. This is the correct model for AI provider secrets.

`ai-provider-proxy` loads saved keys using `SUPABASE_SERVICE_ROLE_KEY` inside the Supabase Edge Function and returns only safe provider metadata to the browser.

## Hardcoded Secret Scan

Tracked-file scan found no obvious hardcoded live keys outside `.env`.

`.env` is ignored by `.gitignore` and was not tracked by `git ls-files .env`.

## Risk: `VITE_GROQ_API_KEY`

`VITE_GROQ_API_KEY` exists in local `.env`. It is not referenced by the current code, but any `VITE_*` variable is eligible for browser exposure if imported. Rename/remove it and store Groq only as:

- Supabase `ai_provider_settings.api_key`, or
- server-only `GROQ_API_KEY` for scripts.

No secret file was modified.

## Live Provider Validation

Live provider rows found: 6. All had API keys present in the database.

| Provider | Key Present | Test Result | Generation Result | Status |
| --- | --- | --- | --- | --- |
| DeepSeek | Yes | Failed | Failed | 402 insufficient balance/quota |
| Gemini | Yes | Failed | Failed | 429 quota and prior 403 denied access |
| Groq | Yes | Test OK | Draft/SEO hit rate limits | Rate limited on free-tier TPM |
| OpenRouter | Yes | Test OK | SEO OK, draft timeout | Partial |
| HuggingFace | Yes | Failed | Failed | Network/fetch failure |
| Cerebras | Yes | OK | Draft and SEO OK | Best current provider |

## Edge Function Auth Validation

`scripts/live-production-validation.mjs` could not authenticate to `ai-provider-proxy` using local admin credentials:

- `adminSignInError`: Invalid login credentials
- `listProviders.status`: 401
- `callAI.status`: 401

This does not prove the production UI login is broken, but it proves the local configured admin credentials cannot validate the Edge Function path. A valid `SUPABASE_ADMIN_ACCESS_TOKEN` or correct admin credentials are required for full live proxy testing.

## Job API Provider Audit

No implemented integrations were found for:

- RapidAPI
- JSearch
- Adzuna
- Remotive

The current "sources" are official website URLs stored in `ai_job_sources`, not API adapters. No parser converts those pages into job records automatically.

## Fixes Applied

- Provider fallback now prefers healthy providers over known-down providers.
- Groq max output was capped lower to reduce free-tier TPM failures.
- OpenRouter no longer depends on browser `window.location` in server/Edge contexts.
- OpenRouter virtual model info lookup is skipped for `openrouter/free` to avoid noisy 404s and extra latency.

## Required Actions

High priority:

- Fix or replace DeepSeek and Gemini keys/plans.
- Put Cerebras first in the admin provider UI, or rely on the new health-aware fallback.
- Remove `VITE_GROQ_API_KEY` from local and production Vercel envs.
- Set a valid admin token or credentials for live Edge Function validation.

Medium priority:

- Add real external job API adapters if automated fetching is required.
- Add provider-specific daily budget controls.
- Store current provider health history in a dedicated monitoring dashboard.
