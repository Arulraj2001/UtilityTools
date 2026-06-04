# Queue Validation

Validation date: 2026-06-04

## Flow Validated

`raw_job_notifications` -> `ai_research_queue`

## Evidence

| Check | Result |
| --- | --- |
| Raw rows created | 6 |
| Queue rows created | 6 |
| Raw status after enqueue | `queued` |
| Raw rows with `queue_item_id` | 6 / 6 |
| Queue rows with `source_url` | 6 / 6 |
| Queue rows with `extracted_data.raw_notification_id` | 6 / 6 |
| Queue status | `pending` |

## Recent Queue Titles

- `Advertisement No.05 - 2026`
- `Notification`
- `Hindi /(370 KB)`
- `Recruitment`
- ISRO corrigendum title
- DRDO GATE score public notice title

## Findings

The queue link works technically, but some extracted titles are too generic or were captured before the SBI parser fix.

## Verdict

Queue mechanics passed.

Data quality is not yet sufficient to approve Phase 2.
