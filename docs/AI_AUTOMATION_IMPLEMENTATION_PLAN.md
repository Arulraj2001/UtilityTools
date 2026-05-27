# AI Automation Implementation Plan

Last updated: May 2026

## Purpose

This document plans an optional AI automation layer for the existing QuickUtils production app. It is intentionally planning-only: no production logic, routes, migrations, or existing workflows are changed by this document.

The main goal is to support AI-assisted drafting for blog posts, job posts, SEO metadata, internal links, and review checks while preserving the current manual admin workflows.

## Current Architecture Summary

QuickUtils is a Vite + React app using `react-router-dom`, React Query, Supabase, PostgreSQL, and mostly JSX files with `checkJs` enabled through `jsconfig.json`.

Public routing is centralized in `src/App.jsx`. The app currently exposes:

- `/`, `/tools`, `/tool/:slug`, `/categories`, `/category/:slug`
- `/blog`, `/blog/:slug`
- `/jobs`, `/jobs/category/:slug`, `/jobs/:slug`
- `/workflow`, `/workflow/:slug`
- trust pages such as `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/editorial-policy`
- protected admin routes under `/admin`

Admin routing is also in `src/App.jsx`, protected by `ProtectedRoute`, with `AdminLayout` handling the sidebar. Current admin sections include tools, blog posts, blog categories, jobs, job categories, workflow pages, ads, redirects, settings, and tool seeding.

Supabase is initialized in `src/api/supabaseClient.js` with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- persisted auth sessions

Auth state is handled in `src/lib/AuthContext.jsx`. Frontend route protection checks whether the user is authenticated. Database-level admin authorization is enforced by RLS policies that check `public.admin_users` and `auth.uid()`.

## Blog System Audit

Public blog routes:

- `/blog` -> `src/pages/BlogList.jsx`
- `/blog/:slug` -> `src/pages/BlogPostPage.jsx`

Admin blog routes:

- `/admin/blog` -> `src/pages/admin/AdminBlog.jsx`
- `/admin/blog-categories` -> `src/pages/admin/AdminBlogCategories.jsx`

Blog components and helpers:

- `src/components/admin/BlogEditor.jsx`
- `src/components/blog/BlogCard.jsx`
- `src/components/blog/BlogSidebar.jsx`
- `src/components/blog/BlogFilterDrawer.jsx`
- `src/components/seo/BlogSEO.jsx`
- `src/components/seo/StaticPageSEO.jsx`
- `src/lib/staticBlogPosts.js`
- `src/lib/blogFilterUtils.js`

Supabase blog API functions are in `src/api/supabaseApi.js`:

- `getBlogPosts`
- `getBlogPostBySlug`
- `getBlogCategories`
- `getBlogCategoryBySlug`
- `getBlogPostsByCategorySlug`
- `createBlogPost`
- `updateBlogPost`
- `deleteBlogPost`
- `createBlogCategory`
- `updateBlogCategory`
- `deleteBlogCategory`
- `searchBlogs`

Blog tables from `supabase_schema.sql`:

- `blog_posts`
- `blog_categories`

Important current behavior:

- The public blog now merges static posts from `src/lib/staticBlogPosts.js` with Supabase posts.
- The admin blog list does not read `src/lib/staticBlogPosts.js`; it calls `getBlogPosts({ published: false })` and therefore only shows rows from `blog_posts`.
- This explains why repo-created static blog posts can appear publicly but not in the admin Blog Posts sidebar until imported or synchronized into Supabase.
- `BlogSEO.jsx` supports BlogPosting, BreadcrumbList, and FAQPage schema from visible `faq_items`.
- `BlogEditor.jsx` supports title, slug, content, category, status, canonical URL, schema type, SEO title/description/keywords, Open Graph fields, Twitter fields, and FAQ items.

Status fields:

- Blog admin allows `draft`, `published`, and `archived`.
- Public blog API calls normally filter `status = 'published'`.

Schema note to verify before implementation:

- `BlogEditor.jsx` writes `og_title`, `og_description`, `twitter_title`, and `twitter_description`.
- The audited `supabase_schema.sql` snippet includes `og_image`, `canonical_url`, `faq_items`, and `schema_type`, but did not show these four social title/description columns.
- Before AI automation relies on those fields in production, verify the live database columns or add a safe additive migration.

## Job System Audit

Public job routes:

