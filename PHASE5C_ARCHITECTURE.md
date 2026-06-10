# Phase 5C Architecture

Date: 2026-06-07
Status: Implemented

## Scope

Phase 5C adds scale optimization, cost governance, provider strategy analytics, retention recommendations, capacity modeling, and executive reporting for sustained operation at 1,000 jobs/month, 10,000 jobs/month, and future higher-volume growth.

## Protected Areas

The implementation does not modify fetchers, source adapters, queue architecture, AI extraction, validation pipeline, moderation architecture, review architecture, provider proxy, public routes, or SEO routes.

## Components

- `src/lib/phase5cScaleOps.js`
  - Pure analytics and reporting engine.
  - Builds cost governance, provider routing strategy projections, retention recommendations, capacity plans, and executive reports.

- `src/monitoring/scaleOperationsService.js`
  - Admin monitoring service that reads existing production tables.
  - Uses only sanitized provider fields.
  - Does not mutate routing, archival state, provider settings, queues, drafts, moderation, or review data.

- `api/admin/monitoring/scale-ops.js`
  - Admin-only GET endpoint.
  - Accepts `days`, `monthlyBudgetUsd`, and `strategy`.
  - Reuses `requireAdmin` and the server-side service client.

- `src/pages/admin/ai/AiScaleOps.jsx`
  - Admin dashboard for Cost Governance, Provider Strategy, Archive Planning, Capacity Planning, and Executive Reports.

## Data Sources

- `ai_provider_settings`
- `ai_provider_failures`
- `ai_job_drafts`
- `ai_research_queue`
- `ai_review_results`
- `ai_moderation_actions`
- `raw_job_notifications`
- `monitoring_metrics_snapshots`
- `monitoring_alerts`
- `ai_job_sources`
- `job_fetch_logs`
- `fetch_failures`
- `job_fetch_duplicates`

## Strategy

Provider routing logic is implemented as read-only policy modeling:

- `cheapest-first`
- `quality-first`
- `balanced`
- `fallback-only`

These policies rank provider options from existing metrics but do not change the live provider selector or proxy behavior.

