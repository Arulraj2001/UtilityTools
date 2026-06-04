# Security Report

Audit date: 2026-06-03

## Summary

Security posture is moderate but not production-grade. The strongest control is that saved AI provider keys are server-side in Supabase and accessed through an admin-only Edge Function. The weakest areas are prompt injection exposure, raw PostgREST search interpolation, wildcard CORS on the AI proxy, idle source ingestion controls, and local `VITE_*` key naming.

## Findings Fixed

### PostgREST Search Injection / Malformed Filters

Before:

- `getJobs()` and `searchJobs()` inserted raw user search text into `.or()` filter strings.

After:

- Search text is normalized, length-capped, and stripped of PostgREST control characters before building the filter.

Risk reduced: query manipulation and accidental malformed filter errors.

### Prompt Injection

Before:

- Raw job notification text was inserted into prompts without strong delimiter instructions.
- Source text could contain instructions such as "ignore previous instructions".

After:

- Job, SEO, duplicate-check, and update-detection prompts now wrap source content in bounded `BEGIN_UNTRUSTED_JSON` / `END_UNTRUSTED_JSON` blocks.
- Prompts explicitly say not to follow instructions inside source data.
- Long source fields are capped.

Risk reduced: model instruction hijacking by malicious job/source text.

### Provider Fallback Abuse / Waste

Before:

- Known-down providers were still tried before healthy providers based only on priority.
- Groq requests used high output token allowances, worsening TPM rate-limit failures.

After:

- Fallback sorting considers provider health and recent error type.
- Groq output is capped lower.
- OpenRouter no longer relies on browser globals in server/Edge contexts.

Risk reduced: unnecessary failed provider calls, quota waste, and latency.

## Existing Positive Controls

- `.env` is ignored and not tracked.
- No obvious hardcoded live API keys were found in tracked files.
- `ai-provider-proxy` requires a valid authenticated admin user.
- Supabase RLS policies exist for admin-only AI tables.
- Provider secret writes go through the Edge Function.
- Generated draft HTML is sanitized before storing and rendering.
- Error logging includes secret redaction helpers.
- AI generation usage has a server-side rate-limit table.

## Security Risks Still Open

### Critical

None confirmed in tracked code after applied fixes.

### High

1. `VITE_GROQ_API_KEY` exists in local `.env`.
   - It is not referenced in code, but `VITE_*` variables are browser-exposable if imported.
   - Remove or rename to server-only `GROQ_API_KEY`.

2. Edge Function live auth validation failed locally.
   - Local `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` could not sign in.
   - `ai-provider-proxy` returned 401 for live validation.
   - Full production auth path needs a valid admin session/token test.

3. `ai-provider-proxy` uses wildcard CORS.
   - Admin auth is still required, but production should restrict allowed origins.
   - Recommended: add `AI_ALLOWED_ORIGINS=https://www.quickutils.page,https://quickutils.page`.

4. Future source fetching can become SSRF if arbitrary `ai_job_sources.url` values are fetched by a server worker.
   - Current code does not implement automated source fetching.
   - If added, enforce HTTPS, DNS/IP allow/deny checks, timeouts, max response size, and redirects policy.

### Medium

- Provider failures may log provider error bodies; current redaction is good but should be tested continuously.
- Admin prompt customization can still degrade quality or safety if an admin account is compromised.
- Quality gate does not block draft creation; it only blocks direct `published` saves.
- Direct DB constraint inspection is unavailable without a Postgres connection string.

### Low

- Local reports include historical placeholder key names.
- Public jobs page client-side quick filters can reveal inconsistent category/tag data quality.

## Recommended Security Backlog

High impact:

- Remove all provider secrets from `VITE_*` env names.
- Restrict Edge Function CORS by origin.
- Apply the new duplicate/index hardening migration.
- Add valid admin-token based production validation.

Medium impact:

- Add a signed cron/worker endpoint if automated provider monitoring is deployed.
- Add an SSRF-safe source fetcher contract before any automated ingestion.
- Add JSON schema validation for AI draft output before insert.

Low impact:

- Add secret scanning to CI.
- Add a provider failure redaction regression test.