- `/jobs` -> `src/pages/jobs/JobsListPage.jsx`
- `/jobs/category/:slug` -> `src/pages/jobs/JobsCategoryPage.jsx`
- `/jobs/:slug` -> `src/pages/jobs/JobDetailPage.jsx`

Admin job routes:

- `/admin/jobs` -> `src/pages/admin/jobs/AdminJobs.jsx`
- `/admin/job-categories` -> `src/pages/admin/AdminJobCategories.jsx`

Job components and helpers:

- `src/components/admin/jobs/JobEditor.jsx`
- `src/components/admin/jobs/JobFilters.jsx`
- `src/components/admin/jobs/JobStatusBadge.jsx`
- `src/components/jobs/admin/JobAnalyticsDashboard.jsx`
- `src/components/jobs/JobCard.jsx`
- `src/components/jobs/JobApplyCard.jsx`
- `src/components/jobs/JobMeta.jsx`
- `src/components/jobs/JobSEOLinking.jsx`
- `src/components/jobs/RelatedJobs.jsx`
- `src/hooks/jobs/useJobs.js`
- `src/hooks/jobs/useAdminJobs.js`
- `src/hooks/jobs/useJobCategories.js`
- `src/hooks/jobs/useJobAnalytics.js`
- `src/lib/jobs/jobAnalytics.js`
- `src/lib/jobs/jobHelpers.js`
- `src/lib/jobs/jobRelations.js`
- `src/utils/jobs/jobSeo.jsx`

Supabase job API functions are in `src/api/supabaseApi.js`:

- `getJobs`
- `getJobBySlug`
- `getFeaturedJobs`
- `searchJobs`
- `createJob`
- `updateJob`
- `deleteJob`
- `getJobCategories`
- `getJobCategoryBySlug`
- `getJobsByCategorySlug`
- `createJobCategory`
- `updateJobCategory`
- `deleteJobCategory`

Job tables from the active SQL files:

- `jobs`
- `job_categories`
- `job_analytics_events`

Important current behavior:

- Jobs store category as a slug string in the `jobs.category` field.
- `createJob` and `updateJob` already validate required fields, normalize slugs, generate unique job slugs, clean canonical URLs, validate JSON fields, and handle conflict errors.
- `JobEditor.jsx` allows `draft` and `published` through a switch.
- `validateJobPayload` in `src/api/supabaseApi.js` currently accepts only `draft` and `published`.
- Public job pages filter to `status = 'published'`.
- `JobSEO` emits JobPosting JSON-LD and canonical metadata.

Migration note:

- `supabase_jobs_fresh_migration.sql` is destructive by design: it drops and recreates job tables.
- AI automation must not be added to that fresh migration for production. Use separate additive migrations later.

## Supabase, Auth, And RLS

Client setup:

- `src/api/supabaseClient.js`

Auth and admin route handling:

- `src/lib/AuthContext.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/admin/AdminLayout.jsx`

Database admin checks:

- RLS policies in `supabase_schema.sql`, `supabase_migration_safe.sql`, and `supabase_jobs_fresh_migration.sql` use `public.admin_users` with `auth.uid()` and `is_admin = true`.

Implication for AI automation:

- Browser code must never call an AI provider directly or expose AI API keys.
- Any AI execution must run server-side through a Supabase Edge Function, protected serverless endpoint, or controlled worker using service credentials.
- Admin pages can create queue records through Supabase, but final generation should be performed by trusted server-side code.

## Migration Pattern Audit

The repo currently uses root-level SQL files rather than a `supabase/migrations` folder. Patterns include:

- `create table if not exists`
- `alter table if exists ... add column if not exists`
- `create index if not exists`
- `drop policy if exists`
- RLS policy recreation
- seed scripts and generated import SQL

Relevant files:

- `supabase_schema.sql`
- `supabase_migration_safe.sql`
- `supabase_blog_seed.sql`
- `supabase_jobs_fresh_migration.sql`
- `import_static_posts.sql`

For AI automation, future migrations should follow the additive pattern from `supabase_migration_safe.sql`, not the destructive clean-slate pattern from `supabase_jobs_fresh_migration.sql`.

## Background And Cron Pattern Audit

No durable queue worker or cron scheduler was found in the current app.

Existing background-like patterns are client-side:

- `src/lib/jobs/jobAnalytics.js` batches analytics events with `setTimeout` and inserts into `job_analytics_events`.
- `src/lib/analytics.js` logs page and tool events into `analytics_events`.
- PDF and OCR features use browser workers or PDF.js worker setup.
- `vercel.json` currently only rewrites all routes to `index.html`; it does not define cron jobs.

