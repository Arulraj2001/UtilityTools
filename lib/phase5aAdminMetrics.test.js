import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportRows,
  computeOperationsDashboard,
  computePublishingSla,
  decisionBandMeta,
} from './phase5aAdminMetrics.js';

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const items = [
  {
    decisionBand: 'review_recommended',
    readiness: 82,
    confidence: 80,
    draft: {
      created_at: hoursAgo(10),
      generated_data: { organization: 'SSC', category: 'SSC' },
      ai_research_queue: { organization: 'Staff Selection Commission' },
    },
    review: { created_at: hoursAgo(5) },
  },
  {
    decisionBand: 'blocked',
    readiness: 40,
    confidence: 30,
    draft: {
      created_at: hoursAgo(20),
      generated_data: { organization: 'UPSC', category: 'UPSC' },
    },
  },
];

const overview = {
  queue: { counts: { pending: 1, processing: 0, drafted: 2, rejected: 0 }, oldestPendingAgeHours: 6 },
  quality: {
    averages: { readiness: 61, confidence: 55 },
    distributions: {
      decisionBands: { blocked: 1, review_recommended: 1 },
      approval: { approved: 1 },
    },
  },
  providers: {
    totals: { activeProviders: 2 },
    providers: [
      { providerName: 'openrouter', isActive: true, status: 'healthy', successRate: 95, failures: 1 },
      { providerName: 'groq', isActive: true, status: 'degraded', successRate: 65, failures: 4 },
    ],
  },
  alerts: [{ severity: 'critical' }, { severity: 'high' }],
  moderation: {
    totals: { reviews: 3, approvals: 1, rejections: 0, conversions: 1, publishes: 0 },
    recent: [{ action: 'publish', created_at: hoursAgo(2) }],
  },
};

test('computePublishingSla measures draft, review, publish, and blocked ages', () => {
  const sla = computePublishingSla(items, overview.moderation);

  assert.ok(sla.averageDraftAgeHours >= 10);
  assert.ok(sla.averageReviewAgeHours >= 2);
  assert.ok(sla.publishAgeHours >= 1);
  assert.ok(sla.oldestPendingReviewHours >= 9);
  assert.ok(sla.oldestBlockedDraftHours >= 19);
});

test('buildReportRows summarizes sources, providers, categories, queue, and moderation', () => {
  const rows = buildReportRows(items, overview);

  assert.equal(rows.sources[0].count, 1);
  assert.equal(rows.categories.length, 2);
  assert.equal(rows.providers[1].status, 'degraded');
  assert.equal(rows.queue.find((row) => row.name === 'Pending').count, 1);
  assert.equal(rows.moderation.find((row) => row.name === 'Conversions').count, 1);
});

test('computeOperationsDashboard returns Phase 5A KPI groups', () => {
  const dashboard = computeOperationsDashboard({ overview, reviewQueue: { items } });

  assert.equal(dashboard.queue.pending, 1);
  assert.equal(dashboard.drafts.approved, 1);
  assert.equal(dashboard.drafts.blocked, 1);
  assert.equal(dashboard.review.averageReadiness, 61);
  assert.equal(dashboard.providers.unhealthy, 1);
  assert.equal(dashboard.alerts.critical, 1);
  assert.equal(dashboard.oldestPendingItemHours, 6);
});

test('decisionBandMeta returns stable labels for queue chips', () => {
  assert.equal(decisionBandMeta('recommended_publish').label, 'Recommended');
  assert.equal(decisionBandMeta('blocked').label, 'Blocked');
  assert.equal(decisionBandMeta('unknown').label, 'unknown');
});
