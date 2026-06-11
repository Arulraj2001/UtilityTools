# Phase 5D UI Report

Date: 2026-06-11

## Pages Modified

### /admin/ai-sources

Before: Source management only — no fetch execution capability.

After:
- "Run All Active Sources" green button in page header (disabled when running)
- Per-row "Run" button visible on hover for active sources
- Confirmation dialog before running (count of active sources shown)
- FetchResultPanel appears after run: sources count, items found, saved, duplicates, failures, last run time
- Per-source result rows in panel (source name, found, saved, failures, error message if any)
- Fetch status banner at top (last run timestamp, active source count, total notifications)
- All controls have descriptive button IDs for testing (e.g. `run-all-sources-btn`, `run-source-{id}`)

### /admin/ai-research

Before: "Generate Draft" button using client-side AI provider calls.

After:
- "Process Pending (N)" blue button → server QueueWorker batch
- "Process Selected (N)" indigo button (appears when items checked) → server QueueWorker with itemIds
- Per-item "Process via Server" blue button (for pending items)
- Per-item "Retry" button (for rejected items) 
- Worker status banner: idle/processing state, pending count, processing count, last run time
- Row checkboxes on every item
- Select-all-pending control in list header
- ProcessResultPanel: processed/succeeded/failed/skipped tiles, expandable per-item results
- Server worker explanation note at page bottom
- Button IDs: `process-pending-queue-btn`, `process-selected-queue-btn`, `server-process-{id}`, `queue-item-{id}`

### /admin/jobs

Before: "Edit" and "Delete" only. Publish was done inside JobEditor via direct status update.

After:
- "Publish" green button appears in job row for draft/pending/pending_review jobs
- PublishDialog opens with:
  - Job title, organization, and current status badge
  - Notes textarea (included in moderation audit trail)
  - Error alert showing quality gate errors when present
  - Override blocker checkbox (only shown when errors exist)
  - "Confirm & Publish" button calls POST /api/admin/publish/[id]
  - Loading state with spinner
  - Success state: job ID, published timestamp, audit action ID
- Job list refreshed on publish
- Button IDs: `publish-btn-{id}`, `publish-job-{id}`, `publish-job-dialog-confirm`

### /admin/ai-moderation

Before: Single-row approve/reject/needs-revision/convert/reject actions. No bulk selection. No audit history. No pipeline evidence.

After:

**Table:**
- Checkbox column added (leftmost column)
- Select-all checkbox in table header
- "Approve N" and "Reject N" bulk buttons appear in header when items are selected

**Bulk Moderation:**
- BulkConfirmDialog: shows action, count, description, blocked-item warning
- Post-action result banner: processed/succeeded/blocked counts

**Review Drawer — 3 tabs:**
1. "Review" tab (original view, unchanged UX)
2. "Audit (N)" tab — moderation audit timeline:
   - All `ai_moderation_actions` for this draft
   - Vertical timeline: dot + connector line
   - Each entry: color-coded action chip, admin ID (truncated), timestamp, reason code, notes
   - Supports: run_review, approve, reject, needs_revision, convert_to_draft, publish, override_blocker
3. "Evidence" button — opens PipelineEvidenceDrawer (full-width panel):
   - 6-step chain with real database IDs
   - Each step: icon, label, ID, status badge, key fields
   - Unfinished steps shown dashed/dimmed
   - Arrow connectors between steps
   - AuditTimeline embedded at bottom

**Button IDs:** `bulk-approve-btn`, `bulk-reject-btn`, `bulk-approve-confirm-btn`, `bulk-reject-confirm-btn`

### /admin/ai-intelligence (AiDashboard)

Before: Observational dashboard only. No operational buttons. Links to review queue and monitoring only.

After:
- "What Should I Do Next?" guidance panel in right sidebar (top card)
- Up to 7 prioritized recommendations driven by live dashboard metrics
- Each recommendation: colored badge, icon, description, optional action button, nav link
- Action buttons for: Run Fetch (POST /api/admin/fetch/run), Process Queue (POST /api/admin/ai/process-queue)
- Nav links for: Resolve Alerts, Review Drafts, Convert Approved, Publish Jobs, Resolve Blocked
- "All Clear" message when pipeline is healthy
- Last fetch/process results shown at bottom
- Worker status queried every 30 seconds
- Fetch status queried every 60 seconds
- Button IDs: `guidance-action-{i}` for each action button

## UX Principles Applied

1. **Confirmation before destruction** — All fetch/process/publish operations require confirmation
2. **Loading states** — All async buttons show spinner + disabled state during execution
3. **Result feedback** — All operations show result panels immediately after completion
4. **Non-technical language** — Labels like "Run All Active Sources", "Process Pending", "Confirm & Publish"
5. **Progressive disclosure** — Per-item results in ProcessResultPanel are collapsed by default
6. **Contextual controls** — Publish button only shown for publishable jobs; Run button only for active sources
7. **Unique IDs** — All interactive controls have descriptive IDs for browser testing
