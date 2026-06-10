# Hallucination Report

Audit date: 2026-06-04

## Method

Compared current Phase 2 extractions against:

- live Supabase `raw_job_notifications` source text and official URLs
- official source pages where accessible
- schema validation for grounded URLs, dates, vacancies, and salary

Official source checks included:

- RAC/DRDO official page: https://rac.gov.in/index.php?lang=en&id=0
- Railway Board source page: https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0%2C7%2C1281

## Current Phase 2 Results

| Field Type | Result |
| --- | --- |
| Vacancies | No invented numeric vacancies detected |
| Salary | No invented salary detected |
| Application links | No fabricated application links detected |
| Notification PDFs | Extracted PDF URL matched source where present |
| Dates | Dates passed strict date validation |
| Organizations | Organizations matched source context |

Current Phase 2 hallucination rate: 0 / 2 reviewed Phase 2 drafts.

## Hardening Fixes Applied

- Same-host but fabricated application/PDF URLs are now rejected.
- `official_website` may use the source origin, but application and PDF links must match official source URLs exactly.
- Vacancy and salary validation now rejects any numeric token not present in source text.
- Impossible numeric dates such as `31/02/2026` are rejected.

## Legacy Drafts

Three older drafts lack `phase2_extraction` and were excluded from Phase 2 hallucination scoring. They should remain human-reviewed artifacts, not evidence of current Phase 2 extraction behavior.

## Verdict

Hallucination controls are production-ready after the stricter URL, numeric, and date validation patches.