Implication:

- AI automation should start with a manual admin-triggered queue runner or a Supabase Edge Function invoked by admins.
- Scheduled background processing can be added later with Vercel Cron or Supabase scheduled functions after the manual queue path is proven.

## SEO, Schema, And Sitemap Audit

SEO helpers:

- `src/components/seo/BlogSEO.jsx`
- `src/components/seo/StaticPageSEO.jsx`
- `src/components/seo/CategorySEO.jsx`
- `src/components/seo/ToolSEO.jsx`
- `src/components/seo/WorkflowSEO.jsx`
- `src/utils/jobs/jobSeo.jsx`
- `src/lib/seoUtils.js`

Sitemap generation:

- `scripts/generate-sitemap.js`
- output: `public/sitemap.xml`
- canonical domain: `https://quickutils.page`

Current sitemap script loads:

- static pages
- Supabase tools
- Supabase categories
- Supabase blog posts
- static blog posts from `src/lib/staticBlogPosts.js`
- workflow pages
- jobs

AI-generated content must not be added to the sitemap until it becomes reviewed and published through the existing blog/job systems.

## Existing Files And Tables That Must Not Be Broken

Frontend routes and layouts:

- `src/App.jsx`
- `src/components/admin/AdminLayout.jsx`
- `src/components/layout/Navbar.jsx`
- `src/components/layout/Footer.jsx`
- `src/components/ProtectedRoute.jsx`

Supabase and auth:

- `src/api/supabaseClient.js`
- `src/api/supabaseApi.js`
- `src/lib/AuthContext.jsx`
- `public.admin_users`

Blog workflow:

- `src/pages/BlogList.jsx`
- `src/pages/BlogPostPage.jsx`
- `src/pages/admin/AdminBlog.jsx`
- `src/pages/admin/AdminBlogCategories.jsx`
- `src/components/admin/BlogEditor.jsx`
- `src/lib/staticBlogPosts.js`
- `blog_posts`
- `blog_categories`

Job workflow:

- `src/pages/jobs/JobsListPage.jsx`
- `src/pages/jobs/JobsCategoryPage.jsx`
- `src/pages/jobs/JobDetailPage.jsx`
- `src/pages/admin/jobs/AdminJobs.jsx`
- `src/pages/admin/AdminJobCategories.jsx`
- `src/components/admin/jobs/JobEditor.jsx`
- `src/hooks/jobs/useAdminJobs.js`
- `src/hooks/jobs/useJobs.js`
- `src/hooks/jobs/useJobAnalytics.js`
- `jobs`
- `job_categories`
- `job_analytics_events`

SEO and sitemap:

- `src/components/seo/BlogSEO.jsx`
- `src/utils/jobs/jobSeo.jsx`
- `scripts/generate-sitemap.js`
- `public/sitemap.xml`

## Proposed AI Modules

All modules should be additive and feature-flagged. Suggested file names are intentionally isolated under `ai` namespaces.

Frontend/admin modules:

- `src/pages/admin/ai/AdminAIAutomation.jsx`
- `src/components/admin/ai/AIGenerationQueue.jsx`
- `src/components/admin/ai/AIGenerationForm.jsx`
- `src/components/admin/ai/AIDraftReviewPanel.jsx`
- `src/components/admin/ai/AIValidationReport.jsx`
- `src/components/admin/ai/AISettingsPanel.jsx`
- `src/components/admin/ai/AIAuditLogTable.jsx`

Client-side API wrappers:

- `src/api/aiAutomationApi.js`
- `src/hooks/ai/useAIGenerationQueue.js`
- `src/hooks/ai/useAIDrafts.js`
- `src/hooks/ai/useAISettings.js`

Shared validation and content utilities:

- `src/lib/ai/contentSchemas.js`
- `src/lib/ai/blogDraftMapper.js`
- `src/lib/ai/jobDraftMapper.js`
- `src/lib/ai/promptBuilders.js`
- `src/lib/ai/contentPolicyChecks.js`
- `src/lib/ai/seoValidation.js`
- `src/lib/ai/internalLinkValidation.js`
- `src/lib/ai/sanitizers.js`

Server-side execution:

- Supabase Edge Function: `supabase/functions/ai-generate/index.ts`, if the repo adopts Supabase functions.
- Or a protected serverless endpoint: `api/ai/generate`, if the deployment platform supports API routes separately from Vite.
- Or a local/admin-only script for early testing: `scripts/run-ai-generation-queue.js`.

