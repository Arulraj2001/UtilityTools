# Phase 3 Auto Tagging

Audit date: 2026-06-04

## Objective

Design `TagEngine` to generate consistent tags that improve filtering, related jobs, SEO, and moderation speed.

Tags should be explainable and source-derived.

## Tag Types

Required tag families:

- qualification tags
- organization tags
- exam tags
- location tags
- department tags

Recommended additional tag families:

- application mode
- job type
- source tier
- employment type
- deadline urgency

## Inputs

- `phase2_extraction`
- `generated_data`
- `raw_job_notifications.raw_text`
- `ai_job_sources`
- `AutoCategoryEngine` output
- existing job category list

## Output Shape

```json
{
  "tags": [
    "drdo",
    "scientist-b",
    "gate",
    "central-government",
    "engineering"
  ],
  "tagGroups": {
    "qualification": ["gate"],
    "organization": ["drdo"],
    "exam": ["scientist-b"],
    "location": ["india"],
    "department": ["defence"]
  },
  "confidence": 88,
  "warnings": []
}
```

## Normalization Rules

Tags should be:

- lowercase
- hyphen-separated
- ASCII-only
- max 40 characters
- no duplicates
- no promotional words
- no unsupported salary/vacancy tags

Examples:

- `Staff Selection Commission` -> `ssc`
- `Union Public Service Commission` -> `upsc`
- `Defence Research and Development Organisation` -> `drdo`
- `Bachelor Degree` -> `graduate`
- `Computer Based Test` -> `cbt`

## Qualification Tags

Signals:

- `10th`
- `12th`
- `diploma`
- `graduate`
- `postgraduate`
- `btech`
- `mbbs`
- `nursing`
- `iti`
- `gate`

Rule:

- only generate qualification tags when present in extraction or raw source
- do not infer qualification from job title alone unless the title is an exam with known qualification mapping and confidence is marked low/medium

## Organization Tags

Examples:

- `ssc`
- `upsc`
- `tnpsc`
- `rrb`
- `sbi`
- `ibps`
- `drdo`
- `isro`
- `aiims`

Rule:

- use canonical abbreviations for known organizations
- include full org slug only when no canonical abbreviation exists

## Exam Tags

Examples:

- `cgl`
- `chsl`
- `civil-services`
- `po`
- `clerk`
- `scientist-b`
- `assistant-professor`

Rule:

- exam tags must appear in title/source or known official source context

## Location Tags

Examples:

- `india`
- `tamil-nadu`
- `delhi`
- `maharashtra`

Rule:

- if location is missing, use `india` only when the source/category is national
- avoid city/state inference from organization name unless clear

## Department Tags

Examples:

- `defence`
- `railways`
- `banking`
- `education`
- `health`
- `engineering`

## Confidence Model

| Signal | Confidence |
| --- | ---: |
| tag appears exactly in source | high |
| tag comes from known organization map | high |
| tag comes from category suggestion | medium-high |
| tag inferred from broad job type | medium |
| tag inferred from title only | low-medium |

## Admin UX

Admin dashboard should show:

- suggested tags grouped by type
- confidence
- add/remove controls
- "apply all high-confidence tags"
- manual tag entry

## Database Plan

Recommended storage:

- keep final tags in `jobs.tags`
- keep draft tag suggestions in `ai_review_results.tag_suggestion jsonb`
- keep admin override history in `ai_moderation_actions`

## Verdict

TagEngine should be deterministic-first, evidence-based, and admin-editable.

