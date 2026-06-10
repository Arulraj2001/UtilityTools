# Phase 3 Moderation Audit

Audit date: 2026-06-04

## Scope

This audit covers the existing moderation and publishing flow after Phase 2:

`ai_job_drafts -> AI Moderation -> jobs draft -> Jobs Management -> published job`

No implementation changes are proposed here. This is architecture planning only.

## Current Workflow

### 1. Draft Creation

Phase 2 creates rows in `ai_job_drafts` with:

- `generated_data`
- `quality_scores`
- `status`
- `tokens_used`
- `generation_ms`
- `published_job_id` once converted

Draft statuses currently include:

- `pending_review`
- `approved`
- `needs_revision`
- `rejected`
- `published`

Important naming note: `ai_job_drafts.status = published` currently means "converted into a jobs row", not necessarily publicly published.

### 2. AI Moderation Page

Current page: `src/pages/admin/ai/AiModeration.jsx`

Capabilities:

- list AI drafts
- filter by draft status
- open a draft drawer
- show quality scores
- preview generated article HTML
- mark draft as `needs_revision`
- reject draft
- create a new `jobs` row from the AI draft

Current "Create as Draft Job" behavior:

- validates `quality_scores` with the existing job quality gate
- sanitizes `full_description`
- calls `createJob`
- saves job with `status: draft`
- updates `ai_job_drafts.status` to `published`
- stores `published_job_id`

### 3. Jobs Management Publish Flow

Current page: `src/pages/admin/jobs/AdminJobs.jsx`

Capabilities:

- create jobs manually
- edit jobs
- delete jobs
- filter/search jobs
- toggle public job availability setting
- open `JobEditor`

Current `JobEditor` supports:

- title, slug, organization, category
- location, qualification, salary, fee
- official website, apply link, notification PDF
- dates
- SEO fields
- tags
- featured status
- final `status` toggle between `draft` and `published`

Actual public publishing happens by setting `jobs.status = published`.

### 4. Existing Quality Gate

Current helper: `src/lib/jobQualityGate.js`

Publish blocking rules:

- SEO score must be at least 50
- spam risk must be at most 30
- duplicate risk must be at most 60

Current helper: `src/api/supabaseApi.js`

`createJob` and `updateJob` call `enforceJobPublishQualityGate(payload)` only when the job payload has `status: published`.

## Current Bottlenecks

| Bottleneck | Current Impact |
| --- | --- |
| Every draft requires manual opening and inspection | High admin time per draft |
| Quality scores are visible but not interpreted as a clear publish recommendation | Admin must decide from raw scores |
| No dedicated fact-verification evidence panel | Admin has to manually compare source URLs/dates/org details |
| `ai_job_drafts.status = published` is ambiguous | Could be confused with public publication |
| No moderation priority score | High-confidence drafts are mixed with low-confidence drafts |
| No approval history table | Hard to audit who approved, rejected, edited, or published |
| No bulk approval workflow | Prevents 80% review reduction |
| No reason-coded warnings | Admin must infer why a draft is risky |
| No source confidence score | Official source confidence is implicit, not explicit |

## Manual Effort Estimate

Current review requires an admin to:

1. Open each AI draft.
2. Read generated article.
3. Inspect quality scores.
4. Check official source links manually.
5. Decide whether to create a draft job.
6. Open Jobs Management.
7. Re-check the job payload.
8. Toggle publish status when ready.

Estimated manual effort:

- Simple draft: 3-6 minutes
- Incomplete draft: 8-15 minutes
- Suspicious/duplicate draft: 10-20 minutes

Phase 3 target:

- Simple high-confidence draft: under 60 seconds
- Medium-confidence draft: 2-4 minutes
- Low-confidence draft: manual workflow unchanged

## Risks in Current Flow

| Risk | Current Mitigation | Phase 3 Need |
| --- | --- | --- |
| AI hallucinated facts | Phase 2 validation | Add independent verification record |
| Wrong category/tags | Manual correction | Add auto category/tag confidence |
| Duplicate publication | Duplicate scoring and job quality gate | Add queue prioritization and duplicate warning panel |
| Premature publication | Jobs saved as draft first | Keep human publish control |
| No audit trail | Limited row timestamps | Add review decisions and approval history |
| Admin fatigue | None | Add readiness score, warnings, and bulk actions |

## Audit Conclusion

The current moderation flow is safe but labor-heavy. Phase 3 should not bypass human control; it should convert raw quality signals into a structured publish recommendation, fact-verification evidence, confidence scoring, and a prioritized moderation queue.

