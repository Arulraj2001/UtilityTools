# Review Engine Audit

## Scope

Audited `src/jobs/review/reviewEngine.js`, `factVerifier.js`, `publishReadiness.js`, live review rows, and the Phase 3.5 test suite.

## Verified

- Publish readiness is calculated from extraction, SEO, completeness, duplicate safety, verification score, source confidence, and freshness.
- Confidence is bounded 0-100 and penalizes critical warnings.
- Warnings are deduplicated and severity-sorted.
- Recommendations are generated for decision band, category suggestion, and tag suggestion.
- Blockers are generated for hallucinated URLs, organization mismatch, duplicate URL, invalid critical date, no raw evidence, high duplicate risk, and ungrounded critical facts.

## Defects Fixed

- Added `scoring_version` to review output and persisted review rows.
- Added `draft_snapshot_hash` tracking so stale review rows are invalidated when draft content changes.
- Added critical blockers for ungrounded salary, vacancies, qualification, and age.

## Validation Evidence

- Review tests: 16 passed.
- Broader job-system tests: 47 passed.
- Live validation: 3 existing drafts reviewed; 1 `review_recommended`, 2 `blocked`.

## Result

Pass. Review scoring is consistent and now versioned/stale-aware.
