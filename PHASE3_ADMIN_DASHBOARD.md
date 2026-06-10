# Phase 3 Admin Dashboard

Audit date: 2026-06-04

## Objective

Design an Admin Review Dashboard that reduces review effort by 80% while keeping admins in control.

## Main Views

### 1. Review Queue

Purpose:

- prioritized list of drafts by publish readiness

Columns:

- title
- organization
- readiness
- confidence
- verification status
- duplicate risk
- category suggestion
- top warning
- source tier
- deadline
- actions

### 2. Review Detail Drawer

Panels:

- AI draft preview
- source evidence
- fact verification
- readiness breakdown
- warnings
- duplicate evidence
- category/tag suggestions
- SEO preview
- action history

### 3. Bulk Review Panel

Capabilities:

- select recommended drafts
- bulk approve
- bulk reject blocked duplicates
- bulk mark needs revision

Bulk approval should only be available for:

- readiness >= 90
- confidence >= 85
- verification score >= 85
- duplicate risk < 40
- no critical warnings

### 4. Metrics Panel

Metrics:

- pending review count
- recommended publish count
- manual review count
- blocked count
- average readiness
- average review time
- bulk approval rate
- verification failure rate

## Required Actions

Single draft actions:

- approve
- reject
- edit
- publish
- create as draft job
- needs revision
- open official source
- open notification PDF
- copy warning summary

Bulk actions:

- bulk approve
- bulk reject
- bulk mark needs revision

## Action Definitions

### Approve

Marks the review recommendation as admin-approved. Does not necessarily publish publicly.

### Create as Draft Job

Creates a row in `jobs` with `status = draft`, preserving current safe behavior.

### Publish

Optional future action that sets `jobs.status = published`.

Requirements:

- publish permission
- existing job quality gate passes
- fact verification has no critical blockers
- action is audit-logged

### Reject

Marks draft as rejected with reason code.

### Edit

Allows admin to adjust generated data before conversion.

## Warning Display

Warnings should be grouped by severity:

- Critical
- High
- Medium
- Low

Each warning should show:

- field
- issue
- evidence
- recommendation

## Confidence UI

Use familiar status badges:

- green: ready
- yellow: review
- red: blocked

Avoid hiding the evidence behind a single score. Every recommendation must be explainable.

## Productivity Goal

Target review times:

| Draft Type | Current | Phase 3 Target |
| --- | ---: | ---: |
| high-confidence draft | 3-6 min | under 1 min |
| medium-confidence draft | 8-15 min | 2-4 min |
| risky draft | 10-20 min | unchanged but better triaged |

## UX Guardrails

- No invisible auto-publish.
- Bulk actions require confirmation.
- Critical warnings disable publish.
- Admin edits reset or mark review as stale.
- Every approval/rejection is audit-logged.

## Verdict

The dashboard should optimize for fast evidence scanning, not blind automation.

