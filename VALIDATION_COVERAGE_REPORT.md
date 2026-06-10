# Validation Coverage Report

Audit date: 2026-06-04

## Coverage Matrix

| Requirement | Coverage | Result |
| --- | --- | --- |
| Malformed JSON rejection | `schemaValidator.test.js` | pass |
| Invalid dates rejection | `schemaValidator.test.js` | pass |
| Impossible dates rejection | new test for `31/02/2026` | pass |
| Hallucinated links rejection | `schemaValidator.test.js` | pass |
| Same-host fabricated links rejection | new test | pass |
| Ungrounded vacancy rejection | `schemaValidator.test.js` | pass |
| Ungrounded salary rejection | new test | pass |
| No partial draft on validation failure | `queueWorker.test.js` | pass |
| Prompt injection isolation | `notificationExtractor.test.js` | pass |

## Validation Design

Validation layers:

- Zod schema for required extraction shape.
- AJV schema with `additionalProperties: false`.
- URL grounding against known official source URLs.
- Strict date parsing for ISO, numeric Indian date style, and month-name dates.
- Numeric grounding for vacancies and salary.

## Fixes Applied

- Tightened source URL trust rules.
- Tightened numeric grounding from "all numbers missing" to "any sensitive number missing".
- Added real-date validation for numeric dates.

## Test Evidence

Focused AI suite:

`node --test src\jobs\ai\notificationExtractor.test.js src\jobs\ai\schemaValidator.test.js src\jobs\ai\duplicateAnalyzer.test.js src\jobs\ai\qualityGate.test.js src\jobs\ai\queueWorker.test.js src\jobs\ai\providerSelector.test.js`

Result: 21 / 21 passing.

Broader job/AI suite:

Result: 31 / 31 passing.

## Verdict

Validation coverage is production-ready.

