# Phase 5C Cost Report

Date: 2026-06-07
Status: Implemented

## Cost Governance

The platform now estimates provider spend from existing `ai_job_drafts.tokens_used` values and configurable provider rate assumptions.

Tracked outputs:

- Monthly provider budget
- Current month estimated spend
- Projected monthly spend
- Remaining budget
- Budget usage percentage
- Cost per draft
- Cost per category
- Cost per source
- Provider spend breakdown

## Budget Configuration

The admin endpoint accepts `monthlyBudgetUsd`.

Server default:

- `AI_PROVIDER_MONTHLY_BUDGET_USD`
- `PHASE5C_MONTHLY_PROVIDER_BUDGET_USD`
- fallback: `$25`

## Provider Cost Assumptions

Default rates are intentionally conservative estimates and can be overridden in service options:

- `cerebras`: `$0`
- `openrouter`: `$0`
- `groq`: `$0`
- `gemini`: `$0.00035 / 1K tokens`
- `huggingface`: `$0`
- `deepseek`: `$0.00014 / 1K tokens`
- `unknown`: `$0.00025 / 1K tokens`

## Governance Status Bands

- `healthy`: projected spend below watch threshold
- `watch`: projected spend at or above 80% of budget
- `critical`: current or projected spend exceeds budget

