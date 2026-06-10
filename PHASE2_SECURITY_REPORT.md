# Phase 2 Security Report

Audit date: 2026-06-04

## Areas Reviewed

- Prompt injection resistance
- Source instruction isolation
- API key protection
- Admin-only endpoints
- Queue abuse protection
- Provider failure logging

## Findings and Fixes

| Finding | Severity | Status |
| --- | --- | --- |
| Draft metadata stored raw provider attempt objects that could include secrets | Critical | Fixed and live metadata scrubbed |
| Rejected queue items left raw source rows queued | Medium | Fixed and live rows reconciled |
| Batch processing endpoint accepted arbitrary batch size | Medium | Fixed with 25-item cap |
| Same-host fabricated links could pass validation | High | Fixed |
| Sensitive numeric grounding was too permissive | High | Fixed |

## API Key Protection

Post-fix:

- `ProviderSelector` attempts expose only `providerId`, `providerName`, model, timing, token count, and classified error fields.
- `QueueWorker.saveDraft` sanitizes attempts before saving.
- Existing live `ai_job_drafts` were scrubbed: 5 scanned, 2 updated, 0 raw provider objects remain.
- Admin UI provider helpers expose `has_api_key`, not raw keys.
- Provider proxy safe responses omit raw API keys.

## Prompt Injection Resistance

`buildExtractionPrompt` explicitly:

- treats source text as untrusted data
- instructs the model to ignore source-contained instructions
- requires JSON-only output
- instructs the model not to invent facts

Regression tests verify the untrusted source boundary.

## Admin-only Endpoints

All Phase 2 admin API endpoints require `requireAdmin`:

- `POST /api/admin/ai/process-queue`
- `POST /api/admin/ai/process-item/:id`
- `GET /api/admin/ai/status`
- `GET /api/admin/ai/failures`

Service-role Supabase access remains server-side only.

## Queue Abuse Protection

`process-queue` now caps:

- `limit` to 25
- explicit `itemIds` to 25

## Verdict

Security is production-ready after the fixes and live metadata scrub.

