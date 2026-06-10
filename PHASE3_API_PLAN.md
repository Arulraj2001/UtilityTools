# Phase 3 API Plan

Audit date: 2026-06-04

## Scope

API design only. No implementation.

All endpoints should be admin-only and should use server-side service-role Supabase access only after admin verification.

## API Principles

- Do not expose provider keys.
- Do not rerun Phase 2 extraction from Phase 3 endpoints.
- Do not publish publicly without explicit admin action.
- Log every approval, rejection, conversion, and publish action.
- Return explainable warnings and evidence.

## Proposed Endpoints

### GET `/api/admin/review-queue`

Purpose:

Return prioritized moderation queue.

Query params:

- `band`
- `status`
- `limit`
- `cursor`
- `sort`

Response:

```json
{
  "items": [],
  "nextCursor": null,
  "counts": {
    "recommended_publish": 0,
    "review_recommended": 0,
    "manual_review_required": 0,
    "blocked": 0
  }
}
```

### GET `/api/admin/review-item/:id`

Purpose:

Return one draft with review, verification, duplicate, source, and action history.

Response:

```json
{
  "draft": {},
  "review": {},
  "verification": {},
  "source": {},
  "duplicateEvidence": [],
  "actions": []
}
```

### POST `/api/admin/review-item/:id/run-review`

Purpose:

Run ReviewEngine against an existing draft.

Body:

```json
{
  "force": false
}
```

Response:

```json
{
  "review": {},
  "verification": {},
  "stale": false
}
```

### POST `/api/admin/approve/:id`

Purpose:

Approve a review recommendation.

Body:

```json
{
  "notes": "",
  "applyCategorySuggestion": true,
  "applyTagSuggestion": true
}
```

Response:

```json
{
  "ok": true,
  "draftStatus": "approved",
  "actionId": ""
}
```

### POST `/api/admin/reject/:id`

Purpose:

Reject an AI draft.

Body:

```json
{
  "reasonCode": "duplicate",
  "notes": ""
}
```

Response:

```json
{
  "ok": true,
  "draftStatus": "rejected",
  "actionId": ""
}
```

### POST `/api/admin/review-item/:id/needs-revision`

Purpose:

Mark a draft as needing revision.

Body:

```json
{
  "reasonCode": "missing_facts",
  "notes": ""
}
```

### POST `/api/admin/review-item/:id/convert-to-job-draft`

Purpose:

Create a `jobs` row with `status = draft`.

Requirements:

- admin permission
- no critical review blockers unless `overrideReason` is supplied
- action logged

Response:

```json
{
  "ok": true,
  "jobId": "",
  "jobStatus": "draft"
}
```

### POST `/api/admin/publish/:id`

Purpose:

Publish an existing job or converted draft.

Requirements:

- publish permission
- existing job quality gate passes
- no critical verification blockers
- explicit confirmation

Body:

```json
{
  "confirm": true,
  "notes": ""
}
```

Response:

```json
{
  "ok": true,
  "jobId": "",
  "jobStatus": "published"
}
```

### POST `/api/admin/review-queue/bulk-approve`

Purpose:

Bulk approve safe recommended drafts.

Body:

```json
{
  "draftIds": [],
  "confirm": true
}
```

Server must reject any draft that has:

- readiness below 90
- confidence below 85
- verification below 85
- duplicate risk >= 40
- critical warning

### POST `/api/admin/review-queue/bulk-reject`

Purpose:

Bulk reject blocked drafts or duplicates.

Requires reason code and notes.

## Error Codes

Recommended error codes:

- `REVIEW_NOT_FOUND`
- `DRAFT_NOT_FOUND`
- `FACT_VERIFICATION_REQUIRED`
- `CRITICAL_WARNING_BLOCKS_ACTION`
- `QUALITY_GATE_FAILED`
- `DUPLICATE_RISK_TOO_HIGH`
- `PUBLISH_PERMISSION_REQUIRED`
- `BULK_ACTION_NOT_ALLOWED`

## Verdict

Phase 3 APIs should separate review, approval, conversion to draft job, and public publish actions. That separation preserves safety and auditability.

