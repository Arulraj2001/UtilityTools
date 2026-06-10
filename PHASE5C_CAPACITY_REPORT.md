# Phase 5C Capacity Report

Date: 2026-06-07
Status: Implemented

## Capacity Planning

The new capacity model analyzes current throughput and projects required operating capacity for:

- 100 jobs/month
- 1,000 jobs/month
- 10,000 jobs/month

## Throughput Metrics

Tracked throughput:

- Queue throughput
- Draft throughput
- Review throughput
- Publish throughput

## Scenario Modeling

Each scenario returns:

- Daily job requirement
- Estimated raw notification rows
- Estimated queue rows
- Estimated draft rows
- Estimated review rows
- Estimated moderation rows
- Estimated provider tokens
- Estimated provider cost
- Queue, draft, review, and publish coverage percentages
- Capacity status
- Bottleneck list

## Status Bands

- `healthy`: minimum throughput coverage >= 120%
- `watch`: minimum throughput coverage >= 80%
- `constrained`: minimum throughput coverage < 80%

## Archival

No automatic archival is implemented. Retention output is recommendation-only.

