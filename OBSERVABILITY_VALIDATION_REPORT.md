# Observability Validation Report

## Scope

Verified alerts for:

- Provider failure.
- Queue backlog.
- Blocked drafts.
- Validation spikes.
- Override actions.

## Defect Found And Fixed

Provider success-rate alert skipped providers with observed traffic and 0% success. This hid the most severe provider failure case.

Fix applied:

- `AlertEngine` now alerts when an active provider has observed traffic and success rate is below threshold, including 0%.

## Evidence

Phase 4.5 observability validation triggered all required alert types:

- `provider_success_rate_low`
- `provider_latency_high`
- `queue_pending_high`
- `queue_oldest_pending_stale`
- `validation_failure_rate_high`
- `blocked_draft_rate_high`
- `duplicate_risk_spike`
- `publish_override_detected`

Result: 62 passed, 0 failed.

## Status

Observability logic is locally validated. Live alert persistence validation remains blocked by Supabase approval credits.
