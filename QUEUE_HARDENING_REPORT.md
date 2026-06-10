# Queue Hardening Report

Audit date: 2026-06-04

## Scope

Validated the Phase 2 queue path:

`raw_job_notifications -> ai_research_queue -> AI extraction -> validation -> SEO -> duplicate analysis -> quality scoring -> ai_job_drafts`

No fetchers, source adapters, cron architecture, queue architecture, admin UI, or publishing workflow were changed.

## Production Snapshot After Fixes

| Area | Result |
| --- | ---: |
| `ai_research_queue` total | 6 |
| Pending | 2 |
| Processing | 0 |
| Drafted | 3 |
| Rejected | 1 |
| Saved later | 0 |
| `ai_job_drafts` total | 5 |
| Drafts pending review | 3 |
| Drafts published | 2 |
| `raw_job_notifications` queued | 2 |
| `raw_job_notifications` processed | 3 |
| `raw_job_notifications` failed | 1 |

Consistency checks after reconciliation:

| Check | Result |
| --- | ---: |
| Drafted queue rows missing `phase2_draft_id` | 0 |
| Rejected queue rows with raw source still queued | 0 |
| Stored raw provider attempt objects in drafts | 0 |

## Scenarios Tested

| Scenario | Evidence | Result |
| --- | --- | --- |
| Single queue item success | `queueWorker.test.js` | Draft saved, queue marked `drafted`, raw source marked `processed` |
| Single queue item extraction failure | `queueWorker.test.js` | No draft saved, queue marked `rejected`, raw source marked `failed` |
| Batch processing | Local deterministic stress test, 10/50/100 items | 100% drafted in mock provider path |
| Queue exhaustion | Local empty queue run | Returned `{ status: "success", processed: 0, results: [] }` |
| Retry behavior | `maxRetries` path in `QueueWorker.handleFailure` | Retry keeps queue pending; final failure rejects |

## Fixes Applied

- Final Phase 2 failures now mark the linked raw notification `failed` with `phase2_last_error`.
- Existing live rejected raw row was reconciled to `failed`.
- Existing drafted queue metadata was reconciled where a draft existed but the raw row was still queued.
- Batch API now caps `limit` and explicit `itemIds` at 25 per request to prevent accidental token burn.

## Verdict

Queue processing is production-ready after the state reconciliation and failure-recovery fix.

