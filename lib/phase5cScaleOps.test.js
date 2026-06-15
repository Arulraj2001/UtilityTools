import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCapacityPlanning,
  buildCostGovernance,
  buildExecutiveReports,
  buildPhase5CAnalytics,
  buildProviderRoutingPolicies,
  buildRetentionRecommendations,
} from './phase5cScaleOps.js';

const now = new Date('2026-06-07T12:00:00Z');

const providers = [
  {
    id: 'provider-1',
    provider_name: 'openrouter',
    model: 'cheap-model',
    priority: 1,
    is_active: true,
    stats: { requests: 20, successes: 18, failures: 2, avg_latency_ms: 1800 },
    health_status: 'healthy',
    last_latency_ms: 1700,
  },
  {
    id: 'provider-2',
    provider_name: 'gemini',
    model: 'quality-model',
    priority: 2,
    is_active: true,
    stats: { requests: 10, successes: 10, failures: 0, avg_latency_ms: 2400 },
    health_status: 'healthy',
    last_latency_ms: 2200,
  },
];

const sources = [
  { id: 'source-1', name: 'SSC', is_active: true },
  { id: 'source-2', name: 'UPSC', is_active: true },
];

const queue = [
  { id: 'queue-1', source_id: 'source-1', job_type: 'ssc', status: 'drafted', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-02T00:00:00Z' },
  { id: 'queue-2', source_id: 'source-2', job_type: 'upsc', status: 'drafted', created_at: '2026-06-02T00:00:00Z', updated_at: '2026-06-03T00:00:00Z' },
  { id: 'queue-3', source_id: 'source-1', job_type: 'ssc', status: 'pending', created_at: '2026-06-05T00:00:00Z', updated_at: '2026-06-05T00:00:00Z' },
];

const drafts = [
  {
    id: 'draft-1',
    queue_item_id: 'queue-1',
    ai_provider: 'openrouter',
    tokens_used: 2000,
    generation_ms: 1500,
    generated_data: { category: 'SSC' },
    quality_scores: { overall: 70 },
    status: 'published',
    created_at: '2026-06-02T01:00:00Z',
    updated_at: '2026-06-03T01:00:00Z',
  },
  {
    id: 'draft-2',
    queue_item_id: 'queue-2',
    ai_provider: 'gemini',
    tokens_used: 1000,
    generation_ms: 2400,
    generated_data: { category: 'UPSC' },
    quality_scores: { overall: 95 },
    status: 'approved',
    created_at: '2026-06-03T01:00:00Z',
    updated_at: '2026-06-03T02:00:00Z',
  },
];

const reviews = [
  { id: 'review-1', draft_id: 'draft-1', queue_item_id: 'queue-1', publish_readiness: 72, confidence: 80, decision_band: 'review_recommended', is_stale: false, created_at: '2026-06-02T02:00:00Z' },
  { id: 'review-2', draft_id: 'draft-2', queue_item_id: 'queue-2', publish_readiness: 96, confidence: 95, decision_band: 'recommended_publish', is_stale: false, created_at: '2026-06-03T02:00:00Z' },
];

const moderation = [
  { id: 'mod-1', draft_id: 'draft-1', action: 'publish', created_at: '2026-06-03T03:00:00Z' },
  { id: 'mod-2', draft_id: 'draft-2', action: 'approve', created_at: '2026-06-03T03:00:00Z' },
];

const rawNotifications = [
  { id: 'raw-1', source_id: 'source-1', source_name: 'SSC', status: 'processed', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T01:00:00Z' },
  { id: 'raw-old', source_id: 'source-1', source_name: 'SSC', status: 'duplicate', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T01:00:00Z' },
];

const providerRates = {
  openrouter: 0.001,
  gemini: 0.01,
  unknown: 0.001,
};

test('Phase 5C cost governance tracks monthly budget and cost dimensions', () => {
  const result = buildCostGovernance({
    drafts,
    queue,
    sources,
    reviews,
    monthlyBudgetUsd: 1,
    providerRates,
    now,
  });

  assert.equal(result.currentMonth, '2026-06');
  assert.equal(result.totals.tokensUsed, 3000);
  assert.equal(result.budget.currentMonthSpendUsd, 0.012);
  assert.equal(result.totals.averageCostPerDraftUsd, 0.006);
  assert.equal(result.costPerCategory.length, 2);
  assert.equal(result.costPerSource.find((row) => row.label === 'SSC').drafts, 1);
});

test('Phase 5C provider routing ranks strategies from existing metrics', () => {
  const result = buildProviderRoutingPolicies({
    providers,
    drafts,
    reviews,
    providerRates,
  });

  assert.equal(result.strategies['cheapest-first'].primaryProvider, 'openrouter');
  assert.equal(result.strategies['quality-first'].primaryProvider, 'gemini');
  assert.equal(result.strategies['fallback-only'].providerOrder[0].providerName, 'openrouter');
  assert.equal(result.providerMetrics.some((row) => row.qualityScore >= 95), true);
});

test('Phase 5C retention recommendations never enable automatic archival', () => {
  const result = buildRetentionRecommendations({
    rawNotifications,
    queue,
    drafts,
    reviews,
    moderation,
    monitoring: [],
    counts: { rawNotifications: rawNotifications.length },
    now,
    windowDays: 30,
  });

  const rawTable = result.tables.find((table) => table.key === 'raw_job_notifications');
  assert.equal(result.automaticArchival, false);
  assert.equal(rawTable.archiveCandidateRows, 1);
  assert.equal(result.recommendations.some((item) => item.risk === 'archive_review'), true);
});

test('Phase 5C capacity planning models 100, 1000, and 10000 jobs per month', () => {
  const costGovernance = buildCostGovernance({ drafts, queue, sources, reviews, monthlyBudgetUsd: 1, providerRates, now });
  const result = buildCapacityPlanning({
    rawNotifications,
    queue,
    drafts,
    reviews,
    moderation,
    costGovernance,
    now,
    windowDays: 30,
  });

  assert.deepEqual(result.scenarios.map((scenario) => scenario.monthlyJobs), [100, 1000, 10000]);
  assert.ok(result.scenarios[0].provider.estimatedTokens > 0);
  assert.equal(result.assumptions.averageCostPerDraftUsd, 0.006);
});

test('Phase 5C executive reports and security posture are generated', () => {
  const analytics = buildPhase5CAnalytics({
    providers,
    drafts,
    queue,
    reviews,
    moderation,
    rawNotifications,
    monitoring: [],
    sources,
    fetchLogs: [{ id: 'log-1', status: 'success' }],
    fetchFailures: [],
    fetchDuplicates: [],
    selectedStrategy: 'balanced',
    monthlyBudgetUsd: 1,
    providerRates,
    now,
    windowDays: 30,
  });
  const reports = buildExecutiveReports({
    costGovernance: analytics.costGovernance,
    providerRouting: analytics.providerRouting,
    retention: analytics.retention,
    capacity: analytics.capacity,
    sources,
    rawNotifications,
    fetchLogs: [{ id: 'log-1', status: 'success' }],
  });

  assert.ok(analytics.executiveReports.monthlyOperationsReport);
  assert.ok(reports.monthlyCostReport.summary.includes('projected spend'));
  assert.equal(analytics.security.adminOnly, true);
  assert.equal(analytics.security.exposesProviderSecrets, false);
  assert.equal(analytics.security.automaticArchival, false);
});
