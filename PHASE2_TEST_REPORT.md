# Phase 2 Test Report

Audit date: 2026-06-04

## Test Command

```powershell
node --test src\jobs\ai\notificationExtractor.test.js src\jobs\ai\schemaValidator.test.js src\jobs\ai\duplicateAnalyzer.test.js src\jobs\ai\qualityGate.test.js src\jobs\ai\queueWorker.test.js src\jobs\fetchers\baseFetcher.test.js src\jobs\duplicateDetector.test.js src\jobs\jobFetchService.test.js src\jobs\titleNormalizer.test.js
```

## Result

Passed.

| Metric | Count |
| --- | ---: |
| Tests | 26 |
| Passed | 26 |
| Failed | 0 |

## New Phase 2 Tests

| Test File | Coverage |
| --- | --- |
| `notificationExtractor.test.js` | JSON-only prompt, untrusted source boundary, provider fallback attempts, validation failure. |
| `schemaValidator.test.js` | Valid extraction, malformed JSON rejection, hallucinated link rejection, invalid date rejection, ungrounded vacancy rejection. |
| `duplicateAnalyzer.test.js` | Title similarity, URL duplicate risk, raw-notification self-match exclusion. |
| `qualityGate.test.js` | Approved, manual review, and rejected score bands. |
| `queueWorker.test.js` | Draft save path, provider attempts persisted, raw notification processed, no partial draft on extraction failure. |

## Existing Focused Tests Re-run

| Test File | Result |
| --- | --- |
| `src/jobs/fetchers/baseFetcher.test.js` | passed |
| `src/jobs/duplicateDetector.test.js` | passed |
| `src/jobs/jobFetchService.test.js` | passed |
| `src/jobs/titleNormalizer.test.js` | passed |

## Build Verification

Command:

```powershell
npm run build
```

Result: passed.

Evidence:

- PDF worker copied successfully.
- Vite production build completed.
- Sitemap generation completed.
- Jobs loaded: 1.
- Total sitemap URLs: 222.

## Targeted Lint Verification

Command:

```powershell
node_modules\.bin\eslint src\jobs\ai api\admin\ai --quiet
```

Result: passed.

Repo-wide lint was not used as a Phase 2 gate because unrelated existing lint debt was already documented before this phase.

## Live Queue Validation

Live validation used production Supabase and real providers.

| Scenario | Result |
| --- | --- |
| Queue item -> AI draft | passed |
| Provider used | Cerebras |
| Corrected latest live draft status | `pending_review` |
| Corrected latest live draft final score | 74 |
| Corrected latest live draft duplicate risk | 0 |
| Malformed/ambiguous AI date output | rejected, no draft saved |
| Duplicate self-match bug | fixed and regression-tested |

## Quality Notes

- Invalid extraction is rejected before database save.
- Queue worker does not save partial drafts.
- Duplicate risk excludes the source raw notification itself.
- High duplicate risk prevents auto-approval.