Important server rule:

- AI provider keys must live only in server environment variables. Do not use `VITE_` for provider keys.

## Proposed Database Changes

No migration should be created in this planning phase. The following are proposed for a future additive migration.

### `ai_generation_jobs`

Queue table for requested AI tasks.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `target_type text not null`
- `target_id uuid null`
- `source_type text null`
- `source_id text null`
- `prompt_template_id uuid null`
- `prompt_version text null`
- `input_context jsonb not null default '{}'::jsonb`
- `requested_output jsonb not null default '{}'::jsonb`
- `status text not null default 'queued'`
- `priority int not null default 0`
- `attempts int not null default 0`
- `max_attempts int not null default 3`
- `locked_at timestamptz null`
- `locked_by text null`
- `error_message text null`
- `created_by uuid references auth.users(id) on delete set null`
- `reviewed_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `completed_at timestamptz null`

Suggested `target_type` values:

- `blog_post`
- `job_post`
- `tool_content`
- `seo_refresh`
- `internal_link_suggestions`

Suggested `status` values:

- `queued`
- `processing`
- `needs_review`
- `approved`
- `rejected`
- `failed`
- `cancelled`

### `ai_generated_drafts`

Stores generated drafts separately from production content.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `generation_job_id uuid references ai_generation_jobs(id) on delete cascade`
- `target_type text not null`
- `target_id uuid null`
- `draft_title text`
- `slug_candidate text`
- `excerpt text`
- `content_html text`
- `structured_content jsonb not null default '{}'::jsonb`
- `seo_title text`
- `seo_description text`
- `seo_keywords text`
- `canonical_url text`
- `og_title text`
- `og_description text`
- `twitter_title text`
- `twitter_description text`
- `faq_items jsonb`
- `related_links jsonb`
- `validation_report jsonb not null default '{}'::jsonb`
- `status text not null default 'needs_review'`
- `created_by uuid references auth.users(id) on delete set null`
- `reviewed_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Drafts should never appear publicly until an admin explicitly publishes or copies them into the existing `blog_posts` or `jobs` workflow.

### `ai_prompt_templates`

Stores reusable prompts and versions.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `target_type text not null`
- `template text not null`
- `system_instructions text`
- `output_schema jsonb`
- `version text not null default 'v1'`
- `is_active boolean not null default true`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `ai_automation_settings`

Stores feature flags and limits.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `key text not null unique`
- `value jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Useful settings:

- `enabled`
- `manual_runner_only`
- `max_jobs_per_day`
- `max_tokens_per_job`
- `allowed_target_types`
- `default_blog_status`
- `default_job_status`

### `ai_audit_events`

Records important actions.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `actor_id uuid references auth.users(id) on delete set null`
- `event_type text not null`
- `entity_type text`
- `entity_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

### Optional Existing Table Columns

Avoid modifying `blog_posts` and `jobs` initially. If later needed, add only nullable/default-safe columns:

- `content_source text default 'manual'`
- `ai_generation_id uuid null`
- `review_status text null`

These should not be required by existing queries or editors.

## RLS For Proposed Tables

Recommended:

- Admin users can select, insert, update, and delete AI queue/draft/settings/prompt rows.
- Public users cannot select AI queue, drafts, prompts, settings, or audit logs.
- Server-side workers can use service role credentials.
- If Edge Functions use user JWTs, they must verify admin status before creating or running jobs.

Suggested policy shape:

- `exists (select 1 from public.admin_users where id = auth.uid() and is_admin = true)`

Do not weaken existing public policies for `blog_posts`, `jobs`, or job analytics.

## Proposed Admin Dashboard Pages

Add a new admin section later, not in this phase:

- route: `/admin/ai-automation`
- sidebar label: `AI Automation`
- access: existing `ProtectedRoute` plus database RLS

Suggested tabs:

- Queue: queued, processing, failed, cancelled
- Drafts: needs review, approved, rejected
- Create: choose blog/job/SEO/internal-link task
- Prompt Templates: active prompt versions
- Settings: feature flags, limits, provider settings reference
- Audit Log: who generated, reviewed, approved, or published

Admin interactions:

- Create an AI generation request.
- Run one queued job manually.
- Preview generated draft.
- View validation report.
- Edit generated content before publishing.
- Convert approved blog draft into a normal `blog_posts` draft.
- Convert approved job draft into a normal `jobs` draft.
- Reject draft with a reason.

No auto-publish in the first implementation.

## Queue And Background Processing Design

