# Phase 1.7 Release Candidate Audit

Audit date: 2026-06-04

## Verdict

NOT READY FOR PHASE 2

Release candidate score: 40 / 100

The build passes, and cron endpoint code now validates GET, invalid-secret rejection, and duplicate execution protection when a temporary secret is supplied. The release candidate still fails the required READY gates because admin login does not work, no admin access token can be generated, provider proxy validation cannot run with a valid admin token, and no real cron secret is configured locally or verified in Vercel.

Per Phase 1.7 instruction, this verdict ignores the IBPS TLS issue, RRB relevance improvements, and existing unrelated lint errors.

## READY Gate Summary

| Gate | Required For READY | Result |
| --- | --- | --- |
| Admin login works | yes | failed |
| Provider proxy works | yes | blocked by missing admin token |
| Cron secret configured | yes | failed |
| Build passes | yes | passed |

Final decision: NOT READY FOR PHASE 2

## Admin Authentication

Validation command:

```powershell
node scripts\phase1-7-rc-probe.mjs admin
```

Evidence:

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
| Provider proxy accessible | no valid admin token available |

Safe repair instructions:

1. Choose a real admin email and a strong password of at least 16 characters.
2. In Supabase Dashboard, create or update the Auth user for that email and confirm the email.
3. Copy the Auth user UUID.
4. Run this in Supabase SQL Editor:

```sql
insert into public.admin_users (id, is_admin)
values ('<auth_user_uuid>', true)
on conflict (id)
do update set is_admin = true;
```

5. Update local validation env values:

```env
VITE_ADMIN_USERNAME=<admin_email>
VITE_ADMIN_PASSWORD=<same_supabase_auth_password>
```

6. Rerun:

```powershell
node scripts\phase1-7-rc-probe.mjs admin
```

Expected result:

- `authUserExists: true`
- `adminUsersRecordExists: true`
- `isAdmin: true`
- `loginSucceeds: true`
- `accessTokenGenerated: true`

## Provider Proxy Validation

Required checks:

| Check | Result |
| --- | --- |
| `listProviders` with valid admin token | not run, no valid admin token |
| `callAI` with valid admin token | not run, no valid admin token |
| Provider metadata returned through proxy | not verified, no valid admin token |

Provider proxy is still a release blocker because Phase 1.7 requires validation using a valid admin token, and the admin login flow cannot currently generate one.

After admin auth is fixed, validate provider proxy access with:

```powershell
node scripts\phase1-7-rc-probe.mjs admin
```

Then validate AI generation with a short prompt using the generated admin session token or a manually supplied `SUPABASE_ADMIN_ACCESS_TOKEN`:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-provider-proxy" \
  -H "Authorization: Bearer $SUPABASE_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"callAI","prompt":"Return a compact JSON object with ok=true.","timeoutMs":45000}'
```

Expected result:

- HTTP `200`.
- Response includes generated content.
- Response includes provider attempt metadata.

## Cron Deployment Readiness

Real environment evidence:

| Check | Result |
| --- | --- |
| `JOB_FETCH_CRON_SECRET` configured locally | no |
| `CRON_FETCH_SECRET` configured locally | no |
| `CRON_SECRET` configured locally | no |
| Any cron secret configured locally | no |
| Vercel CLI available locally | no |
| Local `.vercel` project metadata exists | no |
| Vercel env configured | not verifiable from this workspace |
| `vercel.json` cron schedule configured | no |

Temporary-secret code validation:

| Scenario | Result |
| --- | --- |
| Invalid secret | `401 Invalid cron secret` |
| GET with temporary configured secret | `200 success` |
| Duplicate execution guard | `202 skipped` |
| Running validation sentinels after cleanup | none |

Phase 1.7 hardening applied:

- `api/_lib/fetchApi.js` now accepts any configured cron secret value from `JOB_FETCH_CRON_SECRET`, `CRON_FETCH_SECRET`, or `CRON_SECRET`.
- This prevents local/Vercel alias conflicts.
- `PHASE1_CRON_ENVIRONMENT.md` now states that Vercel Cron uses `CRON_SECRET` for its automatic bearer token.

Required repair instructions:

1. Generate one high-entropy secret.
2. Add it locally:

```env
JOB_FETCH_CRON_SECRET=<same_secret>
CRON_SECRET=<same_secret>
```

3. Add it in Vercel Production:

```bash
vercel env add CRON_SECRET production
vercel env add JOB_FETCH_CRON_SECRET production
```

Use the same value for both variables.

4. After admin/provider gates pass, add the cron schedule to `vercel.json`:

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

5. Rerun:

```powershell
node scripts\phase1-7-rc-probe.mjs cron
```

Expected result:

- Invalid secret returns `401`.
- GET with real configured secret returns `200`.
- Duplicate guard returns `202` when a recent running fetch exists.

## Build Verification

Command:

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

## Focused Test Verification

Command:

```powershell
node --test src\jobs\fetchers\baseFetcher.test.js src\jobs\duplicateDetector.test.js src\jobs\jobFetchService.test.js src\jobs\titleNormalizer.test.js
```

Result:

- 10 tests passed.
- 0 tests failed.

## Phase 1.7 Files Changed

| File | Change |
| --- | --- |
| `api/_lib/fetchApi.js` | Accept any configured cron secret alias instead of only the first configured alias. |
| `PHASE1_CRON_ENVIRONMENT.md` | Clarified Vercel `CRON_SECRET` behavior and alias compatibility. |
| `scripts/phase1-7-rc-probe.mjs` | Added masked release-candidate validation probe. |
| `PHASE1_RELEASE_CANDIDATE.md` | Added this audit report. |

## Final Blockers

Phase 2 can start only after:

1. Supabase Auth admin user exists.
2. `admin_users` contains the admin UUID with `is_admin = true`.
3. Admin login succeeds and generates an access token.
4. Provider proxy `listProviders` succeeds with the admin token.
5. Provider proxy `callAI` succeeds with the admin token.
6. Real cron secrets are configured locally and in Vercel.
7. Cron GET succeeds with the real secret.

