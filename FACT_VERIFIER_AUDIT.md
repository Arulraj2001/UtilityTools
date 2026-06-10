# Fact Verifier Audit

## Scope

Audited URL, PDF, application link, organization, date, category, and supplemental field verification in `src/jobs/review/factVerifier.js`.

## Verified

- Hallucinated application URLs are blocked.
- Invalid URLs are blocked.
- PDF URLs must appear in evidence.
- Application links must appear in evidence.
- Organization mismatch is blocked.
- Invalid critical dates are blocked.
- Duplicate URL evidence is blocked.
- Category is reviewed as inferred/verbatim evidence.
- Critical supplemental facts are blocked when ungrounded.

## Bypass Attempts

- Fake application domain: blocked.
- Invalid date `2026-02-31`: blocked.
- Ungrounded salary `Rs 99,999 per month`: blocked.
- Duplicate URL log with similarity >= 80: blocked.

## Defects Fixed

Before Phase 3.5, ungrounded salary/vacancy-style facts were warnings. They now create critical blockers for salary, vacancies, qualification, and age.

## Result

Pass. The verifier now blocks critical ungrounded facts instead of allowing them through as warnings.
