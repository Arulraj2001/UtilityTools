# Phase 4.5 Live Validation

## Required Live Checks

- Queue health.
- Draft health.
- Review health.
- Moderation health.
- Monitoring health.
- Data integrity.
- RLS visibility.
- Snapshot persistence.

## Prepared Script

Created:

```bash
scripts/phase4-5-live-validation.mjs
```

The script reads production data with the service role, computes operational overview, checks duplicate/orphan invariants, persists a `phase4_5_live_validation` snapshot, and probes anon RLS visibility.

## Execution Status

Not executed.

Reason: Supabase command execution requiring escalation was rejected because the workspace is out of approval credits.

## Production Blocker

Live production validation must be run successfully before Phase 5 readiness.
