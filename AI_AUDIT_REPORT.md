# AI Job Intelligence Codebase Audit

Audit date: 2026-06-01

## Verdict

Status: WARNING

The AI Job Intelligence UI and route structure exist and the production build succeeds, but the codebase is not clean enough to call production-ready without caveats. The main AI workflow pages are routed, imported, and bundle successfully. Static quality gates fail, duplicate detection does not persist results, and the active provider failed the SEO-only generation step during the live workflow simulation.

## Scope Checked

- `src/pages/admin/ai/*`
- `src/lib/aiProvider.js`
- `src/lib/jobWritingFramework.js`
- `src/lib/jobQualityScorer.js`
- `src/api/supabaseApi.js`
- `src/App.jsx`
- `src/components/admin/AdminLayout.jsx`
- `scripts/validate-ai-job-system.mjs`
- `scripts/monitorProviders.js`

## Route And Navigation Audit

PASS: AI admin routes exist in `src/App.jsx`:

- `/admin/ai-intelligence`
- `/admin/ai-research`
- `/admin/ai-moderation`
- `/admin/ai-duplicates`
- `/admin/ai-seo-audit`
- `/admin/ai-monitoring`
- `/admin/ai-updates`
- `/admin/ai-sources`
- `/admin/ai-settings`
- `/admin/ai-prompts`
- `/admin/ai-reports`

PASS: `AdminLayout.jsx` includes matching AI sidebar links.

PASS: Headless browser smoke test against the production preview returned no page errors for:

- `/`
- `/jobs`
- `/login`
- `/admin/ai-intelligence` redirected to `/login`
- `/admin/ai-settings` redirected to `/login`

WARNING: Admin route protection checks only Supabase authentication in the React route layer. Admin authorization is enforced by RLS, not by `ProtectedRoute`.

## Import And Build Audit

PASS: `npm run build` completed successfully.

PASS: Existing AI validation script passed:

- provider primary call
- fallback after primary failure
- all-provider failure classification
- missing-key rejection
- timeout handling
- invalid-response local fallback shape
- static wiring checks

FAIL: `npm run lint` failed with 138 errors. AI-specific lint errors include unused imports in:

- `AiDuplicates.jsx`
- `AiJobUpdates.jsx`
- `AiModeration.jsx`
- `AiReports.jsx`
- `AiResearchQueue.jsx`
- `AiSettings.jsx`
- `AiSources.jsx`

FAIL: `npm run typecheck` failed broadly. This is repo-wide and not limited to AI files.

## Component And Workflow Wiring

PASS: Research queue can create records and generate draft rows.

PASS: Moderation can create a draft job from an AI draft.

PASS: AI settings can save provider fields, test providers, refresh models, show stats, and show recent failures.

PASS: Monitoring UI can create monitoring rules and update queue items when AI detects changes.

WARNING: `AiDuplicates.jsx` runs AI checks but only shows toast warnings. It does not write `ai_duplicate_log`, so the duplicate review list will not populate from the "Run AI Check" button.

WARNING: `AiJobUpdates.jsx` approves/rejects update records but does not apply approved changes back to a job post.

WARNING: `AiSeoAudit.jsx` has no deterministic fallback when provider SEO generation fails or returns invalid/empty content.

## Dead Or Unused Code

WARNING: `upsertAiProvider` is imported in `AiSettings.jsx` but unused.

WARNING: Several AI page imports are unused, causing lint failures.

WARNING: `ai_duplicate_log` exists at the DB/API level, but current UI AI duplicate checks do not create log rows.

## Production Gate Results

- Build: PASS
- AI validation script: PASS
- Conversion tests: PASS
- Browser route smoke: PASS
- Lint: FAIL
- Typecheck: FAIL

## Go/No-Go For Codebase

No-Go for strict production standards until static gates and the duplicate/SEO gaps are fixed. The bundled app runs, but production readiness requires more than a successful build.

## Post-Audit Fixes Applied

- `AiDuplicates.jsx` now persists flagged duplicate checks to `ai_duplicate_log`.
- `AiSeoAudit.jsx` now falls back to deterministic local SEO metadata when providers are unavailable or return invalid/empty output.
- `updateJobCategory()` now retries without `updated_at` when the live DB schema lacks that column.
