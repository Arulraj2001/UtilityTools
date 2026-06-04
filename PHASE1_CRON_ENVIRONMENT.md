# Phase 1 Cron Environment

Audit date: 2026-06-04

## Required Environment Variables

Set these in Vercel Production and in local `.env` when testing the cron endpoint:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` or `VITE_SUPABASE_URL` | yes | Supabase project URL used by the serverless cron route. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side Supabase key used to write fetch logs, raw notifications, failures, and queue records. |
| `JOB_FETCH_CRON_SECRET` | yes | Preferred ingestion cron secret. |

Compatibility aliases supported by code:

- `CRON_FETCH_SECRET`
- `CRON_SECRET`

Use one canonical secret value in production. For Vercel Cron, set `CRON_SECRET` because Vercel uses that variable for its automatic bearer token. If you also set `JOB_FETCH_CRON_SECRET`, set it to the same value.

## Secret Generation

Use a high-entropy value, at least 32 random bytes encoded as hex or base64. Do not use a word, password, admin login secret, Supabase key, or provider API key as the cron secret.

Example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Compatibility

The endpoint accepts either:

- `x-cron-secret: <secret>`
- `Authorization: Bearer <secret>`

Local request shape:

```bash
curl -X POST http://localhost:5173/api/cron/fetch-jobs \
  -H "x-cron-secret: $JOB_FETCH_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"maxSources":1}'
```

Validation already completed before the GET compatibility patch:

- No secret header returned `401`.
- Correct temporary secret returned `200` for a zero-source local compatibility run.

## Vercel Compatibility

Official Vercel Cron behavior:

- Vercel invokes cron paths with HTTP `GET`.
- Vercel sends `Authorization: Bearer <CRON_SECRET>` when the project has `CRON_SECRET` configured.
- Vercel cron paths are configured in `vercel.json`.

The route now accepts both `GET` and `POST`, so it is compatible with Vercel Cron while preserving the existing POST workflow for manual local validation and external schedulers. The route accepts any configured value from `JOB_FETCH_CRON_SECRET`, `CRON_FETCH_SECRET`, or `CRON_SECRET`.

Suggested `vercel.json` entry when production scheduling is enabled:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-jobs",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Do not enable the schedule until admin auth and IBPS TLS blockers are closed.

## Security Notes

- The cron route must never run without a configured secret.
- Store cron secrets only as server-side environment variables.
- Do not expose the cron secret through `VITE_` variables.
- Rotate the secret after any accidental logging or sharing.
- Keep the endpoint idempotent by retaining the recent-running fetch check.
