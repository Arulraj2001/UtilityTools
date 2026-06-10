# Phase 3 Auto Categorization

Audit date: 2026-06-04

## Objective

Design `AutoCategoryEngine` to classify AI drafts into reliable government-job categories and reduce admin correction work.

It should suggest categories, not silently overwrite admin decisions.

## Target Categories

Required categories:

- TNPSC
- SSC
- UPSC
- Railway
- Banking
- Defence
- Teaching
- Medical
- Engineering
- State Government
- Central Government

## Inputs

Primary inputs:

- `generated_data.title`
- `generated_data.organization`
- `generated_data.category`
- `generated_data.tags`
- `generated_data.phase2_extraction`
- `ai_research_queue.job_type`
- `ai_research_queue.source_url`
- `raw_job_notifications.source_name`
- `raw_job_notifications.notification_url`
- `ai_job_sources.category`
- existing `job_categories`

## Classification Strategy

Use a layered deterministic-first model:

1. Source config/category match.
2. Official domain match.
3. Organization keyword match.
4. Title keyword match.
5. Extracted tags match.
6. Fallback to broader government category.

No LLM is required for normal categorization.

## Rule Examples

| Category | Signals |
| --- | --- |
| TNPSC | `tnpsc`, `Tamil Nadu Public Service Commission`, `tnpsc.gov.in` |
| SSC | `ssc`, `Staff Selection Commission`, `ssc.gov.in`, `ssc.nic.in` |
| UPSC | `upsc`, `Union Public Service Commission`, `upsc.gov.in` |
| Railway | `rrb`, `rrc`, `railway`, `indianrailways.gov.in` |
| Banking | `IBPS`, `SBI`, `RBI`, `bank`, `probationary officer`, `clerk` |
| Defence | `DRDO`, `ISRO`, `Army`, `Navy`, `Air Force`, `defence`, `MoD` |
| Teaching | `teacher`, `assistant professor`, `lecturer`, `TET`, `NET` |
| Medical | `doctor`, `nurse`, `medical officer`, `NHM`, `AIIMS` |
| Engineering | `engineer`, `scientist`, `technical officer`, discipline names |
| State Government | state PSC, state department, state-specific domain |
| Central Government | central ministry, UPSC/SSC/central public sector org |

## Output

```json
{
  "primaryCategory": "Defence",
  "secondaryCategories": ["Engineering", "Central Government"],
  "confidence": 92,
  "matchedSignals": [
    "organization: Defence Research and Development Organisation",
    "domain: rac.gov.in",
    "tag: DRDO"
  ],
  "warnings": []
}
```

## Confidence Rules

| Confidence | Meaning |
| --- | --- |
| 90-100 | source/domain/org strongly match |
| 75-89 | category likely, minor ambiguity |
| 50-74 | broad category only |
| below 50 | manual category required |

Confidence caps:

- cap at 70 if no organization is available
- cap at 75 if only title keywords matched
- cap at 60 if source category conflicts with title/org

## Admin Interaction

Dashboard should show:

- suggested category
- confidence
- matched evidence
- one-click apply
- manual override

Admin override should be stored in moderation audit history.

## Database Plan

Recommended columns in `ai_review_results`:

- `category_suggestion jsonb`
- `category_confidence integer`

Optional separate table if category feedback needs training history:

- `ai_category_feedback`

## Verdict

AutoCategoryEngine can safely reduce admin category work because it is evidence-based and deterministic-first.

