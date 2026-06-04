# AI Job Intelligence System Audit Report

Audit date: 2026-06-03

## Overall Health Score

Overall: 58 / 100

| Area | Score | Summary |
| --- | ---: | --- |
| Architecture | 68 | Clear React/Supabase/admin split, but ingestion automation is incomplete. |
| Security | 72 | Server-side AI keys and RLS exist; search/prompt hardening was needed and applied. |
| Reliability | 45 | Live provider health is poor; Edge proxy auth validation failed locally. |
| Performance | 62 | Build succeeds; pagination and provider fallback needed repair. |
| AI Quality | 52 | Deterministic heuristic scoring exists, but duplicate checks and JSON compliance are incomplete. |
| Deployment | 55 | Vercel static deployment config exists; cron is not wired. |

## Architecture Overview

The app is a Vite/React frontend backed by Supabase. Public job pages read published records from `jobs`. Admin pages manage manual jobs and AI Job Intelligence workflows. AI provider calls are routed through a Supabase Edge Function (`ai-provider-proxy`) using server-side provider keys stored in `ai_provider_settings`.

Key folders:

| Path | Purpose |
| --- | --- |
| `src/pages/jobs` | Public jobs list, category, and detail pages. |
| `src/components/jobs` | Job cards, metadata, filters, apply card, related jobs. |
| `src/pages/admin/ai` | AI dashboard, queue, moderation, providers, prompts, reports. |
| `src/api/supabaseApi.js` | Main Supabase data access layer. |
| `src/lib/jobWritingFramework.js` | AI prompts and local fallback draft/SEO generation. |
| `src/lib/jobQualityScorer.js` | Deterministic job scoring heuristics. |
| `src/lib/aiProvider.js` | Browser wrapper for provider proxy calls. |
| `server/ai/providerCore.js` | Node provider abstraction and fallback chain. |
| `supabase/functions/ai-provider-proxy` | Supabase Edge Function for server-side AI calls. |
| `supabase_*.sql` | Database migrations and hardening scripts. |
| `scripts/*.mjs` | Validation, monitoring, sitemap, provider checks. |

## Data Flow

1. Public frontend queries Supabase using `src/api/supabaseApi.js`.
2. Admin AI queue items are stored in `ai_research_queue`.
3. AI draft generation builds a prompt in `jobWritingFramework.js`.
4. Browser calls `ai-provider-proxy` with provider IDs only, not raw saved keys.
5. Edge Function validates admin auth, loads provider secrets using service role, enforces rate limits, and calls providers through shared `providerCore`.
6. Generated draft JSON is stored in `ai_job_drafts`.
7. Moderation converts approved AI draft content into a normal `jobs` draft. It does not auto-publish.
8. Public job pages display only `status = published` jobs.

## API Flow

Public:

- `getJobs()` reads `jobs`.
- `getJobBySlug()` reads a single job.
- `getFeaturedJobs()` reads published featured jobs.
- `searchJobs()` searches published jobs.

Admin AI:

- `getAiProviders()` calls Edge Function first, then falls back to safe RLS fields.
- `updateAiProvider()` updates safe settings directly and secrets through Edge Function.
- `createResearchItem()` stores queue entries.
- `createAiDraft()` sanitizes `generated_data.full_description` before insert.
- `createJob()` validates/sanitizes content and enforces quality gate only for `published` status.

## Job Ingestion Flow

Current state:

- There is no implemented automated external job API ingestion pipeline.
- `ai_job_sources` stores source URLs, but all production source rows had `last_checked = null`, `items_found = 0`, `check_count = 0`.
- The working pipeline is admin-assisted: add/paste source data into AI Research Queue, generate draft, review, create normal job draft, manually publish.

Live source reachability test:

| Source | Working | Jobs Returned | Errors |
| --- | --- | ---: | --- |
| DRDO Official | Yes | N/A | HTTP 200 |
| IBPS Official | No | N/A | fetch failed |
| ISRO Official | No | N/A | fetch failed |
| NHM Official | No | N/A | fetch failed / timeout-like delay |
| RRB Official | Yes | N/A | HTTP 200 |
| SBI Careers | Yes | N/A | HTTP 200 |
| SSC Official | No | N/A | aborted after 12s |
| UPSC Official | Yes | N/A | HTTP 200 |

## AI Scoring Flow

`scoreJob()` computes:

- content
- seo
- eeat
- adsense
- spamRisk
- duplicateRisk
- freshness
- overall

Findings:

- Scoring is deterministic for a fixed input and reference time.
- Freshness necessarily changes over time because it depends on current date/deadline.
- Duplicate risk is only meaningful if existing jobs are supplied; many current callers call `scoreJob(parsed)` without existing jobs, so duplicate risk is often `0`.
- Draft quality gate only blocks publishing when `status = published`; AI moderation intentionally creates normal jobs as `draft`.

## Database Flow

Actual database: Supabase PostgreSQL.

Live table counts from service API:

| Table | Count |
| --- | ---: |
| `jobs` | 1 |
| `job_categories` | 8 |
| `ai_job_sources` | 8 |
| `ai_research_queue` | 1 |
| `ai_job_drafts` | 2 |
| `ai_duplicate_log` | 0 |
| `ai_monitoring_rules` | 0 |
| `ai_update_queue` | 0 |
| `ai_provider_settings` | 6 |
| `ai_provider_failures` | 53 |
| `ai_generation_usage` | 1 |

Direct Postgres constraint inspection could not run because `DATABASE_URL`, `SUPABASE_DB_URL`, or `SUPABASE_DATABASE_URL` is not configured.

## Frontend Flow

Public jobs:

- `/jobs` uses `useJobs()` and `JobCard`.
- `/jobs/:slug` uses `useJob()` and related content matchers.
- `/jobs/category/:slug` route exists.

Findings fixed:

- `getJobs()` accepted `page/pageSize` but ignored them.
- Search used raw text in a PostgREST `.or()` expression.
- Jobs list had no load-more/pagination path.

## Cron Flow

Current cron/scheduling state:

- `scripts/monitorProviders.js` uses `node-cron` when run as a long-running process.
- `package.json` includes `monitor:providers` and `monitor:providers-daemon`.
- `vercel.json` has no `crons` entry.
- No GitHub Actions scheduler was found.
- No deployed scheduled function was verified.

Conclusion: cron is not production-wired in this repo.

## Validation Evidence

Passed before repairs:

- `npm run build` completed successfully.
- Sitemap generation loaded 154 tools, 16 categories, 27 blog posts, 5 workflow pages, 1 job, total 222 URLs.
- `node scripts/validate-ai-job-system.mjs` passed.
- `npm run test:conversion` passed.

Failed or blocked:

- `npm run lint` failed with 109 existing errors, mostly unrelated unused imports and entity JSON parse issues.
- `npm run typecheck` failed with broad JS checking/type configuration issues.
- Post-repair `npm run build` and AI validation reruns were blocked by approval system credit exhaustion.
- Post-repair `npm run test:conversion` passed.

## Primary Conclusion

The system partially works. Public job display and Supabase reads work. Manual/admin AI draft workflows are present. AI provider keys exist in production DB, but most providers are unhealthy. Automated external job fetching is not implemented, despite source URLs being stored. Cron is not deployed/wired. The app is not production-grade yet, but the highest-risk local code issues found during this pass were repaired.
