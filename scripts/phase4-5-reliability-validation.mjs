import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import ProviderSelector from '../src/jobs/ai/providerSelector.js';
import QueueWorker from '../src/jobs/ai/queueWorker.js';
import JobFetchService from '../src/jobs/jobFetchService.js';
import ReviewEngine from '../src/jobs/review/reviewEngine.js';
import { buildModerationItem, sortModerationQueue } from '../src/jobs/review/moderationQueue.js';
import AlertEngine from '../src/monitoring/alertEngine.js';
import { CALLERS } from '../server/ai/providerCore.js';

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

const runProviderFailureTest = async () => {
  const supabase = createSupabaseMock({
    ai_provider_settings: [
      provider('cerebras', 1),
      provider('openrouter', 2),
      provider('groq', 3),
      provider('gemini', 4),
      provider('deepseek', 5),
    ],
  });
  const originalCallers = { ...CALLERS };
  const providers = ['cerebras', 'openrouter', 'groq', 'gemini', 'deepseek'];

  try {
    providers.forEach((name) => {
      CALLERS[name] = async () => {
        const error = new Error(`${name} unavailable`);
        error.status = 503;
        throw error;
      };
    });

    let thrown = null;
    try {
      await new ProviderSelector(supabase, { timeoutMs: 100 }).generate('prompt', {
        phase: 'phase4_5_provider_failure_test',
        queueItemId: 'queue-chaos-1',
      });
    } catch (error) {
      thrown = error;
    }

    const workerSupabase = createSupabaseMock({
      ai_research_queue: [{
        id: 'queue-chaos-1',
        title: 'Failure Draft',
        status: 'pending',
        extracted_data: { raw_notification_id: 'raw-chaos-1' },
        duplicate_check: {},
      }],
      raw_job_notifications: [{
        id: 'raw-chaos-1',
        queue_item_id: 'queue-chaos-1',
        raw_text: 'official notification',
        metadata: {},
        status: 'queued',
      }],
    });
    const worker = new QueueWorker(workerSupabase, {
      maxRetries: 0,
      extractor: {
        async extract() {
          const error = new Error('All providers failed');
          error.attempts = providers.map((name) => ({ providerName: name, ok: false }));
          throw error;
        },
      },
    });
    const queueResult = await worker.processItem(workerSupabase.db.ai_research_queue[0]);

    return {
      attemptedProviders: thrown?.attempts?.map((attempt) => attempt.providerName) || [],
      failureRows: supabase.db.ai_provider_failures.length,
      queueStatus: queueResult.status,
      partialDrafts: workerSupabase.db.ai_job_drafts.length,
      passed: Boolean(thrown) &&
        supabase.db.ai_provider_failures.length === 5 &&
        workerSupabase.db.ai_job_drafts.length === 0 &&
        queueResult.status === 'rejected',
    };
  } finally {
    Object.entries(originalCallers).forEach(([name, caller]) => {
      CALLERS[name] = caller;
    });
  }
};

