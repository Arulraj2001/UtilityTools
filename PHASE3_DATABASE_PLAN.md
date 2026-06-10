# Phase 3 Database Plan

Audit date: 2026-06-04

## Scope

This is a design plan only. Do not create migrations yet.

## Current Tables Used

| Table | Current Role |
| --- | --- |
| `raw_job_notifications` | official source evidence |
| `ai_research_queue` | Phase 1/2 queue item |
| `ai_job_drafts` | AI-generated draft content |
| `ai_duplicate_log` | duplicate evidence |
| `ai_job_sources` | source tier/category |
| `jobs` | final job CMS table |
| `job_categories` | public category taxonomy |
| `admin_users` | admin authorization |

## Current Schema Observations

### `ai_job_drafts`

Strengths:

- stores generated data and quality scores
- links to queue item
- can link to published job id

Limitations:

- status `published` is ambiguous because it means converted to jobs row
- no review recommendation record
- no fact verification record
- no audit history
- no readiness/confidence indexes

### `jobs`

Strengths:

- supports draft/published
- has SEO fields
- has official links
- has JSON fields for eligibility, dates, tags
- has unique slug

Limitations:

- no source provenance columns
- no AI review provenance columns
- no approval history

## Recommended New Tables

### 1. `ai_review_results`

Purpose:

Store ReviewEngine output for each AI draft.

Recommended fields:

- `id uuid primary key`
- `draft_id uuid references ai_job_drafts(id)`
- `queue_item_id uuid references ai_research_queue(id)`
- `raw_notification_id uuid references raw_job_notifications(id)`
- `publish_readiness integer`
- `confidence integer`
- `decision_band text`
- `subscores jsonb`
- `warnings jsonb`
- `recommendations jsonb`
- `category_suggestion jsonb`
- `tag_suggestion jsonb`
- `review_version text`
- `is_stale boolean default false`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(decision_band, publish_readiness desc, confidence desc)`
- `(draft_id)`
- `(queue_item_id)`
- `(is_stale, updated_at desc)`

### 2. `ai_fact_verifications`

Purpose:

Store FactVerifier evidence and field-level verification results.

Recommended fields:

- `id uuid primary key`
- `draft_id uuid references ai_job_drafts(id)`
- `queue_item_id uuid references ai_research_queue(id)`
- `raw_notification_id uuid references raw_job_notifications(id)`
- `verification_score integer`
- `source_confidence integer`
- `field_results jsonb`
- `blocking_issues jsonb`
- `warnings jsonb`
- `verified_at timestamptz`
- `verified_by uuid null`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(draft_id)`
- `(verification_score desc)`
- `(source_confidence desc)`
- `(verified_at desc)`

### 3. `ai_moderation_actions`

Purpose:

Audit every admin/system review action.

Recommended fields:

- `id uuid primary key`
- `draft_id uuid references ai_job_drafts(id)`
- `job_id uuid references jobs(id)`
- `admin_id uuid references auth.users(id)`
- `action text`
- `reason_code text`
- `notes text`
- `before_state jsonb`
- `after_state jsonb`
- `metadata jsonb`
- `created_at timestamptz`

Indexes:

- `(draft_id, created_at desc)`
- `(job_id, created_at desc)`
- `(admin_id, created_at desc)`
- `(action, created_at desc)`

### 4. `ai_publish_recommendations`

Purpose:

Optional table if recommendations should be versioned separately from review results.

Can be skipped initially if `ai_review_results` stores the latest recommendation and `ai_moderation_actions` stores history.

## Recommended New Columns

### `ai_job_drafts`

Optional columns:

- `review_status text`
- `latest_review_id uuid`
- `latest_verification_id uuid`
- `readiness_score integer`
- `confidence_score integer`
- `reviewed_at timestamptz`
- `reviewed_by uuid`

These columns are convenience denormalization for faster queue queries. The source of truth should remain the review tables.

### `jobs`

Optional provenance columns:

- `ai_draft_id uuid`
- `source_raw_notification_id uuid`
- `source_url text`
- `published_by uuid`
- `published_at timestamptz`
- `approval_status text`

## RLS Plan

All Phase 3 tables should be admin-only:

- authenticated admins can select/insert/update
- service role can run backend review jobs
- public users cannot access review tables

## Migration Guidance

Do not create migrations yet.

When implementation begins:

1. Add tables first.
2. Add indexes.
3. Add RLS policies.
4. Add optional denormalized columns.
5. Backfill latest review records for existing drafts.

## Verdict

Phase 3 needs new review, verification, and audit tables. It does not need changes to Phase 1 or Phase 2 pipeline tables to begin.

