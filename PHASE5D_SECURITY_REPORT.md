# Phase 5D Security Report

Date: 2026-06-11

## Summary

Phase 5D introduces no new API routes, no new server-side logic, and no new database access patterns. All security properties are inherited from the pre-existing API layer.

## Authentication

All new UI calls go through `adminApiRequest` in `src/api/adminOperationsApi.js`.

Every request:
1. Calls `getAdminAccessToken()` which reads the current Supabase session
2. Fails with 401 if no session exists
3. Attaches `Authorization: Bearer {token}` to every request
4. The server-side handler calls `requireAdmin(req, supabase)` which validates the JWT and checks the admin role

No admin API route can be called without a valid admin session.

## Authorization

All routes called by Phase 5D UI require admin role on the server:

| Route | Server-side auth |
| --- | --- |
| POST /api/admin/fetch/run | requireAdmin |
| POST /api/admin/fetch/source/[id] | requireAdmin |
| GET /api/admin/fetch/status | requireAdmin |
| GET /api/admin/ai/status | requireAdmin |
| POST /api/admin/ai/process-queue | requireAdmin |
| POST /api/admin/ai/process-item/[id] | requireAdmin |
| POST /api/admin/publish/[id] | requireAdmin via createAdminReviewContext |
| POST /api/admin/review-queue/bulk-approve | requireAdmin via createAdminReviewContext |
| POST /api/admin/review-queue/bulk-reject | requireAdmin via createAdminReviewContext |

The middleware.ts protects all /admin/* routes at the edge.

## Input Validation

All UI inputs are validated before API calls:

- `runFetchAll`: only passes `sourceIds` (array of IDs) or empty body — no user freeform input
- `processAiQueue`: passes `limit` (bounded by server to max 25) and `itemIds` (bounded array)
- `processAiQueueItem`: item ID from database row (not user-typed)
- `publishJob`: passes `confirm: true`, `overrideBlocker` (boolean), `reasonCode` (constant string), `notes` (textarea, max 1000 chars typical)
- `bulkApproveReviewItems` / `bulkRejectReviewItems`: passes `draftIds` (array of database IDs from selection), `confirm: true`, `reasonCode` (constant)

No raw SQL, no template injection, no exec calls.

## Audit Trail Preservation

The `publishJob` call requires `confirm: true` and passes a `reasonCode` and optional `notes`. The server-side `AdminReviewService.publishJob` records an `ai_moderation_actions` row with `action_type: 'publish'`, preserving the complete audit trail.

Bulk moderation calls pass `reasonCode: 'phase5d_bulk_moderation'`, ensuring all bulk actions are traced in `ai_moderation_actions`.

The Pipeline Evidence Drawer reads existing `ai_moderation_actions` rows — it does not write any data.

## Override Blocker

The publish dialog exposes the override blocker checkbox **only when quality gate errors are returned**. The checkbox state is passed as `overrideBlocker: Boolean` to the API. The server-side handler applies additional validation and logs the override in the audit trail.

## Data Displayed

The Pipeline Evidence Drawer and Audit Timeline display data read from:
- `getReviewItem(id)` — existing API that already returns `actions`, `rawNotification`, `queueItem`, `draft`, `review`, `verification`
- No new database queries were added
- Data is displayed read-only — no write operations from the evidence/audit views

## CSRF

All API calls use `Authorization: Bearer {token}` header authentication. This header is not automatically sent by browsers on cross-origin requests, providing CSRF protection equivalent to the pre-existing API calls.

## No New Attack Surface

- No new API endpoints created
- No new server-side code added
- No new database tables or functions used
- No new environment variables required
- No changes to middleware, auth, or session handling

## Verdict

SECURE — Phase 5D introduces no new security risk. All actions are admin-only, authenticated, audited, and use the same security model as the existing API layer.