const runQueueRecoveryTest = async () => {
  const supabase = createSupabaseMock({
    ai_research_queue: [{
      id: 'queue-recovery-1',
      title: 'Recovered Draft',
      status: 'processing',
      updated_at: '2026-06-05T00:00:00Z',
      extracted_data: { raw_notification_id: 'raw-recovery-1' },
      duplicate_check: {},
    }],
    raw_job_notifications: [{
      id: 'raw-recovery-1',
      queue_item_id: 'queue-recovery-1',
      raw_text: 'SSC CGL official notification',
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
    extractor: {
      async extract() {
        throw new Error('extractor should not be called for recovered draft');
      },
    },
  });
  const result = await worker.processQueue({ staleProcessingMinutes: 1 });
  return {
    recovered: result.recovered,
    processed: result.processed,
    queueStatus: supabase.db.ai_research_queue[0].status,
    rawStatus: supabase.db.raw_job_notifications[0].status,
    draftCount: supabase.db.ai_job_drafts.length,
    passed: result.recovered === 1 &&
      result.processed === 0 &&
      supabase.db.ai_research_queue[0].status === 'drafted' &&
      supabase.db.ai_job_drafts.length === 1,
  };
};

const runCronResilienceTest = async () => {
  const recent = createSupabaseMock({
    job_fetch_logs: [{ id: 'log-recent', status: 'running', started_at: new Date().toISOString() }],
  });
  const stale = createSupabaseMock({
    job_fetch_logs: [{ id: 'log-stale', status: 'running', started_at: '2026-06-04T00:00:00Z' }],
  });

  const recentBlocks = await new JobFetchService({ supabase: recent }).hasRecentRunningFetch(30);
  const staleBlocks = await new JobFetchService({ supabase: stale }).hasRecentRunningFetch(30);
  return {
    duplicateCronProtected: recentBlocks,
    staleRunningLockIgnored: !staleBlocks,
    passed: recentBlocks === true && staleBlocks === false,
  };
};

const makeReviewContext = (index) => {
  const org = index % 5 === 0 ? 'Union Public Service Commission' : 'Staff Selection Commission';
  const domain = index % 5 === 0 ? 'upsc.gov.in' : 'ssc.gov.in';
  const duplicateRisk = index % 97 === 0 ? 85 : index % 23 === 0 ? 45 : 5;
  const blockedUrl = index % 113 === 0;

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
        apply_link: blockedUrl ? 'https://not-official.example/apply' : `https://${domain}/apply-${index}`,
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
      title: `${org} Recruitment ${index}`,
      organization: org,
      notification_url: `https://${domain}`,
      pdf_url: `https://${domain}/notice-${index}.pdf`,
      raw_text: `${org} recruitment. Graduate degree. Apply online at https://${domain}/apply-${index}. Last date 31/07/2026. Total 120 vacancies.`,
    },
    source: { id: `source-load-${index}`, name: org, url: `https://${domain}`, tier: 1, category: 'government' },
    duplicateLogs: duplicateRisk >= 80 ? [{ is_duplicate: true, similarity: duplicateRisk }] : [],
  };
};

const runLoadTest = () => {
  const engine = new ReviewEngine();
  return [100, 500, 1000, 5000].map((size) => {
    const started = performance.now();
    const items = [];
    const bands = {};
    for (let index = 0; index < size; index += 1) {
      const context = makeReviewContext(index);
      const review = engine.review(context);
      bands[review.decisionBand] = (bands[review.decisionBand] || 0) + 1;
      items.push(buildModerationItem({ draft: context.draft, review }));
    }
    const sorted = sortModerationQueue(items);
    const elapsedMs = Math.round(performance.now() - started);
    return {
      size,
      elapsedMs,
      reviewsPerSecond: Math.round((size / Math.max(1, elapsedMs / 1000)) * 10) / 10,
      estimatedDbWrites: size * 3,
      decisionBands: bands,
      topPriority: sorted[0]?.priority || 0,
    };
  });
};

const runObservabilityTest = () => {
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
  const required = [
    'provider_success_rate_low',
    'provider_latency_high',
    'queue_pending_high',
    'queue_oldest_pending_stale',
    'validation_failure_rate_high',
    'blocked_draft_rate_high',
    'duplicate_risk_spike',
    'publish_override_detected',
  ];
  const types = alerts.map((item) => item.type);
  return {
    alertCount: alerts.length,
    types,
    missing: required.filter((type) => !types.includes(type)),
    passed: required.every((type) => types.includes(type)),
  };
};

const migrationText = fs.readFileSync(new URL('../supabase_phase4_5_reliability_hardening.sql', import.meta.url), 'utf8');

const result = {
  generatedAt: new Date().toISOString(),
  providerFailure: await runProviderFailureTest(),
  queueRecovery: await runQueueRecoveryTest(),
  cronResilience: await runCronResilienceTest(),
  loadTests: runLoadTest(),
  observability: runObservabilityTest(),
  migrationGuards: {
    queueDraftUnique: migrationText.includes('uq_ai_job_drafts_queue_item_id_nonnull'),
    jobAiDraftUnique: migrationText.includes('uq_jobs_ai_draft_id_nonnull'),
    activeReviewUnique: migrationText.includes('uq_ai_review_results_active_draft'),
    staleProcessingIndex: migrationText.includes('idx_ai_research_queue_processing_updated'),
  },
};

console.log('PHASE4_5_RELIABILITY_RESULT', JSON.stringify(result, null, 2));
