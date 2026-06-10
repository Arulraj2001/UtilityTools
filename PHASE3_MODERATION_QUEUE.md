# Phase 3 Moderation Queue

Audit date: 2026-06-04

## Objective

Design `ModerationQueue` to prioritize AI drafts by readiness, confidence, and risk so admins review the safest drafts first.

## Queue Sources

Primary source:

- `ai_job_drafts`

Joined evidence:

- `ai_review_results`
- `ai_fact_verifications`
- `ai_research_queue`
- `raw_job_notifications`
- `ai_duplicate_log`

## Priority Rule

Highest priority:

- high publish readiness
- high confidence
- low duplicate risk
- no blocking fact issues
- fresh deadline

Lowest priority:

- poor quality
- high duplicate risk
- missing fact verification
- unverified application/PDF/date
- expired deadline
- legacy draft without Phase 2 extraction

## Queue Bands

| Band | Criteria | Admin Action |
| --- | --- | --- |
| Recommended Publish | readiness >= 90, confidence >= 85, duplicate risk < 40, no blockers | quick review, approve |
| Review Recommended | readiness 75-89 or confidence 70-84 | inspect warnings |
| Manual Review Required | readiness < 75 or confidence < 70 | full manual review |
| Blocked | critical warning or duplicate risk >= 80 | reject, revise, or investigate |

## Sort Formula

Recommended priority score:

```text
priority =
  publishReadiness * 0.45
  + confidence * 0.30
  + (100 - duplicateRisk) * 0.15
  + freshnessScore * 0.10
  - blockingPenalty
```

Blocking penalties:

- critical fact issue: -100
- high duplicate risk: -50
- source missing: -30
- legacy draft shape: -25
- expired deadline: -40

## Queue Item Display

Each row should show:

- title
- organization
- readiness badge
- confidence badge
- duplicate risk
- verification status
- category suggestion
- top warnings
- source tier
- generated date
- deadline

## Queue Actions

Single-item actions:

- approve recommendation
- reject
- needs revision
- edit draft
- convert to job draft
- publish job if allowed by policy
- open source evidence

Bulk actions:

- bulk approve high-confidence recommendations
- bulk reject blocked duplicates
- bulk mark needs revision

Bulk action constraints:

- only allowed for `recommended_publish` band
- no critical warnings
- duplicate risk below 40
- fact verification score at least 85
- admin confirmation required

## Status Model

Recommended Phase 3 review statuses:

- `review_pending`
- `review_ready`
- `recommended_publish`
- `manual_review_required`
- `blocked`
- `approved_for_draft`
- `converted_to_job_draft`
- `published_public`
- `rejected`
- `needs_revision`

These should live in Phase 3 review records, not replace `ai_job_drafts.status` immediately.

## Metrics

Track:

- average review time per draft
- percentage of drafts in each band
- bulk approval count
- manual intervention rate
- false positive recommendations
- rejected-after-recommended count

## Verdict

ModerationQueue should make high-confidence drafts obvious and keep risky drafts out of bulk workflows.

