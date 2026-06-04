# Performance Report

Audit date: 2026-06-03

## Summary

The production build completed successfully before repairs, and Supabase reads were fast enough for sitemap generation. Performance risk is concentrated in AI provider latency/failures, lack of real pagination before this audit, missing cron monitoring, and absent automated source ingestion.

## Build Evidence

`npm run build` completed before repairs.

Sitemap generation evidence:

- Tools loaded: 154
- Categories loaded: 16
- Blog posts loaded: 27
- Workflow pages loaded: 5
- Jobs loaded: 1
- Total URLs: 222

Post-repair build rerun was blocked by approval system credit exhaustion.

## Source Reachability Latency

| Source | Status | Latency |
| --- | --- | ---: |
| DRDO Official | 200 | 2571 ms |
| IBPS Official | fetch failed | 440 ms |
| ISRO Official | fetch failed | 874 ms |
| NHM Official | fetch failed | 10252 ms |
| RRB Official | 200 | 736 ms |
| SBI Careers | 200 | 1417 ms |
| SSC Official | aborted | 12015 ms |
| UPSC Official | 200 | 1570 ms |

Conclusion: direct website fetching is unreliable and must not be used without robust timeouts, retries, and parsers.

## AI Provider Latency and Reliability

Live readiness observations:

- DeepSeek: fast failure, quota/balance error.
- Gemini: failed due quota/permission.
- Groq: test OK around 880 ms, generation often rate-limited.
- OpenRouter: test OK around 2587 ms, SEO took around 28153 ms, draft timed out at 30000 ms.
- HuggingFace: failed due network/fetch.
- Cerebras: test OK around 1984 ms, draft around 3087 ms, SEO around 2201 ms.

Conclusion: Cerebras is currently the fastest reliable generation provider. Health-aware fallback was added so it can be reached before known-down providers.

## Frontend Performance Findings

Before repair:

- `getJobs()` ignored `page/pageSize`.
- Public jobs page had no load-more/pagination path.
- Client quick filters were applied after fetching the first batch only.

After repair:

- `getJobs()` applies Supabase `.range()`.
- `/jobs` includes a load-more button that expands the server query by 20.
- Query limits are capped defensively.

## Database Performance Findings

Existing indexes cover basic status/date and featured filtering. Additional indexes were added in a migration file for:

- public listings
- public category pages
- source monitoring
- non-empty canonical URL uniqueness
- non-empty notification PDF uniqueness

The migration file is `supabase_job_intelligence_query_hardening.sql`.

## Bundle Size

Current bundle size was not re-measured after repairs because the post-repair build rerun was blocked. Historical Lighthouse JSON files exist, but they are from 2026-05-26 and were not treated as current evidence.

## Performance Risks

High:

- Failed providers add latency before fallback unless health-aware ordering is deployed.
- No production cron means provider health can drift without automatic correction.
- External source websites are unreliable and slow.

Medium:

- Client-side quick filters can undercount results until more pages are loaded.
- AI output format failures cause fallback drafts and extra admin work.
- OpenRouter free model can be slow and inconsistent.

Low:

- Sitemap generation depends on live Supabase availability during build.

## Optimizations Applied

- Supabase job pagination/range support.
- Search input normalization and length caps.
- Health-aware AI provider fallback sorting.
- Lower Groq output cap to reduce TPM failures.
- Skip noisy OpenRouter virtual model-info lookup for `openrouter/free`.
- Additive query/index hardening migration.

## Next Performance Work

High impact:

- Apply database hardening migration.
- Put a healthy provider first operationally, with Cerebras as current primary.
- Add scheduled provider health checks.

Medium impact:

- Add server-side category/quick-filter query parameters rather than client-only filtering.
- Add AI output JSON schema validation before saving drafts.
- Add source fetcher timeouts, caching, and parser-specific adapters.

Low impact:

- Re-run Lighthouse after deployment.
- Add bundle analysis to CI.
