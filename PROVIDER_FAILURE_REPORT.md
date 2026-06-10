# Provider Failure Report

## Scope

Simulated Cerebras, OpenRouter, Groq, Gemini, and DeepSeek provider outage behavior for the Phase 2 provider fallback chain and queue worker failure handling.

## Validation

- Fallback order verified: Cerebras -> OpenRouter -> Groq -> Gemini -> DeepSeek.
- Every failed provider attempt creates a sanitized provider failure row in the mocked `ai_provider_failures` store.
- Queue worker rejects the item after retry exhaustion.
- No partial `ai_job_drafts` row is saved when extraction fails before a validated draft exists.

## Evidence

Command run:

```bash
node --test src/reliability/phase45Reliability.test.js src/jobs/ai/providerSelector.test.js src/jobs/ai/queueWorker.test.js src/jobs/review/adminReviewService.test.js src/monitoring/monitoringServices.test.js
```

Result: 21 passed, 0 failed.

Broader regression command:

```bash
node --test src/jobs/titleNormalizer.test.js src/jobs/jobFetchService.test.js src/jobs/duplicateDetector.test.js src/jobs/fetchers/baseFetcher.test.js src/jobs/ai/duplicateAnalyzer.test.js src/jobs/ai/schemaValidator.test.js src/jobs/ai/queueWorker.test.js src/jobs/ai/qualityGate.test.js src/jobs/ai/providerSelector.test.js src/jobs/ai/notificationExtractor.test.js src/jobs/review/factVerifier.test.js src/jobs/review/autoCategoryEngine.test.js src/jobs/review/tagEngine.test.js src/jobs/review/publishReadiness.test.js src/jobs/review/reviewEngine.test.js src/jobs/review/moderationQueue.test.js src/jobs/review/adminReviewService.test.js src/monitoring/monitoringServices.test.js src/reliability/phase45Reliability.test.js
```

Result: 62 passed, 0 failed.

## Defects Fixed

- Confirmed no partial draft save on provider-wide outage.
- No provider secret exposure was observed in logged attempts.

## Status

Provider failure behavior is locally validated.
