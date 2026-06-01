# Provider Monitoring Audit

Audit date: 2026-06-01

## Verdict

Status: PASS WITH WARNINGS

`scripts/monitorProviders.js` runs in one-off mode and writes provider stats. Failure logging code exists and historical failure rows are present. The one-off audit run tested only Cerebras because it is the only active provider in the database.

## Script Review

PASS:

- Loads server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Uses `ws` transport for Node 20 Supabase compatibility.
- Supports `--once`.
- Supports daemon mode with `node-cron`.
- Reads providers from `ai_provider_settings`.
- Skips inactive providers and providers without API keys.
- Calls `testProvider()`.
- Updates provider stats, health, latency, and `last_tested`.
- Logs failures into `ai_provider_failures`, with analytics fallback.
- Refreshes provider models best-effort.

## One-Off Mode

Command run:

```bash
npm run monitor:providers
```

Result:

- Tested `cerebras`.
- Provider returned OK in 6939 ms.
- Command exited successfully.

## DB Write Verification

PASS: After the one-off run, Cerebras showed:

- `last_tested`: `2026-06-01T02:07:44.331+00:00`
- `last_latency_ms`: 6939
- `health_status`: healthy
- requests increased to 16
- successes increased to 15

PASS: Recent `ai_provider_failures` rows exist for failed providers.

## Daemon Mode

PASS by code review:

- `npm run monitor:providers-daemon` runs `node scripts/monitorProviders.js`.
- The script schedules `runOnce()` on `AI_MONITOR_CRON` or every 5 minutes by default.

WARNING:

- Daemon mode was not left running after the audit.
- There is no process supervisor configuration in repo for production daemon hosting.

## Limitations

WARNING:

- The script monitors AI provider health only. It does not crawl vacancy sources or create research queue items.
- Failure logging was not triggered during the one-off run because the only active provider passed.

## Required Fixes

1. Configure a production scheduler or worker process if daemon mode is required.
2. Activate more than one healthy provider if fallback monitoring is expected.
3. Consider adding monitor run IDs for easier audit traceability.

