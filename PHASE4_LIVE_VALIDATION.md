# Phase 4 Live Validation

## Command Run

```bash
node scripts/phase4-live-validation.mjs
```

## Production Results

Provider stats:

- Providers: 6.
- Active providers: 6.
- Total provider requests: 162.
- Provider failures: 121.

Queue stats:

- Pending: 2.
- Processing: 0.
- Drafted: 3.
- Rejected: 1.
- Total: 6.

Quality stats:

- Average quality score: 73.
- Average readiness: 71.
- Average confidence: 49.
- Validation failures: 5.
- Decision bands: 2 blocked, 1 review recommended.

Moderation stats:

- Reviews: 6.
- Approvals: 0.
- Rejections: 0.
- Revisions: 0.
- Conversions: 0.
- Publishes: 0.
- Overrides: 0.

Cost stats:

- Tokens used: 23,263.
- Requests: 9.
- Provider tests: 24.
- Estimated spend: 0.
- Projected monthly cost: 0.

Alerts and snapshots:

- Computed alerts: 6.
- Persisted alerts: 6.
- Persisted snapshots: 1.

RLS:

- Anonymous client saw zero rows in `monitoring_alerts`.
- Anonymous client saw zero rows in `monitoring_metrics_snapshots`.

## Result

Pass.
