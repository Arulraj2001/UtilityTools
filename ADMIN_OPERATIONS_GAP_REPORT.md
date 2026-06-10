# Admin Operations Gap Report

Date: 2026-06-07

Scope: Read-only audit of the current codebase's admin API handlers, admin pages, client API wrappers, and AI/job operational tables. No application code changes were made.

## Executive Verdict

The platform is not fully operable by a non-technical admin today.

A non-technical admin can manage sources, providers, prompts, manual research queue items, review individual AI drafts, convert approved AI drafts into normal job drafts, edit jobs, and publish jobs through the Jobs editor. However, the full production workflow from official-source fetch to server-side AI processing to audited publish still requires direct API calls, SQL checks, or technical knowledge.

The biggest blocker is that production-safe server operations exist as API routes but are not exposed as UI controls:

- Official source fetch execution.
- Server-side AI queue processing.
- Source-specific fetch execution.
- Batch/single server queue processing.
- Bulk moderation.
- Audited publish through `POST /api/admin/publish/[id]`.
- Row-level operational evidence for raw notifications, fetch logs, failures, moderation actions, and usage.

## Critical Gaps

1. Official fetch is API-only.
   - Existing routes: `POST /api/admin/fetch/run`, `POST /api/admin/fetch/source/[id]`.
   - Current UI: `/admin/ai-sources` manages source records but has no "Run fetch now" action.
   - Impact: admins cannot start official ingestion without Postman, curl, or a cron trigger.

2. Server-side AI queue processing is API-only.
   - Existing routes: `POST /api/admin/ai/process-queue`, `POST /api/admin/ai/process-item/[id]`.
   - Current UI: `/admin/ai-research` has a `Generate Draft` button, but it uses client-side provider calls and direct Supabase writes, not the production `QueueWorker` endpoint.
   - Impact: the UI does not operate the same path as the production server worker.

3. Audited publish is not wired into Jobs UI.
   - Existing route: `POST /api/admin/publish/[id]`.
   - Current UI: `/admin/jobs` publishes by toggling `status` in `JobEditor` and calling direct Supabase `updateJob`.
   - Impact: UI publish can bypass the moderation service's `publish` audit action in `ai_moderation_actions`.

4. Bulk moderation APIs exist but have no UI.
   - Existing routes: `POST /api/admin/review-queue/bulk-approve`, `POST /api/admin/review-queue/bulk-reject`.
   - Current UI: `/admin/ai-moderation` only exposes row-level approve/reject/needs revision/convert actions.
   - Impact: high-volume review remains labor-heavy.

5. Operational evidence is fragmented.
   - `/admin/ai-reports`, `/admin/ai-intelligence`, and `/admin/ai-scale-ops` show useful aggregates.
   - Missing: a single per-notification chain view from `raw_job_notifications` -> `ai_research_queue` -> `ai_job_drafts` -> `ai_review_results` -> `jobs`.
   - Impact: admins still need SQL to prove one official notification became one published job.

6. Raw fetch data is not a first-class admin surface.
   - `getRawJobNotifications` exists in `src/api/supabaseApi.js` but is not used by an admin page.
   - Impact: admins cannot inspect raw notification status, queue linkage, raw URL/PDF, duplicate state, or failure state from UI.

7. Moderation audit history is not displayed.
   - `AdminReviewService.getReviewItem` returns recent `ai_moderation_actions`, but `/admin/ai-moderation` does not render them.
   - Impact: admins cannot see who approved, rejected, reviewed, converted, overrode, or published from the review drawer.

8. Individual monitoring endpoints are not directly surfaced.
   - Wired: `/api/admin/monitoring/overview`, `/api/admin/monitoring/alerts`, `/api/admin/monitoring/scale-ops`.
   - Not directly wired: `/api/admin/monitoring/providers`, `/queue`, `/quality`, `/moderation`, `/costs`.
   - Impact: monitoring is mostly aggregate/reporting, not operational drill-down.

9. Fetch health endpoints are not wired into admin pages.
   - Existing routes: `GET /api/admin/fetch/status`, `GET /api/admin/fetch/logs`.
   - Current UI: reports read fetch logs/failures directly from Supabase helpers, but the admin API routes are unused.
   - Impact: endpoint behavior cannot be exercised or trusted from UI.

