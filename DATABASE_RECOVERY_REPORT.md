# Database Recovery Report

## Scope

Audited transaction safety, rollback behavior, duplicate protection, constraint integrity, and orphan prevention across AI queue, draft, review, moderation, job, and monitoring tables.

## Defects Found And Fixed

- Missing database backstop for duplicate `ai_job_drafts.queue_item_id`.
- Missing database backstop for duplicate `jobs.ai_draft_id`.
- Missing database backstop for concurrent active reviews per draft.

## Hardening Prepared

Created `supabase_phase4_5_reliability_hardening.sql` with:

- Unique partial index on `ai_job_drafts(queue_item_id)` where non-null.
- Unique partial index on `jobs(ai_draft_id)` where non-null.
- Unique partial index on active `ai_review_results(draft_id)` where `is_stale = false`.
- Processing and pending queue indexes for recovery and scale.

## Production Status

Migration command attempted:

```bash
supabase db query --linked --file supabase_phase4_5_reliability_hardening.sql
```

Result: blocked by approval system because the workspace is out of approval credits.

## Remaining Production Blocker

The hardening migration must be applied and verified in Supabase before Phase 5 readiness can be claimed.
