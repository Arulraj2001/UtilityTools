# Phase 3 Security Plan

Audit date: 2026-06-04

## Objective

Design secure moderation, approval, and publishing controls for Phase 3.

## Permission Model

Recommended roles:

| Role | Capabilities |
| --- | --- |
| `admin_reviewer` | view queue, approve/reject drafts, mark needs revision |
| `admin_editor` | edit draft/job content |
| `admin_publisher` | publish jobs publicly |
| `admin_owner` | all actions, role management |

Current system has `admin_users.is_admin`. Phase 3 can start with all admins allowed, but the architecture should support more granular roles.

## Moderation Permissions

Allowed for reviewers:

- view review queue
- view evidence
- approve recommendation
- reject draft
- mark needs revision
- convert approved draft to job draft

Should require editor/publisher:

- edit generated content
- public publish
- override critical warnings

## Publish Permissions

Public publish should require:

- authenticated admin
- publish permission
- existing job quality gate passes
- no critical fact-verification blockers
- explicit publish confirmation
- audit log insert

## Audit Logs

Every action should be logged in `ai_moderation_actions`:

- view not required
- approve
- reject
- needs revision
- edit
- bulk approve
- bulk reject
- convert to job draft
- publish
- override warning

Each log should store:

- admin id
- draft id
- job id
- action
- reason code
- notes
- before state
- after state
- timestamp

## Approval History

Draft detail should show:

- review generated time
- verification generated time
- admin decisions
- edits
- conversion to job draft
- final publish action

## Override Policy

Critical warning overrides should require:

- publisher or owner role
- typed reason
- no bulk override
- audit log entry

Critical warnings should include:

- hallucinated URL
- organization mismatch
- duplicate risk >= 80
- invalid date
- missing raw evidence

## API Security

All Phase 3 APIs:

- require POST for state changes
- require admin auth
- validate request body
- cap bulk batch sizes
- redact sensitive fields in logs
- return safe response shapes
- never expose provider keys

## RLS

Recommended:

- Phase 3 tables admin-only via RLS.
- Public users cannot read review, verification, or moderation logs.
- Service role can write system-generated review results.

## Abuse Controls

- cap bulk actions, recommended max 25 per request
- rate-limit review generation
- require confirmation on publish and bulk actions
- prevent duplicate publish from same draft id
- idempotency key for publish endpoint

## Data Safety

Do not store:

- provider API keys
- raw auth headers
- full admin tokens

Store:

- provider name
- model
- classified failure types
- safe evidence excerpts

## Verdict

Phase 3 security is straightforward if review, conversion, and public publish are separate audited actions.

