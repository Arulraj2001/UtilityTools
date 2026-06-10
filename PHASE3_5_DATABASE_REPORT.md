# Phase 3.5 Database Report

## Scope

Audited:

- `ai_review_results`
- `ai_fact_verifications`
- `ai_moderation_actions`

## Tables

All required Phase 3 tables exist and are populated in production.

Live counts:

- `ai_job_drafts`: 5
- `ai_review_results`: 6
- `ai_fact_verifications`: 6
- `ai_moderation_actions`: 6
- `jobs`: 1

## Indexes Verified

Index metadata confirmed indexes for:

- Review decision band
- Review readiness
- Review confidence
- Review draft ID
- Review queue item ID
- Review active lookup
- Review version lookup
- Review snapshot hash
- Verification draft ID
- Verification score
- Verification source confidence
- Verification latest lookup
- Moderation action draft ID
- Moderation action job ID
- Moderation action admin ID
- Moderation action type
- Moderation action created date

## Versioning

Phase 3.5 migration added:

- `ai_review_results.scoring_version`
- `ai_review_results.draft_snapshot_hash`

## Growth Projection

At 10,000 reviews/month:

- `ai_review_results`: about 120,000 rows/year.
- `ai_fact_verifications`: about 120,000 rows/year.
- `ai_moderation_actions`: 120,000+ rows/year depending on admin actions.

The current indexes support draft lookup, queue sorting, action audit lookup, and dashboard filtering.

## Result

Pass. Database design is production-ready for Phase 4 scale.
