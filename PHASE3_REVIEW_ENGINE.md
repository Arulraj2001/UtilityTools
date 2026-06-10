# Phase 3 Review Engine

Audit date: 2026-06-04

## Objective

Design `ReviewEngine`, a non-publishing intelligence layer that evaluates an `ai_job_drafts` row and produces a clear recommendation for admins.

It must not replace Phase 2 extraction, validation, queue worker, or provider infrastructure.

## Responsibility

`ReviewEngine` reviews:

- AI extraction quality
- SEO quality
- completeness
- duplicate risk
- source confidence
- fact-verification confidence
- moderation warnings

It does not:

- call the Phase 2 extraction pipeline
- mutate raw source content
- publish a job
- bypass admin approval

## Inputs

Primary inputs:

- `ai_job_drafts.generated_data`
- `ai_job_drafts.quality_scores`
- `ai_research_queue.extracted_data`
- `ai_research_queue.duplicate_check`
- linked `raw_job_notifications`
- `ai_duplicate_log`
- `jobs` table duplicate candidates
- `job_categories`
- `ai_job_sources`

Optional Phase 3 inputs:

- `ai_fact_verifications`
- `ai_review_results`
- `ai_moderation_actions`

## Output Shape

```json
{
  "publishReadiness": 0,
  "confidence": 0,
  "warnings": [],
  "recommendations": []
}
```

Recommended expanded metadata:

```json
{
  "publishReadiness": 92,
  "confidence": 88,
  "decisionBand": "recommended_publish",
  "subscores": {
    "extraction": 90,
    "seo": 86,
    "completeness": 84,
    "duplicateSafety": 96,
    "sourceConfidence": 94,
    "factVerification": 91
  },
  "warnings": [
    {
      "severity": "low",
      "field": "salary",
      "message": "Salary is not specified in source data."
    }
  ],
  "recommendations": [
    "Ready for one-click conversion to draft job.",
    "Admin should confirm the application deadline before public publish."
  ]
}
```

## Scoring Model

Recommended `publishReadiness` weighting:

| Component | Weight |
| --- | ---: |
| Extraction quality | 20% |
| SEO quality | 15% |
| Completeness | 15% |
| Duplicate safety | 15% |
| Fact verification | 25% |
| Source confidence | 10% |

Duplicate safety is `100 - duplicateRisk`.

## Confidence Model

Confidence measures how much the system trusts its own review.

Recommended inputs:

| Signal | Effect |
| --- | --- |
| Raw notification linked | positive |
| Official source URL reachable | positive |
| PDF URL verified | positive |
| Application URL verified | positive |
| Source tier 1 | positive |
| Multiple missing source fields | negative |
| Provider attempts failed before success | negative |
| Legacy draft without Phase 2 extraction | negative |
| Duplicate risk above 60 | negative |

Confidence should be lower than readiness when evidence is missing.

## Warning Taxonomy

Warning severity:

- `critical`: blocks publish recommendation
- `high`: requires manual review
- `medium`: review recommended
- `low`: informational

Warning categories:

- `fact_mismatch`
- `missing_required_fact`
- `source_unreachable`
- `duplicate_risk`
- `seo_gap`
- `content_gap`
- `category_uncertain`
- `tag_uncertain`
- `expired_deadline`
- `legacy_draft`

## Recommendation Taxonomy

Recommendations should be action-oriented:

- `recommended_publish`
- `review_recommended`
- `manual_review_required`
- `reject_recommended`
- `needs_fact_fix`
- `needs_seo_fix`
- `needs_category_fix`
- `duplicate_review_required`

## Integration Points

Recommended Phase 3 flow:

1. Draft is created by Phase 2.
2. `ReviewEngine` runs against the draft.
3. `FactVerifier` evidence is included.
4. Result is saved to `ai_review_results`.
5. Moderation queue sorts by readiness/confidence.
6. Admin sees recommendation, warnings, and suggested actions.

## Non-Goals

- Do not auto-publish to public jobs.
- Do not regenerate AI extraction.
- Do not change provider fallback.
- Do not weaken Phase 2 validation.

## Success Criteria

ReviewEngine is successful if:

- 90+ readiness drafts can be reviewed in under 60 seconds.
- High-risk drafts are clearly separated.
- Admins can understand every warning without reading raw JSON.
- No draft can be recommended for publish without fact-verification evidence.

