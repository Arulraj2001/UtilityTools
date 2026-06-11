# Phase 5D Architecture

Date: 2026-06-11
Status: Implemented

## Scope

Phase 5D wires existing API routes and existing data into existing admin pages, making the platform fully operable by a non-technical admin without SQL, Postman, curl, or direct API calls.

## Protected Areas

This implementation does NOT modify:
- Fetchers or source adapters
- Cron architecture or queue architecture
- AI extraction, validation, or AI generation pipelines
- Review Intelligence or Moderation engine
- Monitoring engine or provider routing
- Database schema
- Public routes or SEO routes

## Changes Made

### 1. `src/api/adminOperationsApi.js` [MODIFIED]

Added all missing API wrappers for Phase 5D:

**Fetch Operations:**
- `runFetchAll(body)` → `POST /api/admin/fetch/run`
- `runFetchSource(sourceId)` → `POST /api/admin/fetch/source/[id]`
- `getFetchStatus()` → `GET /api/admin/fetch/status`
- `getFetchLogs({ limit, sourceId })` → `GET /api/admin/fetch/logs`

**AI Queue Processing:**
- `processAiQueue(body)` → `POST /api/admin/ai/process-queue` (uses production QueueWorker)
- `processAiQueueItem(itemId, body)` → `POST /api/admin/ai/process-item/[id]` (uses production QueueWorker)
- `getAiQueueStatus()` → `GET /api/admin/ai/status`

**Audited Publish:**
- `publishJob(jobId, body)` → `POST /api/admin/publish/[id]`

**Bulk Moderation:**
- `bulkApproveReviewItems(body)` → `POST /api/admin/review-queue/bulk-approve`
- `bulkRejectReviewItems(body)` → `POST /api/admin/review-queue/bulk-reject`

### 2. `src/pages/admin/ai/AiSources.jsx` [MODIFIED]

Added Fetch Operations UI:
- "Run All Active Sources" button → `POST /api/admin/fetch/run` with confirmation
- Per-source "Run" button → `POST /api/admin/fetch/source/[id]`
- Fetch status banner from `GET /api/admin/fetch/status`
- `FetchResultPanel` component showing: sources run, items found, items saved, duplicates, failures, last run timestamp, per-source results breakdown

### 3. `src/pages/admin/ai/AiResearchQueue.jsx` [MODIFIED]

Replaced client-side AI generation with server QueueWorker processing:
- "Process Pending" button → `POST /api/admin/ai/process-queue` with confirmation
- "Process Selected" button → `POST /api/admin/ai/process-queue` with itemIds
- Per-item "Process via Server" button → `POST /api/admin/ai/process-item/[id]`
- Per-item "Retry" button for rejected items
- Worker status banner from `GET /api/admin/ai/status`
- `ProcessResultPanel` showing: processed, succeeded, failed, skipped counts with per-item drill-down
- Row selection checkboxes for bulk operations
- Select-all-pending control

### 4. `src/pages/admin/jobs/AdminJobs.jsx` [MODIFIED]

Added audited publish button for draft/pending/pending_review jobs:
- "Publish" button per job row (only shown for publishable states)
- `PublishDialog` component with:
  - Confirmation step showing job title, organization, and current status
  - Notes textarea (included in moderation audit trail)
  - Quality gate error display
  - Override blocker checkbox (only shown when errors exist)
  - Calls `POST /api/admin/publish/[id]` with confirm: true
  - Success state showing job ID, published timestamp, and audit action ID

### 5. `src/pages/admin/ai/AiModeration.jsx` [MODIFIED]

Added three major features:

**Bulk Moderation:**
- Row checkboxes for each review item
- Select-all checkbox in table header
- "Approve N" and "Reject N" bulk action buttons (appear when items are selected)
- `BulkConfirmDialog` with count, action description, blocked-item warnings
- Calls `POST /api/admin/review-queue/bulk-approve` or `bulk-reject`
- Result banner showing processed/succeeded counts and blocked-item warnings

