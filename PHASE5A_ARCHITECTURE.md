# Phase 5A Architecture

## Scope

Phase 5A adds an admin operations and review productivity UI layer over the existing Phase 3 and Phase 4 APIs.

No changes were made to fetchers, source adapters, queue architecture, AI extraction, validation, moderation architecture, provider proxy, public job routes, or SEO routes.

## Admin Operations Dashboard

Route:

- `/admin/ai-intelligence`

Data sources:

- `GET /api/admin/monitoring/overview`
- `GET /api/admin/monitoring/alerts`
- `GET /api/admin/review-queue`

Sections:

- Queue Overview
- Draft Overview
- Review Overview
- Moderation Overview
- Provider Health
- Monitoring Alerts
- Publishing SLA
- Admin Reports

## Review Productivity Dashboard

Route:

- `/admin/ai-moderation`

Data and actions:

- `GET /api/admin/review-queue`
- `GET /api/admin/review-item/:id`
- `POST /api/admin/review-item/:id/run-review`
- `POST /api/admin/approve/:id`
- `POST /api/admin/reject/:id`
- `POST /api/admin/review-item/:id/needs-revision`
- `POST /api/admin/review-item/:id/convert-to-job-draft`

## Client API Layer

Added:

- `src/api/adminOperationsApi.js`

Responsibilities:

- Attach the current Supabase admin session bearer token.
- Call existing admin APIs.
- Parse JSON responses.
- Surface API errors without exposing service-role keys.

## Dashboard Metrics Layer

Added:

- `src/lib/phase5aAdminMetrics.js`

Responsibilities:

- Compute dashboard KPIs.
- Compute publishing SLA values.
- Build admin report rows for sources, providers, categories, queue, and moderation.
- Normalize review item labels and decision-band metadata.
