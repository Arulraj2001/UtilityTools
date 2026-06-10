# Queue Recovery Report

## Scope

Simulated worker crash windows during extraction, validation, draft save, review handoff, and moderation handoff.

## Defects Found And Fixed

- A worker restart after `ai_job_drafts` insert but before queue completion could create duplicate drafts.
- A stale `processing` queue item could remain stuck until manual intervention.

## Hardening Applied

- `QueueWorker` now checks for an existing draft by `queue_item_id` before processing and before inserting.
- Duplicate draft insert races are recovered by reloading the existing draft.
- Stale `processing` queue items can be reclaimed by `processQueue`, either restoring an existing draft or returning the item to `pending`.
- Recovery attempts are tracked in `extracted_data.phase2_recovery_count`.

## Evidence

- Stale processing item with existing draft recovered to `drafted`.
- Draft count remained 1.
- Raw notification was marked processed.
- Extractor was not re-run for recovered drafts.

Test result: 62 passed, 0 failed.

## Remaining Production Blocker

The additive DB uniqueness migration has not been applied to production because the approval system rejected the Supabase command due workspace approval credits.
