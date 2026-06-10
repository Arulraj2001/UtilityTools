# Phase 3 Publish Readiness Scoring

Audit date: 2026-06-04

## Objective

Design `PublishReadinessScore`, a 0-100 score that determines how much manual review a draft needs.

## Required Bands

| Score | Band | Meaning |
| ---: | --- | --- |
| 90+ | Recommended Publish | Safe for fast admin approval |
| 75-89 | Review Recommended | Needs targeted human review |
| Below 75 | Manual Review Required | Full manual review required |

## Inputs

Required inputs:

- extraction quality
- SEO quality
- duplicate risk
- verification score
- completeness score

Recommended additional inputs:

- source confidence
- spam risk
- freshness/deadline score
- category confidence
- tag confidence

## Formula

Recommended formula:

```text
publishReadiness =
  extractionQuality * 0.18
  + seoQuality * 0.14
  + completenessScore * 0.14
  + duplicateSafety * 0.14
  + verificationScore * 0.30
  + sourceConfidence * 0.06
  + freshnessScore * 0.04
```

Where:

```text
duplicateSafety = 100 - duplicateRisk
```

## Gating Overrides

Regardless of numeric score:

| Condition | Result |
| --- | --- |
| hallucinated URL detected | Manual Review Required or Blocked |
| organization mismatch | Blocked |
| duplicate risk >= 80 | Blocked |
| fact verification score < 60 | Manual Review Required |
| critical date invalid or unverified | Manual Review Required |
| no raw source evidence | Manual Review Required |
| public publish quality gate would fail | Manual Review Required |

## Output

```json
{
  "publishReadiness": 91,
  "band": "recommended_publish",
  "confidence": 88,
  "subscores": {
    "extractionQuality": 90,
    "seoQuality": 85,
    "completenessScore": 84,
    "duplicateSafety": 100,
    "verificationScore": 92,
    "sourceConfidence": 95,
    "freshnessScore": 80
  },
  "gatingOverrides": [],
  "warnings": []
}
```

## Subscore Sources

| Subscore | Source |
| --- | --- |
| extraction quality | Phase 2 `quality_scores.extractionScore` |
| SEO quality | Phase 2 `quality_scores.seoScore` or current job scorer |
| completeness | Phase 2 `quality_scores.completenessScore` |
| duplicate risk | Phase 2 duplicate analysis and duplicate log |
| verification | Phase 3 FactVerifier |
| source confidence | source tier, source URL, raw evidence |
| freshness | application deadline and source fetched date |

## Relationship to Existing Quality Gate

PublishReadinessScore is advisory.

Existing public publish quality gate remains authoritative for `jobs.status = published`.

Recommended flow:

1. PublishReadinessScore recommends action.
2. Admin approves.
3. Draft is converted to `jobs.status = draft`.
4. Optional final publish action runs existing job quality gate.

## Verdict

The 90/75 thresholds are appropriate if fact verification has gating power and no public publish happens without admin confirmation.

