# Data Integrity Report

## Scope

Audited consistency across:

- `raw_job_notifications`
- `ai_research_queue`
- `ai_job_drafts`
- `ai_review_results`
- `ai_fact_verifications`
- `ai_moderation_actions`
- `monitoring_alerts`

## Local Integrity Validation

- Queue recovery does not duplicate drafts.
- Provider failure does not save partial drafts.
- Conversion recovery does not duplicate jobs.
- Moderation audit creation still occurs for conversion recovery.
- Alert persistence maintains one active fingerprint per alert.

## Production Integrity Validation

Prepared `scripts/phase4-5-live-validation.mjs` to check:

- Duplicate drafts by queue item.
- Duplicate jobs by AI draft.
- Duplicate active reviews by draft.
- Orphan draft, review, verification, moderation, and job references.
- Stale processing queue rows.
- Monitoring snapshot persistence.
- Anon RLS visibility.

## Remaining Production Blocker

Live production integrity validation could not be run because the required Supabase command execution was blocked by approval credits.
