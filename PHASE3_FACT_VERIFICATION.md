# Phase 3 Fact Verification

Audit date: 2026-06-04

## Objective

Design `FactVerifier`, an independent verification layer that checks critical draft facts against official source evidence.

Rule: never trust AI output alone.

## Fields to Verify

Required verification targets:

- official website
- application URL
- PDF URL
- important dates
- organization
- category

Recommended additional targets:

- vacancies
- salary
- qualification
- age limit
- job location
- application mode

## Evidence Sources

FactVerifier should compare draft facts against:

1. Linked `raw_job_notifications` row.
2. `raw_text` and `raw_html`.
3. `notification_url`.
4. `pdf_url`.
5. `ai_job_sources` source tier and source category.
6. Existing `jobs` rows for duplicate URL checks.
7. Optional live HEAD/GET checks for URLs.

Live checks should be bounded by strict timeout and should never block admin page rendering. Store results asynchronously.

## Verification Output

Recommended record shape:

```json
{
  "verificationScore": 91,
  "sourceConfidence": 94,
  "fieldResults": {
    "official_website": {
      "status": "verified",
      "confidence": 100,
      "evidence": "matches source origin"
    },
    "application_link": {
      "status": "missing_in_source",
      "confidence": 80,
      "evidence": "field empty and source has no explicit apply URL"
    },
    "important_dates": {
      "status": "verified",
      "confidence": 90,
      "evidence": "date token found in raw source text"
    }
  },
  "blockingIssues": [],
  "warnings": []
}
```

## Field Rules

### Official Website

Verified when:

- extracted URL matches known source URL, or
- extracted origin matches official source origin, or
- source tier marks the domain as trusted.

Blocked when:

- domain differs from official source without evidence
- URL is non-HTTP(S)
- URL is from unrelated host

### Application URL

Verified when:

- exact URL appears in `raw_text`, `raw_html`, source URL list, or normalized link set
- URL domain matches official source and path is present in source evidence

Warn when:

- empty but application mode is online

Block when:

- URL is fabricated or not source-grounded

### PDF URL

Verified when:

- matches `raw_job_notifications.pdf_url`
- exact URL appears in source text/html
- URL has PDF-like path or content-type evidence

Warn when:

- source has PDF URL but draft omits it

### Dates

Verified when:

- date appears exactly or normalized in source text
- date is a valid calendar date

Warn when:

- date is ambiguous
- month/year only is present

Block when:

- impossible date
- date not present in source
- deadline is in the past unless draft is explicitly marked historical/closed

### Organization

Verified when:

- exact or normalized organization name appears in source
- known source config maps to organization

Warn when:

- organization is generic

Block when:

- organization contradicts source domain/source config

### Category

Verified when:

- category aligns with organization, source category, title tokens, or source config

Warn when:

- category confidence below 75

## Confidence Model

Recommended weights:

| Evidence | Weight |
| --- | ---: |
| Official source URL/domain match | 20 |
| Raw source text linked | 20 |
| Critical URLs verified | 20 |
| Dates verified | 15 |
| Organization verified | 15 |
| Category verified | 10 |

Confidence should be capped at:

- 70 if raw notification is missing
- 75 if no official URL can be verified
- 80 if critical date evidence is missing
- 60 if any critical field contradicts source evidence

## Blocking Conditions

FactVerifier should block `recommended_publish` when:

- application URL is hallucinated
- PDF URL is hallucinated
- organization contradicts official source
- all important dates are unverified
- duplicate URL already exists in `jobs`
- vacancy/salary contains ungrounded numbers
- source is unavailable and no raw evidence is stored

## Storage Plan

Recommended table:

`ai_fact_verifications`

Fields:

- `id`
- `draft_id`
- `queue_item_id`
- `raw_notification_id`
- `verification_score`
- `source_confidence`
- `field_results jsonb`
- `blocking_issues jsonb`
- `warnings jsonb`
- `verified_at`
- `verified_by` (`system` or admin id)
- `created_at`
- `updated_at`

## Verdict

FactVerifier should be required before any draft receives a 90+ publish-readiness recommendation.

