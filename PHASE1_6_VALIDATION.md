# Phase 1.6 Validation

Audit date: 2026-06-04

## Verdict

DO NOT START PHASE 2

Phase 1.6 fixed the SSC extraction blocker, added contextual title normalization, and patched the cron endpoint for Vercel GET compatibility. Phase 2 is still blocked because admin authentication cannot be safely repaired with the current placeholder password, IBPS still fails TLS verification in Node, the real cron secret is not configured, and the build could not be rerun after the final cron patch because the workspace approval system ran out of credits.

## Fixes Applied

| File | Issue | Fix | Reason |
| --- | --- | --- | --- |
| `src/jobs/titleNormalizer.js` | Generic source titles such as `Notification`, `Hindi`, and file-size labels could enter the raw notification pipeline. | Added `normalizeNotificationTitle()` and `isGenericTitle()`. | Produces contextual titles from PDF URLs, source context, or organization fallback before enqueueing AI research. |
| `src/jobs/normalizeNotification.js` | Normalization did not have a title-quality guard. | Wired title normalization into the notification normalization layer. | Keeps every fetcher on the same title-quality path without changing manual job workflows. |
| `src/jobs/titleNormalizer.test.js` | No focused tests for generic-title handling. | Added Node test coverage for generic detection, URL-derived titles, and organization fallback. | Prevents regressions in Phase 1 ingestion quality. |
| `src/jobs/fetchers/officialNotificationParser.js` | SBI and similar pages could prefer Hindi/generic PDF links before English/contextual links. | Adjusted candidate scoring to prefer English and demote Hindi-only link labels. | Improves extraction quality without disabling official-source safety checks. |
| `src/jobs/fetchers/sscFetcher.js` | SSC notice page is an Angular shell and returned no usable anchors. | Added official SSC calendar API fallback after HTML discovery. | Reliable official structured extraction now returns contextual recruitment/exam notifications and dates. |
| `api/cron/fetch-jobs.js` | Vercel Cron invokes HTTP GET, but the endpoint accepted only POST. | Allowed both `GET` and `POST`. | Maintains local/manual POST compatibility and adds Vercel Cron compatibility. |
| `PHASE1_CRON_ENVIRONMENT.md` | Cron secret setup was not documented. | Added local and Vercel environment guidance. | Clarifies required server-only secrets and supported headers. |

## Admin Authentication Validation

Status: BLOCKED

Checks performed:

| Check | Result |
| --- | --- |
| `VITE_ADMIN_USERNAME` configured | yes |
| `VITE_ADMIN_PASSWORD` configured | yes |
| Password safe enough for repair | no, 9-character placeholder-like value |
| Auth user exists for configured admin email | no |
| `admin_users` row exists for configured admin | no |
| Login with configured credentials | failed: `Invalid login credentials` |
| Edge Function no-token protection | passed: live provider proxy returned `401` |
| Edge Function invalid-token protection | passed: live provider proxy returned `401` |
| Valid admin provider proxy access | not possible without a valid admin session token |

No production admin user was created or reset because doing so with the current placeholder password would be a security regression.

Required safe repair:

1. Replace `VITE_ADMIN_PASSWORD` with a strong admin password or provide `SUPABASE_ADMIN_ACCESS_TOKEN` from an existing admin session.
2. Create or update the Supabase Auth user for `VITE_ADMIN_USERNAME`.
3. Ensure `public.admin_users.id = auth.users.id` and `is_admin = true`.
4. Verify `signInWithPassword()` succeeds.
5. Verify `ai-provider-proxy` `listProviders` succeeds with the minted access token.

## Cron Secret Validation

Status: PARTIAL

Code checks completed before the final GET compatibility patch:

| Scenario | Result |
| --- | --- |
| POST without cron secret header | `401 Invalid cron secret` |
| POST with temporary in-process secret and `maxSources: 0` | `200 success` |
| Idempotency guard present | yes, `hasRecentRunningFetch(30)` |
| Local header support | yes, `x-cron-secret` and `Authorization: Bearer` |
| Vercel bearer support | yes, `CRON_SECRET` alias is supported |
| Vercel GET support | patched in code |
| Real local cron secret present in `.env` | no |
| Real Vercel cron secret verified | no |

