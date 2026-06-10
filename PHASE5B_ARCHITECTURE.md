# Phase 5B Architecture

## Scope

Phase 5B adds Content Operations Intelligence using existing production data only.

No changes were made to:

- Fetchers
- Source adapters
- Queue architecture
- AI extraction
- Validation pipeline
- Moderation architecture
- Provider proxy
- Public routes
- SEO routes

## Dashboard

Route:

- `/admin/ai-reports`

The previous quality report page is now the Content Operations Intelligence dashboard.

## Intelligence Layers

### Source Intelligence

Inputs:

- `ai_job_sources`
- `job_fetch_logs`
- `fetch_failures`
- `job_fetch_duplicates`
- `ai_research_queue`
- `ai_job_drafts`

Outputs:

- Source success rate
- Source failure rate
- Source reliability score
- Average items discovered
- Average accepted drafts
- Average rejected drafts
- Duplicate rate
- Source health trend

### Freshness Intelligence

Inputs:

- `jobs`

Outputs:

- Active jobs
- Expired jobs
- Jobs expiring within 1, 3, 7, and 30 days
- Missing deadline indicators
- Stale content indicators

### Category Coverage Intelligence

Inputs:

- `jobs`
- `ai_job_drafts`
- `job_categories`

Outputs:

- Jobs per category
- Drafts per category
- Published jobs per category
- 30-day category growth
- Underrepresented categories
- Inactive categories

### Publishing SLA Intelligence

Inputs:

- `ai_job_drafts`
- `ai_moderation_actions`

Outputs:

- Draft to review time
- Review to approval time
- Approval to publish time
- Total publish cycle time
- p50, p90, p95 for each stage

### Operations Reporting

Reports:

- Source Performance Report
- Category Coverage Report
- Draft Quality Report
- Publishing SLA Report
- Queue Health Report

## Core Analytics Module

Added:

- `src/lib/phase5bContentOps.js`

This module contains pure analytics functions so the calculations are testable without production data.
