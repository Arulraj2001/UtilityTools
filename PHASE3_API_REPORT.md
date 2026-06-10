# Phase 3 API Report

## Admin Endpoints Added

- `GET /api/admin/review-queue`
- `GET /api/admin/review-item/:id`
- `POST /api/admin/review-item/:id/run-review`
- `POST /api/admin/approve/:id`
- `POST /api/admin/reject/:id`
- `POST /api/admin/review-item/:id/needs-revision`
- `POST /api/admin/review-item/:id/convert-to-job-draft`
- `POST /api/admin/publish/:id`
- `POST /api/admin/review-queue/bulk-approve`
- `POST /api/admin/review-queue/bulk-reject`

## Shared API Guarantees

- All endpoints require admin auth through the existing `requireAdmin` helper.
- Service-role Supabase access stays server-side only.
- Responses use `Cache-Control: no-store`.
- Bulk actions require `confirm=true`.
- Publish requires `confirm=true`.
- Bulk actions are capped at 25 items.
- Every state-changing endpoint writes an audit record.

## Import Smoke Test

Command run:

```bash
node --test api/_lib/reviewApi.js api/admin/review-queue/index.js api/admin/review-queue/bulk-approve.js api/admin/review-queue/bulk-reject.js api/admin/review-item/[id]/index.js api/admin/review-item/[id]/run-review.js api/admin/review-item/[id]/needs-revision.js api/admin/review-item/[id]/convert-to-job-draft.js api/admin/approve/[id].js api/admin/reject/[id].js api/admin/publish/[id].js
```

Result: 11 passed, 0 failed.
