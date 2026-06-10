# Phase 3.5 Monitoring Report

## Current Visibility

The system records:

- Review rows in `ai_review_results`.
- Verification rows in `ai_fact_verifications`.
- Moderation events in `ai_moderation_actions`.
- Decision bands, warnings, recommendations, and blocking issues.
- Publish actions and override actions.

## Recommended Dashboards

- Review volume by day.
- Decision-band distribution.
- Blocked drafts by blocker code.
- Verification score trend.
- Source confidence trend.
- Drafts with stale reviews.
- Moderation action counts by admin and action.
- Publish actions and override actions.
- Conversion latency from draft creation to job draft.

## Alert Recommendations

- More than 25% of reviews blocked in a 24-hour period.
- Any publish override.
- Any blocked draft approval attempt.
- Reviews with missing scoring or verification version.
- Reviews older than the current scoring version.

## Result

Pass with dashboard recommendations. No monitoring blocker exists because the underlying audit data is present.