**Moderation Audit Timeline:**
- New "Audit" tab in the review drawer (shows action count badge)
- `AuditTimeline` component rendering all `ai_moderation_actions` rows
- Displays: timestamp, admin ID (truncated), action type (color-coded chip), reason code, notes
- Supports all action types: `run_review`, `approve`, `reject`, `needs_revision`, `convert_to_draft`, `publish`, `override_blocker`
- Read-only, chronological order

**Pipeline Evidence Drawer:**
- "Evidence" button in review drawer header opens full-width panel
- `PipelineEvidenceDrawer` showing complete chain:
  - `raw_job_notifications` → ID, status, source URL, PDF URL
  - `ai_research_queue` → ID, status, job type, organization
  - `ai_job_drafts` → ID, status, AI provider, tokens, generation time
  - `ai_review_results` → ID, decision band, readiness, confidence
  - `ai_fact_verifications` → ID, verification score, blocker count
  - `ai_moderation_actions` → last 3 actions timeline summary
- Each step shown with database ID, status, and key fields
- Steps not yet created shown as dashed/disabled
- Includes embedded AuditTimeline at bottom of evidence panel

### 6. `src/pages/admin/ai/AiDashboard.jsx` [MODIFIED]

Added Operations Guidance Panel in the right sidebar:
- "What Should I Do Next?" section with priority-ranked recommendations
- `OperationsGuidancePanel` component with:
  - **Resolve Critical Alerts** (priority 1) — when critical alerts > 0
  - **Run Fetch** (priority 2) — when last fetch > 3 hours ago, with "Run Now" action button
  - **Process Queue** (priority 3) — when pending queue > 0, with "Process Now" action button
  - **Review Drafts** (priority 4) — when review queue items > 0
  - **Convert Approved Drafts** (priority 5) — when approved drafts > 0
  - **Publish Draft Jobs** (priority 6) — when draft jobs > 0
  - **Resolve Blocked Drafts** (priority 7) — when blocked drafts > 0
  - **All Clear** — when pipeline is healthy
- Action buttons for Run Fetch and Process Queue directly execute operations from dashboard
- Nav links for all other recommendations
- Last fetch/process result displayed at bottom of panel
- Worker status and fetch status polled at 30s/60s intervals

## Data Sources (Read Only)

All existing production data sources, no new tables:
- `ai_research_queue` (via review-queue and research-queue APIs)
- `ai_job_drafts` (via review-item API)
- `ai_review_results` (via review-item API)
- `ai_fact_verifications` (via review-item API)
- `ai_moderation_actions` (via review-item API, detail.actions)
- `raw_job_notifications` (via review-item API, detail.rawNotification)
- `ai_job_sources` (via getAiSources)
- `job_fetch_logs` (via getFetchLogs)
- `monitoring_metrics_snapshots` (via getMonitoringOverview)
- `monitoring_alerts` (via getMonitoringAlerts)
- `jobs` (via useAdminJobs)

## API Routes Used (All Pre-Existing)

| Route | Feature |
| --- | --- |
| `POST /api/admin/fetch/run` | Run All Sources, Guidance Panel |
| `POST /api/admin/fetch/source/[id]` | Per-Source Run |
| `GET /api/admin/fetch/status` | Fetch Status Banner |
| `GET /api/admin/fetch/logs` | (Available, not yet surfaced in table) |
| `GET /api/admin/ai/status` | Worker Status Banner |
| `POST /api/admin/ai/process-queue` | Process Pending/Selected, Guidance Panel |
| `POST /api/admin/ai/process-item/[id]` | Per-Item Server Process |
| `POST /api/admin/publish/[id]` | Audited Publish Dialog |
| `POST /api/admin/review-queue/bulk-approve` | Bulk Approve |
| `POST /api/admin/review-queue/bulk-reject` | Bulk Reject |
| `GET /api/admin/review-queue` | Review Queue (pre-existing) |
| `GET /api/admin/review-item/[id]` | Review Detail + Audit + Evidence |
| `POST /api/admin/review-item/[id]/run-review` | Run Review (pre-existing) |
| `POST /api/admin/approve/[id]` | Approve (pre-existing) |
| `POST /api/admin/reject/[id]` | Reject (pre-existing) |
| `GET /api/admin/monitoring/overview` | Guidance Panel Metrics |
| `GET /api/admin/monitoring/alerts` | Alerts Section |
