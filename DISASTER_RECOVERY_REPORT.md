# Disaster Recovery Report

## Scope

Reviewed Supabase backup, migration recovery, environment recovery, and deployment recovery expectations.

## Recovery Model

- Source of truth: Supabase Postgres.
- Recovery artifacts: SQL migrations, environment variables, deployed API routes, and Git-tracked application code.
- Operational snapshots: `monitoring_metrics_snapshots`.
- Alert history: `monitoring_alerts`.

## RTO / RPO

- Recommended RTO: 4 hours for database restore plus redeploy.
- Recommended RPO: 24 hours or better using Supabase scheduled backups.
- Recommended critical-table export cadence: daily for job intelligence tables until volume stabilizes.

## Deployment Restart Behavior

Hardening added:

- Stale queue recovery after worker interruption.
- Existing draft recovery after draft save crash.
- Existing job recovery after conversion crash.

## Remaining Production Blocker

The Phase 4.5 DB hardening migration has not been applied to production, so the database backstop portion of DR is pending.
