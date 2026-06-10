# Phase 4 Architecture

## Scope

Phase 4 adds monitoring, observability, alerting, cost analytics, reporting, and operational visibility only.

No fetcher, adapter, ingestion, cron, extraction, validation, review, moderation, or publishing workflow code was modified.

## Components

Built under `src/monitoring/`:

- `providerHealthService.js`
- `queueMonitoringService.js`
- `draftQualityService.js`
- `moderationMonitoringService.js`
- `costAnalyticsService.js`
- `alertEngine.js`
- `operationalMetricsService.js`
- `dashboardAggregator.js`

Supporting utility:

- `monitoringUtils.js`

## Data Flow

```text
AI platform tables
  ai_provider_settings
  ai_provider_failures
  ai_generation_usage
  ai_research_queue
  ai_job_drafts
  ai_review_results
  ai_fact_verifications
  ai_moderation_actions
        |
        v
Monitoring services
        |
        v
AlertEngine + DashboardAggregator
        |
        v
Admin monitoring APIs
        |
        v
monitoring_alerts
monitoring_metrics_snapshots
```

## Admin APIs

- `GET /api/admin/monitoring/providers`
- `GET /api/admin/monitoring/queue`
- `GET /api/admin/monitoring/quality`
- `GET /api/admin/monitoring/moderation`
- `GET /api/admin/monitoring/costs`
- `GET /api/admin/monitoring/alerts`
- `GET /api/admin/monitoring/overview`

## Result

Architecture is complete and isolated from production workflows.