Phase 1 should use manual queue processing from the admin UI.

Flow:

1. Admin creates a generation request from `/admin/ai-automation`.
2. App inserts a row into `ai_generation_jobs` with `status = 'queued'`.
3. Admin clicks `Run next job` or `Run this job`.
4. Protected server-side function verifies admin access.
5. Worker claims one queued job by setting `status = 'processing'`, `locked_at`, and `locked_by`.
6. Worker builds a prompt using current tool/blog/job context.
7. Worker calls the AI provider server-side.
8. Worker validates the output against schemas and content policies.
9. Worker stores the result in `ai_generated_drafts`.
10. Queue status becomes `needs_review`.
11. Admin reviews and edits the draft.
12. Admin explicitly creates or updates a normal `blog_posts` or `jobs` draft using existing APIs.

Future scheduled processing:

- Add Vercel Cron only if API routes are introduced.
- Or use Supabase scheduled Edge Functions.
- Cron should process a small batch, such as 1-5 jobs, and respect daily cost limits.

Concurrency:

- Use a database claim function or RPC with row locking if multiple workers are possible.
- Prefer `for update skip locked` in a future Postgres function.
- Do not process the same job twice.

Failure handling:

- Increment `attempts`.
- Store `error_message`.
- Retry only while `attempts < max_attempts`.
- Mark final failures as `failed`.
- Allow admin retry by setting back to `queued`.

## Content Safety And Validation Rules

AI output must be validated before becoming an admin draft.

Blog validation:

- Unique title and slug candidate.
- Metadata present and length-checked.
- Canonical URL uses `https://quickutils.page/blog/:slug`.
- Visible FAQs match FAQ schema.
- Internal links point only to existing routes.
- No fake author bios, fake dates, fake reviews, or fake expertise.
- No AdSense approval guarantees.
- No medical, legal, tax, or financial advice.
- Student posts must say grading systems vary by institution.
- JSON/Base64 posts must mention syntax/encoding limitations when relevant.

Job validation:

- Job content must not invent official notices, salary, eligibility, dates, apply links, or organization claims.
- If generated from a source URL or pasted notice, the source must be stored in `input_context`.
- Job posts should default to `draft`.
- Admin must verify official source links before publishing.
- Dates must be parsed conservatively and shown for review.

SEO validation:

- SEO title and description must be unique and non-generic.
- No keyword stuffing.
- Canonical URLs use `https://quickutils.page`.
- FAQPage schema only for visible FAQs.
- BlogPosting and JobPosting schema should reuse existing SEO helpers.

Internal link validation:

- Check generated links against known routes from tools, categories, blog posts, workflows, and jobs.
- Reject or flag links to routes that do not exist.

## Static Blog Import And Admin Visibility Note

The current Phase 3A static posts live in `src/lib/staticBlogPosts.js`. They are merged into the public blog UI, but they are not rows in `blog_posts`, so they do not appear in `/admin/blog`.

Existing helper scripts:

- `scripts/import-static-posts.js`
- `scripts/export-static-posts-sql.js`
- `import_static_posts.sql`

Recommended next safe fix for the sidebar issue:

- Do not make admin read directly from static files.
- Import reviewed static posts into `blog_posts` using the existing SQL/script path.
- Keep admin as the source of truth for manually managed content.
- In future AI automation, generated drafts should become Supabase drafts, not static repo-only posts.

## Migration Safety Notes

Do:

- Use separate additive migration files.
- Use `create table if not exists`.
- Use `alter table ... add column if not exists`.
- Use nullable columns for any references to existing content.
- Add indexes on queue status, target type, created time, and locked time.
- Enable RLS on every AI table.
- Keep generated drafts separate from published content.
- Default generated blog/job output to draft or needs-review.
- Back up production before any migration.

Do not:

- Drop existing blog/job/tool tables.
- Modify existing public query filters.
- Require new columns in existing editors.
- Auto-publish AI output.
- Store AI provider keys in Vite environment variables.
- Add public access policies to AI draft or queue tables.
- Add generated draft URLs to the sitemap.

## Rollback Strategy

Feature rollback:

- Hide `/admin/ai-automation` through a feature flag.
- Remove the admin sidebar link.
- Stop any cron or worker invocation.
- Leave existing blog and job workflows untouched.

Data rollback:

- Queue records can be marked `cancelled`.
- Draft records can be kept for audit or deleted by an admin.
- Because generated content is stored outside `blog_posts` and `jobs` until approval, rollback should not affect published content.

