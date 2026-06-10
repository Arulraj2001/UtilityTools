# Phase 3.5 Versioning Report

## Scope

Verified:

- `review_version`
- `verification_version`
- `scoring_version`
- Draft snapshot tracking

## Defect Found

Phase 3 stored `review_version` and `verification_version`, but did not persist a separate scoring version or draft snapshot hash.

## Fix Applied

Created and applied:

```text
supabase_phase3_5_review_versioning_hardening.sql
```

Added:

- `ai_review_results.scoring_version`
- `ai_review_results.draft_snapshot_hash`
- Version lookup index
- Snapshot hash index

## Code Hardening

`AdminReviewService.latestReview` now invalidates rows when:

- `review_version` is outdated.
- `scoring_version` is outdated.
- `draft_snapshot_hash` does not match current draft content.
- Snapshot hash is missing for a draft-aware lookup.

## Result

Pass. Review and scoring versions are now production-trackable.
