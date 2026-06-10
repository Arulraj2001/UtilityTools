# Phase 3 Database Migration Report

## Migration File

`supabase_phase3_review_intelligence.sql`

## Tables Added

- `ai_review_results`
- `ai_fact_verifications`
- `ai_moderation_actions`

## Columns Added

`ai_job_drafts`:

- `readiness_score`
- `confidence_score`
- `latest_review_id`
- `latest_verification_id`

`jobs`:

- `ai_draft_id`
- `source_raw_notification_id`
- `published_by`
- `published_at`

## Indexes Added

- Decision-band, readiness, confidence, draft, and queue indexes for `ai_review_results`.
- Draft, verification score, source confidence, and latest verification indexes for `ai_fact_verifications`.
- Draft, job, admin, action, and created-at indexes for `ai_moderation_actions`.
- Convenience indexes for new `ai_job_drafts` and `jobs` columns.

## Security

RLS is enabled on all new Phase 3 tables.

Admin-only policies use the existing `admin_users` check:

```text
EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE id = auth.uid() AND is_admin = true
)
```

## Migration Execution

Command run:

```bash
supabase db query --linked --file supabase_phase3_review_intelligence.sql
```

Result: completed successfully with no SQL errors.
