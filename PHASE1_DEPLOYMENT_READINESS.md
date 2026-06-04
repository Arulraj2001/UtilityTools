# Phase 1.8 Deployment Readiness Closure

Audit date: 2026-06-04

## Verdict

NOT READY FOR PHASE 2

Deployment readiness score: 35 / 100

No fetchers, ingestion architecture, or AI extraction code were modified in this closure pass. The only final Phase 1.8 change is this deployment-readiness report.

Fresh command validation for this pass was blocked because the workspace approval system rejected every required escalated command with an out-of-credits error, while sandboxed PowerShell execution is unavailable in this environment. The findings below use the last successful Phase 1.7 validation evidence from the same day and explicitly mark unverified deployment checks.

## Gate Summary

| Gate | Required | Status |
| --- | --- | --- |
| Supabase Auth user exists | yes | failed in last verified probe |
| `admin_users` role mapping exists | yes | failed in last verified probe |
| `is_admin = true` | yes | failed in last verified probe |
| Admin login works | yes | failed in last verified probe |
| Admin access token generated | yes | failed in last verified probe |
| Provider proxy `listProviders` works with admin token | yes | blocked |
| Provider proxy `callAI` works with admin token | yes | blocked |
| Local cron secret configured | yes | failed in last verified probe |
| Vercel cron secret configured | yes | not verified |
| Cron GET execution succeeds with real secret | yes | not verified |
| Deployment environment variables verified | yes | not verified |

## Admin Authentication Setup

Last verified evidence:

| Check | Result |
| --- | --- |
| Supabase URL configured | yes |
| Supabase service role key configured | yes |
| Supabase anon key configured | yes |
| Admin email configured | yes |
| Admin password configured | yes |
| Admin password length | 9 |
| Admin password looks placeholder/weak | yes |
| Supabase Auth user exists | no |
| `admin_users` record exists | no |
| `is_admin = true` | no |
| Login succeeds | no |
| Login error | `Invalid login credentials` |
| Access token generated | no |

Admin authentication is not release-ready.

Exact repair instructions:

1. Set a real admin email and a strong password of at least 16 characters.
2. In Supabase Dashboard, create or update the Supabase Auth user for that email.
3. Confirm the Auth user's email.
4. Copy the Auth user UUID.
5. Run this in Supabase SQL Editor:

```sql
insert into public.admin_users (id, is_admin)
values ('<auth_user_uuid>', true)
on conflict (id)
do update set is_admin = true;
```

6. Update local and deployment env:

```env
VITE_ADMIN_USERNAME=<admin_email>
VITE_ADMIN_PASSWORD=<same_supabase_auth_password>
```

7. Rerun admin validation and confirm:

- Supabase Auth user exists.
- `admin_users` record exists.
- `is_admin = true`.
- Login succeeds.
- Access token is generated.

## Provider Proxy Validation

Status: blocked.

Required checks were not possible because no valid admin access token can be generated until admin auth is repaired.

Required after admin repair:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-provider-proxy" \
  -H "Authorization: Bearer $SUPABASE_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"listProviders"}'
```

Expected:

- HTTP `200`.
- Provider metadata returned.
- Provider API keys are not exposed.
- Provider metadata includes active status, model, health, priority, and key-presence flag.

Then validate:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-provider-proxy" \
  -H "Authorization: Bearer $SUPABASE_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"callAI","prompt":"Return JSON: {\"ok\":true}","timeoutMs":45000}'
```

Expected:

- HTTP `200`.
- AI response content returned.
- Provider attempt metadata returned.

## Cron Secret Validation

Last verified real local env state:

| Check | Result |
| --- | --- |
| `JOB_FETCH_CRON_SECRET` configured locally | no |
| `CRON_FETCH_SECRET` configured locally | no |
| `CRON_SECRET` configured locally | no |
| Any real local cron secret configured | no |

Last verified temporary-secret code validation:

| Scenario | Result |
| --- | --- |
| Invalid secret | `401 Invalid cron secret` |
| GET with temporary configured secret | `200 success` |
| Duplicate execution guard | `202 skipped` |
| Running validation sentinels after cleanup | none |

Cron code is compatible, but deployment readiness is not satisfied because a real local and Vercel cron secret has not been verified.

Required repair:

1. Generate one high-entropy secret.
2. Set the same value locally:

```env
JOB_FETCH_CRON_SECRET=<secret>
CRON_SECRET=<secret>
```

3. Set the same value in Vercel Production:

```bash
vercel env add CRON_SECRET production
vercel env add JOB_FETCH_CRON_SECRET production
```

4. Validate local GET:

```bash
curl -X GET http://localhost:5173/api/cron/fetch-jobs \
  -H "Authorization: Bearer $CRON_SECRET"
```

5. Validate invalid secret returns `401`.
6. Validate duplicate execution guard returns `202` when a recent running fetch exists.

## Vercel Deployment Validation

Status: not verified.

Last verified local deployment evidence:

| Check | Result |
| --- | --- |
| Vercel CLI available locally | no |
| Local `.vercel` project metadata exists | no |
| `VERCEL_TOKEN` configured locally | no |
| Vercel project env variables verified | no |
| Vercel cron schedule verified | no |

Required Vercel checks:

```bash
vercel env ls production
vercel inspect <deployment-url>
```

Verify these production variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `JOB_FETCH_CRON_SECRET`
- AI provider server-side secrets required by `ai-provider-proxy`

Vercel cron schedule should be added only after admin and provider proxy gates pass:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-jobs",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Build Status

Last verified Phase 1.7 build after final cron hardening:

```powershell
npm run build
```

Result: passed.

Evidence:

- PDF worker copied successfully.
- Vite production build completed.
- Sitemap generation completed.
- Jobs loaded: 1.
- Total sitemap URLs: 222.

Build was not rerun during Phase 1.8 because command execution requiring approval was rejected by the workspace approval system.

## Closure Decision

NOT READY FOR PHASE 2

Blocking issues:

1. Admin Auth user is missing.
2. `admin_users` role mapping is missing.
3. Admin login fails.
4. No admin access token is available.
5. Provider proxy `listProviders` is not validated with a valid admin token.
6. Provider proxy `callAI` is not validated with a valid admin token.
7. Real local cron secret is not configured.
8. Vercel cron secret and deployment env variables are not verified.
9. Cron GET execution with a real deployed secret is not verified.

