# Phase 3.5 Live Validation

## Commands Run

```bash
supabase db query --linked --file supabase_phase3_5_review_versioning_hardening.sql
node scripts/phase3-live-validation.mjs
node scripts/phase3-5-live-audit.mjs
```

## Live Review Result

Existing drafts reviewed: 3.

Outcomes:

- 1 `review_recommended`
- 2 `blocked`

Persisted production rows after validation:

- `ai_review_results`: 6
- `ai_fact_verifications`: 6
- `ai_moderation_actions`: 6

## Versioning Result

Current rows include:

- `review_version`
- `verification_version`
- `scoring_version`
- `draft_snapshot_hash`

Older pre-hardening rows were marked stale or treated as stale because they lack snapshot hashes.

## RLS Probe

Unauthenticated anon probes saw zero rows in all Phase 3 review/audit tables.

## Result

Pass. Production data validates the hardened review pipeline. The two blocked drafts are content/evidence issues, not system blockers.
