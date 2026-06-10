# Conversion Integrity Report

## Scope

Audited `convertToJobDraft` in `src/jobs/review/adminReviewService.js`.

## Verified Preservation

Conversion preserves:

- Title
- Organization
- Category
- Tags
- SEO title
- SEO description
- SEO keywords
- Canonical URL
- Important dates
- Start and last dates when parseable
- Official website
- Apply link
- Notification PDF
- Eligibility
- Selection process
- Source provenance

## Provenance

Conversion writes:

- `jobs.ai_draft_id`
- `jobs.source_raw_notification_id`

## Safety

- Converted jobs are created with `status = 'draft'`.
- No auto publish exists.
- Blocked drafts require explicit override before conversion.
- Already-converted drafts are rejected before inserting a duplicate job.

## Live Evidence

The live production database currently has no converted AI jobs with `ai_draft_id`, so no production provenance sample exists yet. Conversion behavior was verified through code audit and hardening tests.

## Result

Pass. Conversion is provenance-preserving and duplicate-conversion safe.
