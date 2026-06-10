# Phase 3 Implementation Report

## Implemented

- Fact verification against raw/source evidence.
- Deterministic-first category suggestion.
- Source-derived tag generation.
- Publish readiness scoring with blocker overrides.
- Review engine with confidence, warnings, recommendations, and subscores.
- Moderation queue priority scoring and sorting.
- Admin review service for review, approve, reject, needs revision, conversion, publishing, bulk actions, and audit trail.
- Live validation script: `scripts/phase3-live-validation.mjs`.

## Conversion Behavior

`convert-to-job-draft`:

- Creates a `jobs` row.
- Always sets `status = 'draft'`.
- Preserves title, organization, category, tags, SEO fields, source links, dates, eligibility, selection process, and descriptions.
- Saves provenance via `ai_draft_id` and `source_raw_notification_id`.
- Updates the AI draft with `published_job_id`.
- Writes `ai_moderation_actions`.

## Blocker Handling

The system blocks or requires override for:

- Hallucinated URLs.
- Organization mismatch.
- Duplicate URL.
- Duplicate risk >= 80.
- Invalid critical date.
- Missing raw evidence.

Admin approval now requires a Phase 3 review. If no review exists, the backend runs one before approval. Blocked drafts cannot be approved.

## Live Validation Evidence

Validated 3 existing `ai_job_drafts`:

- 1 `review_recommended`.
- 2 `blocked` by real evidence checks.
- 3 `ai_review_results` rows persisted.
- 3 `ai_fact_verifications` rows persisted.
- 3 `ai_moderation_actions` rows persisted.

The blocked drafts are content/data issues, not implementation blockers.
