# Job Portal Compatibility Audit

Audit date: 2026-06-01

## Verdict

Status: WARNING

AI integration does not break core job CRUD at the database level. Manual posting remains structurally intact. However, job category editing can fail because the live `job_categories` table lacks `updated_at`, and AI-created drafts carry unsanitized HTML into the same public rendering path.

## Integration Points

PASS:

- AI moderation creates rows in the existing `jobs` table.
- AI-created jobs are saved as `draft`, not auto-published.
- Existing public job routes remain available.
- `JobSEO` renders JobPosting schema.
- `JobSEOLinking` adds contextual related content blocks.
- Existing `AdminJobs` page still owns final manual edit/publish workflow.

## Live CRUD Simulation

PASS:

- Create Job
- Publish Job
- Unpublish Job
- Delete Job

All temporary records were cleaned.

## Manual Posting

PASS by code review:

- `AdminJobs.jsx` still uses `JobEditor`.
- `JobEditor` still supports title, slug, category, dates, description, SEO, tags, featured, and status.
- Existing hooks still call `createJob`, `updateJob`, and `deleteJob`.

WARNING:

- `JobEditor` does not expose the new AI-preserved fields `faq_items`, `og_title`, `og_description`, or `schema_type`.
- `createJob()` can store those fields when AI moderation sends them, but manual editors cannot edit all of them.

## Category Compatibility

FAIL:

- Live DB is missing `job_categories.updated_at`.
- `updateJobCategory()` sends `updated_at`, so editing a job category can fail.

## Publishing Workflow

PASS:

- AI moderation creates a draft job.
- Final publish still happens through job status update.
- Live simulation verified draft -> published.

WARNING:

- AI moderation labels its action "Create as Draft Job", but changes the AI draft status to `published`. This means "published" in `ai_job_drafts` means "converted to job draft", not public job published.

## Required Fixes

1. Make `updateJobCategory()` tolerant of missing `updated_at` or add the column. Code fallback was applied after this audit.
2. Add manual editing support for AI SEO/schema fields if editors are expected to revise them.
3. Rename AI draft status or UI copy to avoid confusion between "AI draft converted" and "public job published".
