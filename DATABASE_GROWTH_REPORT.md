# Database Growth Report

Audit date: 2026-06-04

## Live Average Serialized Row Sizes

| Table | Rows sampled | Avg bytes | Max bytes |
| --- | ---: | ---: | ---: |
| `raw_job_notifications` | 6 | 2,413 | 6,076 |
| `ai_research_queue` | 6 | 3,592 | 6,897 |
| `ai_job_drafts` | 5 | 53,053 | 231,271 |
| `ai_provider_failures` | 53 | 408 | 559 |

`ai_job_drafts` dominates growth because it stores generated HTML, SEO metadata, FAQ, schema, and extraction metadata.

## Baseline Assumption

Baseline planning volume: 1,000 jobs/month.

Failure rows are estimated at 0.5 provider failure records per job in a healthy production environment. Current failure count is inflated by provider validation and monitoring runs.

## Raw Data Growth, Baseline 1,000 Jobs/Month

| Period | Raw notifications | Queue rows | Draft rows | Provider failure rows | Data size |
| --- | ---: | ---: | ---: | ---: | ---: |
| 6 months | 6,000 | 6,000 | 6,000 | 3,000 | ~356 MB |
| 1 year | 12,000 | 12,000 | 12,000 | 6,000 | ~712 MB |
| 3 years | 36,000 | 36,000 | 36,000 | 18,000 | ~2.1 GB |

With indexes, JSONB overhead, and table bloat, plan roughly 2x:

| Period | Operational storage estimate |
| --- | ---: |
| 6 months | ~0.7 GB |
| 1 year | ~1.4 GB |
| 3 years | ~4.3 GB |

## Scaling Multipliers

- 100 jobs/month: divide estimates by 10.
- 10,000 jobs/month: multiply estimates by 10.

## Recommendations

- Add retention/archival policy for `ai_provider_failures`.
- Consider compacting old `raw_text` for processed rows after published job retention requirements are defined.
- Monitor `ai_job_drafts.generated_data` size; one draft reached ~231 KB serialized.

## Verdict

Database growth is manageable for Phase 3, with `ai_job_drafts` retention being the main long-term storage lever.

