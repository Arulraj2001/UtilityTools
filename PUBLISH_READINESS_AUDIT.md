# Publish Readiness Audit

## Scope

Audited `src/jobs/review/publishReadiness.js` and scoring interactions in `ReviewEngine`.

## Formula

```text
extractionQuality * 0.18
+ seoQuality * 0.14
+ completeness * 0.14
+ duplicateSafety * 0.14
+ verificationScore * 0.30
+ sourceConfidence * 0.06
+ freshness * 0.04
```

## Verified

- `duplicateSafety = 100 - duplicateRisk`.
- 90+ maps to `recommended_publish`.
- 75-89 maps to `review_recommended`.
- Below 75 maps to `manual_review_required`.
- Critical blockers override the score to `blocked`.

## Defects Fixed

Added blocker override support for:

- `ungrounded_vacancies`
- `ungrounded_salary`
- `ungrounded_qualification`
- `ungrounded_age`

## Result

Pass. Readiness scoring is deterministic, bounded, and blocker-aware.
