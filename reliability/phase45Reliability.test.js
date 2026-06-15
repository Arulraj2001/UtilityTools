import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import ProviderSelector from '../jobs/ai/providerSelector.js';
import QueueWorker from '../jobs/ai/queueWorker.js';
import JobFetchService from '../jobs/jobFetchService.js';
import ReviewEngine from '../jobs/review/reviewEngine.js';
import { buildModerationItem, sortModerationQueue } from '../jobs/review/moderationQueue.js';
import AlertEngine from '../monitoring/alertEngine.js';
import { CALLERS } from '../../server/ai/providerCore.js';

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.sorts = [];
    this.patch = null;
    this.rowsToInsert = null;
    this.max = null;
  }

  select() { return this; }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  lt(column, value) {
    this.filters.push((row) => String(row[column] || '') < String(value));
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
    if (!this.db[this.table]) this.db[this.table] = [];
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

const createSupabaseMock = (seed = {}) => {
  const db = {
    ai_provider_settings: [],
    ai_provider_failures: [],
    ai_generation_usage: [],
    ai_research_queue: [],
    raw_job_notifications: [],
    ai_job_drafts: [],
    ai_duplicate_log: [],
    job_fetch_logs: [],
    ...seed,
  };
  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

const provider = (name, priority) => ({
  id: `${name}-id`,
  provider_name: name,
  api_key: `${name}-key`,
  model: '',
  priority,
  is_active: true,
  health_status: 'unknown',
  stats: { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0 },
});

test('Phase 4.5 provider failure test logs every failed fallback and saves no partial draft', async () => {
  const providers = ['cerebras', 'openrouter', 'groq', 'gemini', 'deepseek'];
  const supabase = createSupabaseMock({
    ai_provider_settings: providers.map((name, index) => provider(name, index + 1)),
  });
  const originalCallers = { ...CALLERS };

  try {
    providers.forEach((name) => {
      CALLERS[name] = async () => {
        const error = new Error(`${name} unavailable`);
        error.status = 503;
        throw error;
      };
    });

    await assert.rejects(
      () => new ProviderSelector(supabase, { timeoutMs: 100 }).generate('prompt', {
        phase: 'phase4_5_provider_failure_test',
        queueItemId: 'queue-chaos-1',
      }),
      /unavailable|failed/i,
    );
    assert.deepEqual(
      supabase.db.ai_provider_failures.map((row) => row.provider_name),
      providers,
    );

    const workerSupabase = createSupabaseMock({
      ai_research_queue: [{
        id: 'queue-chaos-1',
        status: 'pending',
        extracted_data: { raw_notification_id: 'raw-chaos-1' },
        duplicate_check: {},
      }],
      raw_job_notifications: [{
        id: 'raw-chaos-1',
        queue_item_id: 'queue-chaos-1',
        metadata: {},
        status: 'queued',
      }],
    });
    const worker = new QueueWorker(workerSupabase, {
      maxRetries: 0,
      extractor: { async extract() { throw new Error('All providers failed'); } },
    });
    const result = await worker.processItem(workerSupabase.db.ai_research_queue[0]);
    assert.equal(result.status, 'rejected');
    assert.equal(workerSupabase.db.ai_job_drafts.length, 0);
  } finally {
    Object.entries(originalCallers).forEach(([name, caller]) => {
      CALLERS[name] = caller;
    });
  }
});

test('Phase 4.5 queue recovery test reclaims stale processing without duplicate drafts', async () => {
  const supabase = createSupabaseMock({
    ai_research_queue: [{
      id: 'queue-recovery-1',
      status: 'processing',
      updated_at: '2026-06-05T00:00:00Z',
      extracted_data: { raw_notification_id: 'raw-recovery-1' },
      duplicate_check: {},
    }],
    raw_job_notifications: [{
      id: 'raw-recovery-1',
      queue_item_id: 'queue-recovery-1',
      metadata: {},
      status: 'queued',
    }],
    ai_job_drafts: [{
      id: 'draft-recovery-1',
      queue_item_id: 'queue-recovery-1',
      ai_provider: 'openrouter',
      status: 'pending_review',
      quality_scores: { queueStatus: 'drafted', finalScore: 82, duplicateRisk: 3 },
      created_at: '2026-06-05T01:00:00Z',
    }],
  });
  const worker = new QueueWorker(supabase, {
    extractor: { async extract() { throw new Error('extractor should not run'); } },
  });

  const result = await worker.processQueue({ staleProcessingMinutes: 1 });
  assert.equal(result.recovered, 1);
  assert.equal(result.processed, 0);
  assert.equal(supabase.db.ai_research_queue[0].status, 'drafted');
  assert.equal(supabase.db.ai_job_drafts.length, 1);
});

test('Phase 4.5 cron resilience distinguishes recent running locks from stale locks', async () => {
  const recent = createSupabaseMock({
    job_fetch_logs: [{ id: 'recent', status: 'running', started_at: new Date().toISOString() }],
  });
  const stale = createSupabaseMock({
    job_fetch_logs: [{ id: 'stale', status: 'running', started_at: '2026-06-04T00:00:00Z' }],
  });

  assert.equal(await new JobFetchService({ supabase: recent }).hasRecentRunningFetch(30), true);
  assert.equal(await new JobFetchService({ supabase: stale }).hasRecentRunningFetch(30), false);
});

const makeReviewContext = (index) => {
  const org = index % 5 === 0 ? 'Union Public Service Commission' : 'Staff Selection Commission';
  const domain = index % 5 === 0 ? 'upsc.gov.in' : 'ssc.gov.in';
  const duplicateRisk = index % 97 === 0 ? 85 : index % 23 === 0 ? 45 : 5;

  return {
    draft: {
      id: `draft-load-${index}`,
      queue_item_id: `queue-load-${index}`,
      quality_scores: {
        extractionScore: 90,
        seo: 88,
        completenessScore: 90,
        duplicateRisk,
        freshness: 85,
        issues: [],
      },
      generated_data: {
        title: `${org} Recruitment ${index}`,
        organization: org,
        official_website: `https://${domain}`,
        notification_pdf: `https://${domain}/notice-${index}.pdf`,
        apply_link: `https://${domain}/apply-${index}`,
        important_dates: [{ event: 'Last date', date: '2026-07-31' }],
        vacancies: '120',
        salary: 'Not specified',
        qualification: 'Graduate degree',
        job_location: 'India',
        application_mode: 'Online',
        category: index % 5 === 0 ? 'UPSC' : 'SSC',
        tags: index % 5 === 0 ? ['upsc'] : ['ssc', 'cgl'],
      },
    },
    queueItem: {
      id: `queue-load-${index}`,
      title: `${org} Recruitment ${index}`,
      organization: org,
      source_url: `https://${domain}`,
      raw_input: `${org} recruitment. Graduate degree. Apply online at https://${domain}/apply-${index}. Last date 31/07/2026. Total 120 vacancies.`,
      duplicate_check: { risk_score: duplicateRisk },
    },
    rawNotification: {
      id: `raw-load-${index}`,
      queue_item_id: `queue-load-${index}`,
      organization: org,
      notification_url: `https://${domain}`,
      pdf_url: `https://${domain}/notice-${index}.pdf`,
      raw_text: `${org} recruitment. Graduate degree. Apply online at https://${domain}/apply-${index}. Last date 31/07/2026. Total 120 vacancies.`,
    },
    source: { id: `source-load-${index}`, name: org, url: `https://${domain}`, tier: 1, category: 'government' },
    duplicateLogs: duplicateRisk >= 80 ? [{ is_duplicate: true, similarity: duplicateRisk }] : [],
  };
};

test('Phase 4.5 load validation handles 100, 500, 1000, and 5000 review simulations', () => {
  const engine = new ReviewEngine();
  const results = [100, 500, 1000, 5000].map((size) => {
    const started = performance.now();
    const items = [];
    for (let index = 0; index < size; index += 1) {
      const context = makeReviewContext(index);
      const review = engine.review(context);
      items.push(buildModerationItem({ draft: context.draft, review }));
    }
    const sorted = sortModerationQueue(items);
    const elapsedMs = Math.round(performance.now() - started);
    return { size, elapsedMs, sortedCount: sorted.length, topPriority: sorted[0]?.priority || 0 };
  });

  assert.deepEqual(results.map((row) => row.sortedCount), [100, 500, 1000, 5000]);
  assert.ok(results.every((row) => row.elapsedMs < 10_000));
});

test('Phase 4.5 observability validation triggers all required operational alerts', () => {
  const alerts = new AlertEngine(null).evaluate({
    providers: { providers: [{ providerName: 'cerebras', isActive: true, successRate: 0, requests: 5, failures: 5, p95LatencyMs: 31_000 }] },
    queue: { counts: { pending: 150 }, oldestPendingAgeHours: 25 },
    quality: {
      validationFailures: 30,
      counts: { verifications: 100, reviews: 100 },
      distributions: { decisionBands: { blocked: 30 } },
      averages: { duplicateRisk: 80 },
    },
    moderation: { totals: { overrides: 1 } },
  });
  const types = alerts.map((item) => item.type);
  [
    'provider_success_rate_low',
    'provider_latency_high',
    'queue_pending_high',
    'queue_oldest_pending_stale',
    'validation_failure_rate_high',
    'blocked_draft_rate_high',
    'duplicate_risk_spike',
    'publish_override_detected',
  ].forEach((type) => assert.ok(types.includes(type), type));
});