10. The admin IA does not show the required operating sequence.
    - Current AI nav has many pages: Dashboard, Research Queue, Moderation, Duplicates, SEO Audit, Monitoring, Updates, Sources, Settings, Prompts, Reports, Scale Ops.
    - Missing: "Start here" / "Next action" guidance for the production pipeline.
    - Impact: a non-technical admin cannot confidently know what to do next.

## 1. Admin Workflows Still Requiring Direct API Calls

| Workflow | Existing API | UI status | Notes |
| --- | --- | --- | --- |
| Run all/selected official source fetches | `POST /api/admin/fetch/run` | Not wired | Required for manual official ingestion. |
| Run one source fetch | `POST /api/admin/fetch/source/[id]` | Not wired | Natural place is Source Management row action. |
| View fetch health through admin API | `GET /api/admin/fetch/status` | Not wired | Reports use direct Supabase helpers instead. |
| View fetch logs through admin API | `GET /api/admin/fetch/logs` | Not wired | No row-level log browser. |
| Process server AI queue batch | `POST /api/admin/ai/process-queue` | Not wired | `/admin/ai-research` uses a different client-side generation path. |
| Process one server AI queue item | `POST /api/admin/ai/process-item/[id]` | Not wired | Needed for retries and controlled single-item processing. |
| View queue worker status | `GET /api/admin/ai/status` | Not wired | Dashboard uses monitoring overview, not this route. |
| View AI/provider failures through admin API | `GET /api/admin/ai/failures` | Route not wired | `/admin/ai-settings` reads provider failures directly from Supabase. |
| Bulk approve review items | `POST /api/admin/review-queue/bulk-approve` | Not wired | No selection model in moderation page. |
| Bulk reject review items | `POST /api/admin/review-queue/bulk-reject` | Not wired | No selection model in moderation page. |
| Audited publish | `POST /api/admin/publish/[id]` | Not wired | Jobs editor can publish via direct status update, but not the moderation service route. |
| Manual cron-style fetch trigger | `GET/POST /api/cron/fetch-jobs` | Not admin UI | Cron-secret path only. |

The following moderation APIs are wired into `/admin/ai-moderation`: `GET /api/admin/review-queue`, `GET /api/admin/review-item/[id]`, `POST /api/admin/review-item/[id]/run-review`, `POST /api/admin/approve/[id]`, `POST /api/admin/reject/[id]`, `POST /api/admin/review-item/[id]/needs-revision`, and `POST /api/admin/review-item/[id]/convert-to-job-draft`.

## 2. Operational Actions Missing From The Admin Dashboard

The AI Operations Dashboard (`/admin/ai-intelligence`) is mostly observational. It links to review and monitoring but does not let admins operate the system.

Missing actions:

- Run fetch for all active sources.
- Run fetch for selected source.
- Process pending AI queue items.
- Process or retry one queue item.
- Recover stale processing queue items.
- Show latest fetch run outcome with source-level errors.
- Show raw notification rows created by a fetch run.
- Show a pipeline chain for a selected notification.
- Bulk approve/reject moderation items.
- Publish a converted job through the audited publish endpoint.
- Open a moderation action history for a draft/job.
- Re-run review for selected/bulk items.
- Export or copy diagnostic evidence for a full E2E run.
- Show "blocked by quality gate" reasons before publish.

## 3. APIs That Exist But Are Not Wired Into Any Admin Page

Fully or effectively unwired admin/server routes:

| API | Purpose | Current UI wiring |
| --- | --- | --- |
| `POST /api/admin/fetch/run` | Run fetch across sources | None |
| `POST /api/admin/fetch/source/[id]` | Run one source | None |
| `GET /api/admin/fetch/status` | Fetch health/status | None |
| `GET /api/admin/fetch/logs` | Fetch logs | None |
| `GET /api/admin/ai/status` | Queue worker status | None |
| `POST /api/admin/ai/process-queue` | Server batch queue processing | None |
| `POST /api/admin/ai/process-item/[id]` | Server single queue item processing | None |
| `GET /api/admin/ai/failures` | Provider failures via admin API | Not routed; similar data is read directly in AI Settings |
| `POST /api/admin/review-queue/bulk-approve` | Bulk approve | None |
| `POST /api/admin/review-queue/bulk-reject` | Bulk reject | None |
| `POST /api/admin/publish/[id]` | Audited publish | None |
| `GET /api/admin/monitoring/providers` | Provider monitoring detail | None directly |
| `GET /api/admin/monitoring/queue` | Queue monitoring detail | None directly |
| `GET /api/admin/monitoring/quality` | Quality monitoring detail | None directly |
| `GET /api/admin/monitoring/moderation` | Moderation monitoring detail | None directly |
| `GET /api/admin/monitoring/costs` | Cost monitoring detail | None directly |
| `GET/POST /api/cron/fetch-jobs` | Cron fetch trigger | Cron-only, no admin control |

Wired admin routes:

- `GET /api/admin/monitoring/overview`
- `GET /api/admin/monitoring/alerts`
- `GET /api/admin/monitoring/scale-ops`
- `GET /api/admin/review-queue`
- `GET /api/admin/review-item/[id]`
- `POST /api/admin/review-item/[id]/run-review`
- `POST /api/admin/approve/[id]`
- `POST /api/admin/reject/[id]`
- `POST /api/admin/review-item/[id]/needs-revision`
- `POST /api/admin/review-item/[id]/convert-to-job-draft`

## 4. Tables Not Surfaced As First-Class Admin UI

Several tables are used by services, reports, or detail endpoints, but do not have first-class row-level admin views.

| Table | Current UI exposure | Gap |
| --- | --- | --- |
| `raw_job_notifications` | Minimal/indirect source URL in moderation detail; `getRawJobNotifications` unused | No raw notification browser, status view, or pipeline evidence view. |
| `job_fetch_logs` | Used in reports/analytics helpers | No log table with source, status, duration, counts, and errors. |
| `fetch_failures` | Used in reports/analytics helpers | No failure triage page. |
| `job_fetch_duplicates` | Used in reports/analytics helpers | No official-fetch duplicate review list. |
| `ai_fact_verifications` | Verification scores/blockers shown in moderation detail | No verification history table or stale/current comparison. |
| `ai_moderation_actions` | Used for SLA/report calculations; fetched by review detail service but not rendered | No visible audit trail for admin actions. |
| `ai_generation_usage` | Used in cost/monitoring services | No raw usage/cost ledger for provider calls. |
| `monitoring_metrics_snapshots` | Service-level only | No snapshot history UI. |

Tables that are surfaced more clearly:

- `ai_job_sources`: `/admin/ai-sources`
- `ai_research_queue`: `/admin/ai-research`, `/admin/ai-reports`
- `ai_job_drafts`: `/admin/ai-moderation`, `/admin/ai-reports`
- `ai_review_results`: `/admin/ai-moderation`, `/admin/ai-reports`
- `ai_duplicate_log`: `/admin/ai-duplicates`
- `ai_monitoring_rules`: `/admin/ai-monitoring`
- `ai_update_queue`: `/admin/ai-updates`
- `ai_provider_settings`: `/admin/ai-settings`
- `ai_provider_failures`: `/admin/ai-settings`
- `jobs`: `/admin/jobs`

## 5. Top 10 Usability Gaps For A Non-Technical Admin

1. No UI button to run official source fetching.
2. No UI button to process the production server AI queue.
3. The Research Queue `Generate Draft` button uses a client-side path that differs from the server worker path.
4. No single page shows the official notification -> queue -> AI draft -> review -> job draft -> published job chain.
5. No raw notification browser for official-source evidence.
6. No row-level fetch log/failure/duplicate triage UI.
7. No audited publish button in Jobs Management.
8. No visible moderation action timeline.
9. No bulk approve/reject controls in the review queue.
10. The admin navigation is feature-rich but does not guide the operator through the required production sequence.

## 6. Smallest UI Improvements Needed For Full Non-Technical Operation

The smallest useful set is not a new phase. It is wiring existing routes and data into the existing admin pages.