Vercel compatibility note: official Vercel docs say cron jobs invoke the configured path with HTTP GET, and Vercel sends the configured `CRON_SECRET` as a bearer token. The endpoint now accepts GET and POST.

Remaining blocker: configure a real server-side cron secret in local and Vercel environments, then rerun the GET endpoint validation.

## SSC Fetcher Validation

Status: FIXED

The live SSC probe now extracts official records through the SSC calendar API fallback.

Evidence:

| Source | Reachable | Notifications Found | Saved | Errors |
| --- | --- | ---: | ---: | --- |
| SSC | yes | 3 in direct probe, 2 in capped all-source probe | no-write probe | none |

Sample extracted titles:

- `Sub-Inspector in Delhi Police & Central Armed Police Forces Examination, 2026`
- `Indian Navy Entrance Test (INET) - [Agniveer (MR as SSR ) and SSR (Medical)]`
- `Combined Higher Secondary (10 2) Level Examination, 2026`

The fallback keeps official-source controls intact: HTTPS only, `ssc.gov.in` allowlist, response size limits, timeout, and normalized output.

## IBPS TLS Validation

Status: BLOCKED

Node fetch validation with normal TLS verification:

| URL | Result |
| --- | --- |
| `https://www.ibps.in` | failed: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `unable to verify the first certificate` |
| `https://ibps.in` | failed: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `unable to verify the first certificate` |

Root cause:

The IBPS site is presenting a certificate chain that this Node runtime cannot verify. This is not a scraper parsing failure; it is a transport security failure before HTML can be fetched.

Safe remediation status:

- TLS verification was not disabled.
- No insecure fetch option was introduced.
- No `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround was used.
- No unofficial mirror was added.

Required safe repair:

1. Prefer an official IBPS endpoint/host with a complete certificate chain if one is published.
2. Ask IBPS/site operator to serve the complete intermediate chain.
3. If a verified official intermediate CA file is provided, configure the runtime CA bundle explicitly.

Until one of those is done, IBPS cannot be marked production-ready.

## Fetcher Revalidation

Capped live no-write probe after Phase 1.6 fixes:

| Source | Reachable | Notifications Found | Errors |
| --- | --- | ---: | --- |
| UPSC | yes | 2 | none |
| SSC | yes | 2 | none |
| IBPS | no | 0 | TLS verification failure |
| SBI | yes | 2 | none |
| DRDO | yes | 2 | none |
| ISRO | yes | 2 | none |
| RRB | yes | 2 | weak relevance observed |
| TNPSC | yes | 2 | none |

Additional risk:

RRB produced at least one weak candidate (`rti-act.pdf`) in the capped no-write probe. This is not a Phase 1.6 named blocker, but it should be tightened before relying on RRB ingestion quality in production.

## Test Results

Focused Phase 1 tests passed before the final cron GET patch:

| Test File | Result |
| --- | --- |
| `src/jobs/fetchers/baseFetcher.test.js` | passed |
| `src/jobs/duplicateDetector.test.js` | passed |
| `src/jobs/jobFetchService.test.js` | passed |
| `src/jobs/titleNormalizer.test.js` | passed |

Summary:

- 10 tests passed.
- 0 tests failed.

Build status:

- Not rerun after the final cron GET patch.
- Reason: the workspace approval system rejected further unsandboxed commands because approval credits were exhausted, and sandboxed PowerShell command execution fails with `windows sandbox: spawn setup refresh`.

## Remaining Blockers

Phase 2 must not start until these are closed:

1. Admin auth is repaired with a strong credential and a valid `admin_users.is_admin = true` role.
2. `ai-provider-proxy` is verified with a valid admin bearer token.
3. A real cron secret is configured locally and in Vercel.
4. The cron endpoint is rerun with Vercel-compatible GET plus bearer secret.
5. IBPS TLS verification is resolved without disabling certificate validation.
6. `npm run build` is rerun after the cron route patch.
7. RRB relevance is reviewed or scoped if production ingestion requires high-confidence RRB notifications.

## Sources

- Vercel Cron Jobs documentation: https://vercel.com/docs/cron-jobs/
- Vercel Cron Jobs management/security documentation: https://vercel.com/docs/cron-jobs/manage-cron-jobs