Migration rollback:

- Create a separate rollback SQL file only for AI tables.
- Drop AI tables in dependency order if necessary:
  - `ai_audit_events`
  - `ai_generated_drafts`
  - `ai_generation_jobs`
  - `ai_prompt_templates`
  - `ai_automation_settings`
- Do not touch `blog_posts`, `blog_categories`, `jobs`, `job_categories`, or `job_analytics_events`.

## Phase-By-Phase Implementation Checklist

### Phase AI-0: Verify Live Schema

- Verify live `blog_posts` columns, especially social metadata columns.
- Verify live `jobs`, `job_categories`, and `job_analytics_events` columns.
- Verify the current production RLS policies.
- Decide whether static Phase 3A posts should be imported into Supabase.
- Confirm provider choice and server runtime.

### Phase AI-1: Database Foundation

- Add AI-only tables.
- Add RLS policies.
- Add indexes.
- Seed a small set of prompt templates.
- Do not alter existing blog/job behavior.

### Phase AI-2: Read-Only Admin UI

- Add `/admin/ai-automation`.
- Show queue, drafts, settings, and audit placeholders.
- Read from AI tables only.
- No AI provider call yet.

### Phase AI-3: Manual Queue Creation

- Add form to request blog/job/SEO generation.
- Insert `queued` jobs.
- Validate target type and input context.
- Add audit events.

### Phase AI-4: Server-Side Generation Worker

- Add protected server-side function.
- Claim one queue item at a time.
- Call AI provider with server-only key.
- Validate output.
- Store generated draft.
- Do not publish.

### Phase AI-5: Human Review And Draft Conversion

- Add draft preview and edit UI.
- Add validation report display.
- Allow `Create blog draft` using existing `createBlogPost`.
- Allow `Create job draft` using existing `createJob`.
- Default created content to `draft`.
- Record audit events.

### Phase AI-6: Optional Scheduled Processing

- Add Vercel Cron or Supabase scheduled Edge Function.
- Process small batches.
- Enforce daily limits.
- Alert on repeated failures.
- Keep manual review required.

### Phase AI-7: SEO And Sitemap Integration

- Ensure approved/published content uses existing SEO components.
- Ensure sitemap only includes `published` Supabase rows.
- Add internal link validation reports.
- Add duplicate metadata checks.

## Risks And Mitigation

Risk: AI posts do not appear in admin.

- Mitigation: Store all AI outputs as Supabase drafts, not static files.

Risk: Accidental publication of unreviewed AI content.

- Mitigation: Use separate draft tables, default `needs_review`, and require admin approval.

Risk: AI invents facts for jobs.

- Mitigation: Require source context, flag unsupported facts, and default job output to draft.

Risk: Legal, financial, tax, health, or official-sounding claims.

- Mitigation: Use content policy checks and mandatory disclaimers where needed.

Risk: API key leakage.

- Mitigation: Keep provider calls server-side only. Never use `VITE_` provider keys.

Risk: Broken internal links.

- Mitigation: Validate against real tool/category/blog/workflow/job routes before saving drafts.

Risk: Duplicate or thin SEO content.

- Mitigation: Require unique title/description checks, minimum content checks, and human review.

Risk: Queue stuck in processing.

- Mitigation: Add `locked_at`, `locked_by`, retry limits, and admin reset action.

Risk: Costs run unexpectedly.

- Mitigation: Add daily job limits, token limits, manual runner first, and audit logging.

Risk: RLS exposes AI drafts publicly.

- Mitigation: Admin-only RLS on every AI table and no public route for drafts.

Risk: Existing blog/job workflows break.

- Mitigation: Keep AI tables separate and use existing `createBlogPost` and `createJob` only after review.

Risk: Live schema differs from repo SQL files.

- Mitigation: Run schema inspection before migration. Treat repo SQL as reference, not proof of production state.

## Assumptions

- The current admin dashboard is intended to remain Supabase-backed.
- Static blog posts are temporary or supplemental content and are not the long-term admin-editable source of truth.
- AI automation should assist drafting and review, not replace editorial approval.
- The production database uses the same core tables represented by the repo SQL files.
- The deployment currently serves the Vite app with SPA rewrites and has no configured cron in `vercel.json`.

## Immediate Recommendation

Before building AI automation, import or upsert the Phase 3A static blog posts into Supabase if they should be visible in `/admin/blog`. Then build AI automation so future generated content enters Supabase as reviewed drafts from the start.
