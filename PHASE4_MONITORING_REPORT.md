# Phase 4 Monitoring Report

## Dashboards Supported

### Provider Health

Tracks status, success rate, failure rate, latency, timeout rate, quota failures, auth failures, last success, and last failure.

### Queue Health

Tracks pending, processing, drafted, rejected, oldest pending age, oldest processing age, retries, and throughput.

### Draft Quality

Tracks quality score, duplicate risk, approval distribution, rejection distribution, readiness, confidence, and validation failures.

### Moderation

Tracks approvals, rejections, revisions, conversions, publishes, overrides, bulk actions, and review activity by day/week/month/admin.

### Costs

Tracks tokens, requests, provider usage, estimated spend, daily cost, monthly cost, and projected monthly cost.

### Overview

`GET /api/admin/monitoring/overview` returns all dashboard data in one request.

## Snapshotting

`monitoring_metrics_snapshots` stores full dashboard payloads for historical operational review.

## Result

Pass.