| Improvement | Where | Existing backend/API | Estimated effort |
| --- | --- | --- | --- |
| Add missing admin API wrappers | `src/api/adminOperationsApi.js` | Existing routes | 0.5 day |
| Add "Run Fetch" controls | `/admin/ai-sources` and `/admin/ai-intelligence` | `POST /api/admin/fetch/run`, `POST /api/admin/fetch/source/[id]` | 1 day |
| Add fetch status/log panel | `/admin/ai-intelligence` or `/admin/ai-reports` | `GET /api/admin/fetch/status`, `GET /api/admin/fetch/logs` | 1 day |
| Replace/add server processing buttons | `/admin/ai-research` | `POST /api/admin/ai/process-queue`, `POST /api/admin/ai/process-item/[id]` | 1 to 1.5 days |
| Add raw notification/pipeline evidence drawer | `/admin/ai-research` or new tab in reports | Existing tables and review detail context | 1.5 to 2 days |
| Wire audited publish action | `/admin/jobs` | `POST /api/admin/publish/[id]` | 0.5 to 1 day |
| Add bulk selection and moderation actions | `/admin/ai-moderation` | `bulk-approve`, `bulk-reject` | 1 day |
| Render moderation action history | `/admin/ai-moderation` drawer | Existing `getReviewItem` actions payload | 0.5 day |
| Add failure triage rows | `/admin/ai-reports` or `/admin/ai-intelligence` | Fetch failures, provider failures, duplicate rows | 1 day |
| Add guided "Next action" checklist | `/admin/ai-intelligence` | Existing counts/status endpoints | 0.5 to 1 day |

Estimated smallest total: 7 to 10 engineering days for one experienced frontend/full-stack engineer, including basic tests and production smoke testing. A very lean version that only adds fetch, process queue, audited publish, and action history could be done in about 3 to 5 days, but it would still leave evidence and triage weaker than ideal.

## Recommended Fixes

Recommended priority order:

1. Wire server operations into UI.
   - Add wrappers for fetch run/source, fetch status/logs, AI status, process queue/item, bulk approve/reject, and publish.

2. Make `/admin/ai-research` operate the server worker.
   - Add "Process selected", "Process pending", and "Retry/force process" actions.
   - Label any remaining client-side generation path as manual/fallback if it stays.

3. Add source fetch controls to `/admin/ai-sources`.
   - Per-source "Run now".
   - Global "Run active sources".
   - Show last result, items found, items saved, duplicates, failures.

4. Add audited publish to `/admin/jobs`.
   - For AI-origin jobs, use `POST /api/admin/publish/[id]`.
   - Keep the quality gate error visible before publish.
   - Show publish audit status.

5. Add a pipeline evidence drawer.
   - Input: raw id, queue id, draft id, or job id.
   - Output: linked rows from raw notification, queue, draft, current review, verification, moderation actions, and job.

6. Render moderation action history.
   - Use the existing `actions` returned by `GET /api/admin/review-item/[id]`.
   - Show action, admin, timestamp, reason, notes, linked job id.

7. Add failure triage views.
   - Fetch failures.
   - Fetch duplicates.
   - Provider failures.
   - Failed/rejected queue items.

8. Add bulk moderation controls.
   - Select rows.
   - Confirm bulk approve/reject.
   - Show affected count and blocked-item warnings.

9. Consolidate operational status.
   - One dashboard card should answer: "What should the admin do next?"
   - Examples: run fetch, process pending queue, review drafts, convert approved drafts, publish job drafts.

10. Add UI smoke checklist for production E2E.
    - Fetch official notification.
    - Confirm queue item.
    - Process AI queue.
    - Run review.
    - Approve.
    - Convert.
    - Publish.
    - Verify public page.

## Final Assessment

The platform is partially operable by a non-technical admin today.

It is not fully operable end-to-end without Postman, curl, SQL, or direct API calls, because the official ingestion and server-side AI processing routes are not exposed in the admin UI, the audited publish route is not used by Jobs Management, and operational evidence is not available as a single UI chain.

Once the existing APIs are wired into existing pages and row-level evidence is surfaced, the platform can become fully admin-operable without adding a new product phase.
