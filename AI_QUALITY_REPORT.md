# AI Quality Report

Audit date: 2026-06-04

## Recent Draft Review

Live review inspected 5 recent `ai_job_drafts`.

| Metric | Result |
| --- | ---: |
| Recent drafts reviewed | 5 |
| Current Phase 2 drafts with `phase2_extraction` | 2 |
| Current Phase 2 validation pass | 2 / 2 |
| Legacy/non-Phase 2 draft shape | 3 |
| Raw provider objects in draft metadata | 0 |

The 3 legacy drafts do not contain `generated_data.phase2_extraction`, so they are not counted as current Phase 2 extraction-quality evidence.

## Current Phase 2 Quality

| Draft | Provider | Score | Status | Missing Fields | Validation |
| --- | --- | ---: | --- | --- | --- |
| Railway Recruitment Board | Cerebras | 74 | pending_review | vacancies, qualification, age, salary, application mode, location | pass |
| DRDO/RAC GATE notice | Cerebras | 85 | published | vacancies, age, salary, application mode, location | pass |

Missing fields were absent or not explicit in source data and were represented as "Not specified" rather than invented.

## SEO Quality

| Metric | Current Phase 2 Result |
| --- | ---: |
| SEO score range | 85-100 |
| SEO title present | 2 / 2 |
| SEO description present | 2 / 2 |
| FAQ/schema present | 2 / 2 |

SEO generation is deterministic and grounded in validated extraction fields.

## Duplicate Accuracy

| Metric | Result |
| --- | ---: |
| Current Phase 2 max duplicate risk | 0 after self-match exclusion |
| Duplicate log rows | 1 |
| Regression coverage | exact URL risk, title/org similarity, raw self-match exclusion |

## Hallucination Rate

Current Phase 2 drafts: 0 validation-grounding failures after source comparison.

## Verdict

AI quality is production-acceptable for admin-reviewed drafts. The current gate correctly sends incomplete but grounded drafts to manual review instead of inventing missing facts.

