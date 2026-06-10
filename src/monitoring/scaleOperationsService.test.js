import test from 'node:test';
import assert from 'node:assert/strict';
import ScaleOperationsService from './scaleOperationsService.js';

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.sort = null;
    this.max = null;
  }

  select() {
    return this;
  }

  order(column, options = {}) {
    this.sort = { column, ascending: Boolean(options.ascending) };
    return this;
  }

  limit(value) {
    this.max = value;
    return this;
  }

  async _execute() {
    let rows = [...(this.db[this.table] || [])];
    if (this.sort) {
      const { column, ascending } = this.sort;
      rows.sort((a, b) => {
        const left = a[column] ?? '';
        const right = b[column] ?? '';
        if (left === right) return 0;
        return (left > right ? 1 : -1) * (ascending ? 1 : -1);
      });
    }
    if (Number.isInteger(this.max)) rows = rows.slice(0, this.max);
    return { data: rows, error: null, count: rows.length };
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

const supabaseMock = () => {
  const db = {
    ai_provider_settings: [
      {
        id: 'provider-1',
        provider_name: 'openrouter',
        model: 'free',
        priority: 1,
        is_active: true,
        stats: { requests: 2, successes: 2, failures: 0, avg_latency_ms: 1000 },
        health_status: 'healthy',
        api_key: 'secret-key',
      },
    ],
    ai_provider_failures: [],
    ai_job_drafts: [
      {
        id: 'draft-1',
        queue_item_id: 'queue-1',
        ai_provider: 'openrouter',
        tokens_used: 1000,
        generation_ms: 900,
        generated_data: { category: 'SSC' },
        quality_scores: { overall: 90 },
        status: 'published',
        created_at: '2026-06-05T00:00:00Z',
        updated_at: '2026-06-05T01:00:00Z',
      },
    ],
    ai_research_queue: [
      {
        id: 'queue-1',
        source_id: 'source-1',
        job_type: 'ssc',
        status: 'drafted',
        created_at: '2026-06-05T00:00:00Z',
        updated_at: '2026-06-05T01:00:00Z',
      },
    ],
    ai_review_results: [
      {
        id: 'review-1',
        draft_id: 'draft-1',
        queue_item_id: 'queue-1',
        publish_readiness: 90,
        confidence: 90,
        decision_band: 'recommended_publish',
        is_stale: false,
        created_at: '2026-06-05T02:00:00Z',
      },
    ],
    ai_moderation_actions: [
      { id: 'action-1', draft_id: 'draft-1', action: 'publish', created_at: '2026-06-05T03:00:00Z' },
    ],
    raw_job_notifications: [
      { id: 'raw-1', source_id: 'source-1', source_name: 'SSC', status: 'processed', created_at: '2026-06-05T00:00:00Z' },
    ],
    monitoring_metrics_snapshots: [],
    monitoring_alerts: [],
    ai_job_sources: [
      { id: 'source-1', name: 'SSC', is_active: true, created_at: '2026-06-01T00:00:00Z' },
    ],
    job_fetch_logs: [
      { id: 'fetch-1', source_id: 'source-1', status: 'success', started_at: '2026-06-05T00:00:00Z' },
    ],
    fetch_failures: [],
    job_fetch_duplicates: [],
  };

  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

test('ScaleOperationsService returns Phase 5C dashboards without leaking provider secrets', async () => {
  const result = await new ScaleOperationsService(supabaseMock(), {
    defaultBudgetUsd: 5,
    providerRates: { openrouter: 0.001, unknown: 0.001 },
    now: new Date('2026-06-07T00:00:00Z'),
  }).getScaleOperations({ days: 30, strategy: 'balanced' });

  assert.ok(result.costGovernance);
  assert.ok(result.providerRouting);
  assert.ok(result.retention);
  assert.ok(result.capacity);
  assert.ok(result.executiveReports.monthlyProviderReport);
  assert.equal(result.security.adminOnly, true);
  assert.equal(result.security.exposesProviderSecrets, false);
  assert.equal(JSON.stringify(result).includes('secret-key'), false);
});
