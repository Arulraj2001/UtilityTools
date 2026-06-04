# Phase 2 Architecture

Audit date: 2026-06-04

## Scope

Phase 2 starts after the completed Phase 1 ingestion path:

Official sources -> fetchers -> normalization -> duplicate detection -> `raw_job_notifications` -> `ai_research_queue`

Phase 2 implements:

`ai_research_queue` -> AI extraction -> JSON validation -> SEO generation -> duplicate analysis -> quality scoring -> `ai_job_drafts`

Fetchers, ingestion architecture, cron, source adapters, manual job posting, admin pages, and existing SEO routes were not changed.

## Current AI Capabilities

Existing capabilities found:

- `ai_provider_settings` stores provider configuration and server-side keys.
- `ai-provider-proxy` protects browser AI calls through admin auth.
- `server/ai/providerCore.js` and Supabase shared provider core support provider calls, fallback, model choice, and failure classification.
- `ai_research_queue` stores pending job notification research items.
- `ai_job_drafts` stores generated draft payloads in `generated_data` and scores in `quality_scores`.
- `ai_provider_failures` stores provider failure events.
- `ai_generation_usage` stores daily admin generation counters.
- Admin moderation can review `ai_job_drafts` and convert approved drafts into normal job drafts.

Live table evidence:

| Table | Count |
| --- | ---: |
| `ai_research_queue` | 6 |
| `raw_job_notifications` | 6 |
| `ai_job_drafts` | 5 |
| `ai_provider_settings` | 6 |
| `ai_provider_failures` | 53 |
| `ai_generation_usage` | 2 |
| `ai_duplicate_log` | 1 |

## Missing Pieces Closed

Implemented in Phase 2:

- Server-side queue worker.
- Structured JSON-only extraction prompt.
- Zod and AJV schema validation.
- Link/date/numeric grounding validation.
- Draft generation from validated extraction.
- Deterministic SEO generation.
- Duplicate risk scoring across jobs, drafts, and raw notifications.
- Quality gate with extraction, SEO, completeness, duplicate, and final scores.
- Admin-only processing APIs.
- Provider strategy with Phase 2 priority and health-aware fallback.
- Tests for extraction, validation, duplicate analysis, quality gate, and queue processing.

## Integration Points

| Integration | Phase 2 Use |
| --- | --- |
| `ai_research_queue` | Loads `pending` items and stores Phase 2 extraction/quality metadata. |
| `raw_job_notifications` | Loads source text and official URLs; marks processed when a draft is saved. |
| `ai_provider_settings` | Loads active providers with server-side keys and updates health/stats. |
| `ai_provider_failures` | Logs failed provider attempts. |
| `ai_generation_usage` | Records admin generation usage when an admin id is supplied. |
| `ai_duplicate_log` | Stores duplicate evidence for high-similarity matches. |
| `ai_job_drafts` | Saves complete, validated drafts only. |

## Recommended Architecture

The new backend modules live under `src/jobs/ai/`:

| Module | Responsibility |
| --- | --- |
| `providerSelector.js` | Loads providers, applies Phase 2 priority, records provider usage/failures. |
| `notificationExtractor.js` | Builds JSON-only prompts and calls provider fallback. |
| `schemaValidator.js` | Validates extraction with Zod, AJV, source-grounded links, dates, vacancies, and salary. |
| `draftGenerator.js` | Converts validated extraction into `generated_data`. |
| `seoGenerator.js` | Generates SEO title, description, keywords, FAQ, schema, and canonical suggestion. |
| `duplicateAnalyzer.js` | Scores duplicate risk against jobs, AI drafts, and raw notifications. |
| `qualityGate.js` | Computes scores and maps to rejected, manual review, or approved draft. |
| `queueWorker.js` | Orchestrates full queue item processing and DB writes. |

Admin-only APIs:

- `POST /api/admin/ai/process-queue`
- `POST /api/admin/ai/process-item/:id`
- `GET /api/admin/ai/status`
- `GET /api/admin/ai/failures`

## Risks

- Provider health is uneven; Cerebras is currently the best live provider.
- Strict validation can reject ambiguous AI date output. This is intentional to prevent malformed drafts.
- Existing unrelated lint errors still exist and were not part of Phase 2.
- One live queue item was rejected because validation blocked an invalid/ambiguous date. No malformed draft was saved.

## Production Posture

Phase 2 is ready for admin-triggered queue processing. Drafts still require human review before publication through the existing moderation workflow.

