# AI Job Intelligence Database Audit

Audit date: 2026-06-01

## Verdict

Status: WARNING

The live Supabase database contains the implemented AI tables and accepted temporary workflow writes. RLS blocked anonymous AI writes. However, the user-requested table names `ai_sources` and `ai_moderation` do not exist; the implementation uses `ai_job_sources` and `ai_job_drafts`. A live schema mismatch also exists for `job_categories.updated_at`.

## Live Environment

PASS:

- Supabase URL present.
- Anon key present.
- Service role key present for server-side scripts.
- Live DB probes created and cleaned temporary records.

WARNING:

- `.env` admin credentials failed Supabase Auth login with "Invalid login credentials".

## AI Tables

PASS: Live table/column probes succeeded for:

- `ai_provider_settings`
- `ai_provider_failures`
- `ai_prompts`
- `ai_job_sources`
- `ai_research_queue`
- `ai_job_drafts`
- `ai_duplicate_log`
- `ai_monitoring_rules`
- `ai_update_queue`

FAIL: User-requested aliases do not exist:

- `ai_sources`: missing, implementation uses `ai_job_sources`
- `ai_moderation`: missing, implementation uses `ai_job_drafts`

This is not necessarily a runtime bug, but the naming mismatch must be documented.

## Related Tables

PASS:

- `jobs`
- `blog_posts`
- `blog_categories`
- `blog_import_history` with code-expected fields

FAIL:

- `job_categories.updated_at` is missing in the live DB.
- `updateJobCategory()` sends `updated_at`, so editing job categories can fail against the current live schema.

## RLS And Permissions

PASS:

- Anonymous select from `ai_provider_settings` returned 0 rows.
- Anonymous insert into `ai_research_queue` was blocked by RLS.
- Anonymous insert into `ai_provider_failures` was blocked by RLS.
- Anonymous public select from published jobs worked.

WARNING:

- Admin credential verification could not be completed because the configured credentials failed login.
- Service-role tests passed, but true authenticated-admin UI writes need valid Supabase Auth credentials.

## Constraints And Indexes

PASS from SQL review:

- AI status checks exist for research queue, drafts, monitoring rules, update queue, and provider health.
- AI indexes exist for queue status, queue created date, draft status, draft created date, source tier, source active state, update status, and update created date.

WARNING:

- Constraint/index verification was based on migration review plus live write behavior. No direct `pg_catalog` SQL access was available through the current connection.

## Live Write Simulation

PASS: Temporary DB records were created and cleaned for:

- `ai_job_sources`
- `ai_research_queue`
- `ai_job_drafts`
- `ai_duplicate_log`
- `ai_monitoring_rules`
- `ai_update_queue`
- `ai_provider_failures`
- `jobs`
- `blog_categories`
- `blog_posts`

PASS: Job CRUD simulation verified:

- Create job
- Publish job
- Unpublish job
- Delete job

PASS: Blog CRUD simulation verified:

- Create category
- Create post
- Publish post
- Delete post/category

## Required Fixes

1. Fix `job_categories.updated_at` mismatch by adding the column or making the update API tolerant of its absence. Code fallback was applied after this audit.
2. Document or alias `ai_sources`/`ai_moderation` naming if external docs expect those names.
3. Restore or update valid admin credentials for full admin-RLS verification.
