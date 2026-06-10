# Retry Protection Report

## Scope

Verified provider retry limits, queue retry limits, stale processing recovery, failed item handling, and dead-letter-style rejection behavior.

## Findings

- Provider fallback attempts each configured Phase 2 provider once per generation call.
- Queue worker rejects failed items after `maxRetries` is exceeded.
- Stale processing recovery is capped using `phase2_recovery_count`.
- Failed raw notifications are marked `failed` on final Phase 2 failure.

## Fixes Applied

- Added stale processing recovery to prevent stuck `processing` rows after deployment restarts.
- Added idempotent draft recovery to prevent retry storms from generating duplicate drafts.

## Evidence

Regression result: 62 passed, 0 failed.

## Status

Retry protection is locally validated.
