# Phase 3 Architecture - Review Intelligence + Moderation System

## Verdict

Phase 3 is implemented downstream of `ai_job_drafts` and preserves the existing Phase 1 and Phase 2 pipeline boundaries.

No auto publish is introduced. Human admins remain in control of approve, reject, convert-to-draft, and publish actions.

## Implemented Flow

```text
ai_job_drafts
  -> FactVerifier
  -> AutoCategoryEngine
  -> TagEngine
  -> ReviewEngine
  -> PublishReadinessScore
  -> ModerationQueue
  -> Admin Review APIs
  -> Convert To Job Draft
  -> Moderation Audit Trail
```

## Runtime Components

- `src/jobs/review/factVerifier.js`
- `src/jobs/review/autoCategoryEngine.js`
- `src/jobs/review/tagEngine.js`
- `src/jobs/review/publishReadiness.js`
- `src/jobs/review/reviewEngine.js`
- `src/jobs/review/moderationQueue.js`
- `src/jobs/review/adminReviewService.js`

## Data Flow

```text
Draft row
  generated_data
  quality_scores
  queue_item_id
    |
    v
Evidence context
  raw_job_notifications
  ai_research_queue
  ai_duplicate_log
  ai_job_sources
    |
    v
ai_fact_verifications
ai_review_results
ai_moderation_actions
    |
    v
Admin queue APIs
    |
    v
jobs row with status = draft
```

## Safety Rules

- Phase 3 never calls AI providers.
- Phase 3 never changes fetchers, adapters, ingestion, cron, duplicate detection, queue architecture, extraction, validation, provider proxy, public job routes, or existing SEO routes.
- `convert-to-job-draft` creates `jobs.status = 'draft'`.
- Publishing requires an explicit admin API call with `confirm=true`.
- Blocked reviews cannot be converted or published unless an explicit override is provided and audited.

## Production Validation

- Migration applied with `supabase db query --linked --file supabase_phase3_review_intelligence.sql`.
- Phase 3 unit tests: 12 passed.
- API route import smoke test: 11 passed.
- Broader job-system tests: 43 passed.
- Production build: passed.
- Live validation ran on 3 existing `ai_job_drafts` and wrote 3 review rows, 3 verification rows, and 3 audit rows.
