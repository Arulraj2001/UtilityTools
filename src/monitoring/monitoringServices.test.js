import test from 'node:test';
import assert from 'node:assert/strict';
import ProviderHealthService from './providerHealthService.js';
import QueueMonitoringService from './queueMonitoringService.js';
import DraftQualityService from './draftQualityService.js';
import ModerationMonitoringService from './moderationMonitoringService.js';
import CostAnalyticsService from './costAnalyticsService.js';
import AlertEngine from './alertEngine.js';
import DashboardAggregator from './dashboardAggregator.js';

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.sorts = [];
    this.max = null;
    this.patch = null;
    this.rowsToInsert = null;
  }

  select() { return this; }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => String(row[column] || '') >= String(value));
    return this;
  }

  order(column, options = {}) {
    this.sorts.push({ column, ascending: Boolean(options.ascending) });
    return this;
  }

  limit(value) {
    this.max = value;
    return this;
  }

  insert(rows) {
    this.rowsToInsert = rows;
    return this;
  }

  update(patch) {
    this.patch = patch;
    return this;
  }

  _rows() {
    let rows = [...(this.db[this.table] || [])];
    this.filters.forEach((filter) => { rows = rows.filter(filter); });
    this.sorts.forEach(({ column, ascending }) => {
      rows.sort((a, b) => {
        const left = a[column] ?? '';
        const right = b[column] ?? '';
        if (left === right) return 0;
        return (left > right ? 1 : -1) * (ascending ? 1 : -1);
      });
    });
    if (Number.isInteger(this.max)) rows = rows.slice(0, this.max);
    return rows;
  }

  async _execute() {
    if (this.rowsToInsert) {
      const inserted = this.rowsToInsert.map((row, index) => ({
        id: row.id || `${this.table}-${this.db[this.table].length + index + 1}`,
        ...row,
      }));
      this.db[this.table].push(...inserted);
      return { data: inserted, error: null, count: inserted.length };
    }

    if (this.patch) {
      const rows = this._rows();
      rows.forEach((row) => Object.assign(row, this.patch));
      return { data: rows, error: null, count: rows.length };
    }

    const rows = this._rows();
    return { data: rows, error: null, count: rows.length };
  }

  async maybeSingle() {
    const result = await this._execute();
    return { ...result, data: result.data[0] || null };
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

const createSupabaseMock = () => {
  const db = {
    ai_provider_settings: [
      {
        id: 'provider-1',
        provider_name: 'openrouter',
        model: 'free/model',
        priority: 1,
        is_active: true,
        base_url: 'https://openrouter.ai',
        available_models: ['free/model'],
        stats: { requests: 10, successes: 6, failures: 4, avg_latency_ms: 31_000 },
        health_status: 'degraded',
        last_tested: '2026-06-05T01:00:00Z',
        last_latency_ms: 32_000,
      },
    ],
    ai_provider_failures: [
      { provider_name: 'openrouter', error: 'timeout', details: { error_type: 'timeout' }, duration_ms: 32_000, occurred_at: '2026-06-05T01:00:00Z' },
      { provider_name: 'openrouter', error: 'rate limit', details: { error_type: 'rate_limit' }, duration_ms: 2_000, occurred_at: '2026-06-05T00:00:00Z' },
    ],
    ai_generation_usage: [
      { usage_date: '2026-06-05', generation_count: 4, provider_test_count: 1, last_generation_at: '2026-06-05T01:00:00Z' },
    ],
    ai_research_queue: [
      { id: 'queue-1', status: 'pending', created_at: '2026-06-03T00:00:00Z', updated_at: '2026-06-03T00:00:00Z', extracted_data: { phase2_retries: 1 } },
      { id: 'queue-2', status: 'drafted', created_at: '2026-06-04T00:00:00Z', updated_at: '2026-06-05T00:00:00Z', extracted_data: {} },
      { id: 'queue-3', status: 'rejected', created_at: '2026-06-04T00:00:00Z', updated_at: '2026-06-05T00:00:00Z', extracted_data: {} },
    ],
    ai_job_drafts: [
      { id: 'draft-1', status: 'pending_review', ai_provider: 'openrouter', tokens_used: 2000, generation_ms: 1500, created_at: '2026-06-05T01:00:00Z', quality_scores: { overall: 80, duplicateRisk: 10 }, readiness_score: 82, confidence_score: 80 },
      { id: 'draft-2', status: 'rejected', ai_provider: 'openrouter', tokens_used: 1000, generation_ms: 1200, created_at: '2026-06-05T02:00:00Z', quality_scores: { finalScore: 50, duplicateRisk: 80 }, readiness_score: 50, confidence_score: 40 },
    ],
    ai_review_results: [
      { id: 'review-1', draft_id: 'draft-1', publish_readiness: 82, confidence: 80, decision_band: 'review_recommended', warnings: [], is_stale: false, created_at: '2026-06-05T01:00:00Z' },
      { id: 'review-2', draft_id: 'draft-2', publish_readiness: 50, confidence: 40, decision_band: 'blocked', warnings: [{ severity: 'critical' }], is_stale: false, created_at: '2026-06-05T02:00:00Z' },
    ],
    ai_fact_verifications: [
      { id: 'verification-1', draft_id: 'draft-1', verification_score: 90, source_confidence: 90, blocking_issues: [], warnings: [], verified_at: '2026-06-05T01:00:00Z' },
      { id: 'verification-2', draft_id: 'draft-2', verification_score: 40, source_confidence: 70, blocking_issues: [{ code: 'hallucinated_url' }], warnings: [], verified_at: '2026-06-05T02:00:00Z' },
    ],
    ai_moderation_actions: [
      { id: 'action-1', action: 'approve', admin_id: 'admin-1', created_at: '2026-06-05T01:00:00Z' },
      { id: 'action-2', action: 'override_blocker', admin_id: 'admin-1', created_at: '2026-06-05T02:00:00Z' },
    ],
    monitoring_alerts: [],
    monitoring_metrics_snapshots: [],
  };

  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

test('ProviderHealthService computes provider metrics without exposing secrets', async () => {
  const supabase = createSupabaseMock();
  const result = await new ProviderHealthService(supabase).getProviderHealth();

  assert.equal(result.providers[0].providerName, 'openrouter');
  assert.equal(result.providers[0].successRate, 60);
  assert.equal(result.providers[0].timeoutRate, 10);
  assert.equal(result.providers[0].quotaFailures, 1);
  assert.equal(result.providers[0].api_key, undefined);
});

test('QueueMonitoringService computes queue health and throughput', async () => {
  const supabase = createSupabaseMock();
  const result = await new QueueMonitoringService(supabase).getQueueHealth({ days: 7 });

  assert.equal(result.counts.pending, 1);
  assert.equal(result.counts.drafted, 1);
  assert.equal(result.counts.rejected, 1);
  assert.equal(result.retryCount, 1);
  assert.ok(result.throughput.completed >= 2);
});

test('DraftQualityService computes quality and validation metrics', async () => {
  const supabase = createSupabaseMock();
  const result = await new DraftQualityService(supabase).getQualityMetrics();

  assert.equal(result.averages.qualityScore, 65);
  assert.equal(result.averages.duplicateRisk, 45);
  assert.equal(result.distributions.decisionBands.blocked, 1);
  assert.equal(result.validationFailures, 1);
});

test('ModerationMonitoringService groups moderation actions', async () => {
  const supabase = createSupabaseMock();
  const result = await new ModerationMonitoringService(supabase).getModerationMetrics();

  assert.equal(result.totals.approvals, 1);
  assert.equal(result.totals.overrides, 1);
  assert.equal(result.byAdmin['admin-1'], 2);
});

test('CostAnalyticsService estimates provider spend', async () => {
  const supabase = createSupabaseMock();
  const result = await new CostAnalyticsService(supabase, {
    costPer1kTokens: { openrouter: 0.001 },
  }).getCostAnalytics({ days: 30 });

  assert.equal(result.totals.tokensUsed, 3000);
  assert.equal(result.providerUsage.openrouter, 2);
  assert.equal(result.totals.estimatedSpend, 0.003);
});

test('AlertEngine raises operational alerts and persists active alerts', async () => {
  const supabase = createSupabaseMock();
  const engine = new AlertEngine(supabase);
  const alerts = engine.evaluate({
    providers: { providers: [
      { providerName: 'openrouter', isActive: true, successRate: 60, requests: 10, failures: 4, p95LatencyMs: 31_000 },
      { providerName: 'cerebras', isActive: true, successRate: 0, requests: 3, failures: 3, p95LatencyMs: 1_000 },
    ] },
    queue: { counts: { pending: 101 }, oldestPendingAgeHours: 25 },
    quality: { validationFailures: 1, counts: { verifications: 2, reviews: 2 }, distributions: { decisionBands: { blocked: 1 } }, averages: { duplicateRisk: 80 } },
    moderation: { totals: { overrides: 1 } },
  });
  const persisted = await engine.persistAlerts(alerts);

  assert.ok(alerts.some((item) => item.type === 'queue_pending_high'));
  assert.ok(alerts.some((item) => item.type === 'provider_success_rate_low' && item.payload.providerName === 'cerebras'));
  assert.ok(alerts.some((item) => item.type === 'publish_override_detected'));
  assert.equal(persisted.length, alerts.length);
  assert.equal(supabase.db.monitoring_alerts.length, alerts.length);
});

test('DashboardAggregator returns single overview payload', async () => {
  const supabase = createSupabaseMock();
  const result = await new DashboardAggregator(supabase).getOverview({ days: 30, persistAlerts: false });

  assert.ok(result.providers);
  assert.ok(result.queue);
  assert.ok(result.quality);
  assert.ok(result.moderation);
  assert.ok(result.costs);
  assert.ok(Array.isArray(result.alerts));
});
