# Moderation Queue Audit

## Scope

Audited `src/jobs/review/moderationQueue.js` and `AdminReviewService.getReviewQueue`.

## Verified

- Priority formula uses readiness, confidence, duplicate safety, and freshness.
- Critical warnings, duplicate blockers, expired deadlines, and missing source evidence apply penalties.
- Decision bands sort in the intended order:
  - `recommended_publish`
  - `review_recommended`
  - `manual_review_required`
  - `blocked`
- Blocked items remain visible but sort below publish-ready items.
- Stale reviews are invalidated using `draft_snapshot_hash`.

## Defects Fixed

- Queue review loading now compares the current draft snapshot to the stored review snapshot before trusting the latest review.
- Existing pre-hardening rows without snapshot hashes are treated as stale.

## Stress Evidence

- 10 reviews: 14 ms.
- 50 reviews: 21 ms.
- 100 reviews: 34 ms.
- 250 reviews: 77 ms.

## Result

Pass. Queue ordering and stale-review handling are production-ready.
