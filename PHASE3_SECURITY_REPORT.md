# Phase 3 Security Report

## Access Control

- All new admin APIs call the existing `requireAdmin` helper.
- Admin identity is verified through Supabase auth and `admin_users.is_admin`.
- Service-role access is created only inside serverless API handlers.
- No provider keys, service-role keys, auth tokens, or API secrets are returned by Phase 3 APIs.

## Human Control

- No auto publish exists.
- Conversion creates a `jobs` row with `status = 'draft'`.
- Approval requires an existing Phase 3 review or runs one before approval.
- Blocked drafts cannot be approved.
- Publishing requires a separate admin endpoint call with `confirm=true`.
- Bulk actions require `confirm=true`.
- Bulk actions are capped at 25 items.

## Fact Safety

Phase 3 blocks:

- Hallucinated URLs.
- Organization mismatch.
- Duplicate URL.
- Duplicate risk >= 80.
- Invalid critical date.
- No raw evidence.

## Audit Trail

The following actions create `ai_moderation_actions` rows:

- `run_review`
- `approve`
- `reject`
- `needs_revision`
- `bulk_approve`
- `bulk_reject`
- `convert_to_draft`
- `publish`
- `override_blocker`

## RLS

RLS is enabled on:

- `ai_review_results`
- `ai_fact_verifications`
- `ai_moderation_actions`

Policies are admin-only and use the existing `admin_users` table.

## Residual Risk

The existing admin UI has not yet been upgraded to display the new queue and review evidence. The backend support is ready for that dashboard layer.
