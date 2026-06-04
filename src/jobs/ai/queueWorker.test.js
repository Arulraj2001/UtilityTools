import test from 'node:test';
import assert from 'node:assert/strict';
import QueueWorker from './queueWorker.js';

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.patch = null;
    this.rowsToInsert = null;
    this.max = null;
  }

  select() { return this; }
  order() { return this; }

  limit(value) {
    this.max = value;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  _rows() {
    let rows = this.db[this.table] || [];
    this.filters.forEach(({ column, value }) => {
      rows = rows.filter((row) => row[column] === value);
    });
    if (Number.isInteger(this.max)) rows = rows.slice(0, this.max);
    return rows;
  }

  _execute() {
    if (this.rowsToInsert) {
      const inserted = this.rowsToInsert.map((row, index) => ({
        id: row.id || `${this.table}-${this.db[this.table].length + index + 1}`,
        ...row,
      }));
      this.db[this.table].push(...inserted);
      return Promise.resolve({ data: inserted, error: null, count: inserted.length });
    }

    if (this.patch) {
      const rows = this._rows();
      rows.forEach((row) => Object.assign(row, this.patch));
      return Promise.resolve({ data: rows, error: null, count: rows.length });
    }

    const rows = this._rows();
    return Promise.resolve({ data: rows, error: null, count: rows.length });
  }

  insert(rows) {
    this.rowsToInsert = rows;
    return this;
  }

  update(patch) {
    this.patch = patch;
    return this;
  }

  maybeSingle() {
    return this._execute().then((result) => ({
      ...result,
      data: Array.isArray(result.data) ? (result.data[0] || null) : result.data,
    }));
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

const createSupabaseMock = () => {
  const db = {
    ai_research_queue: [{
      id: 'queue-1',
      title: 'SSC CGL 2026',
      organization: 'Staff Selection Commission',
      source_url: 'https://ssc.gov.in/ssc-calender',
      raw_input: 'SSC CGL 2026. Total 120 vacancies. Last date 2026-05-31.',
      job_type: 'government',
      extracted_data: { raw_notification_id: 'raw-1' },
      duplicate_check: {},
      status: 'pending',
      priority: 5,
    }],
    raw_job_notifications: [{
      id: 'raw-1',
      queue_item_id: 'queue-1',
      notification_url: 'https://ssc.gov.in/ssc-calender',
      pdf_url: '',
      raw_text: 'SSC CGL 2026. Total 120 vacancies. Last date 2026-05-31.',
      metadata: {},
      status: 'queued',
    }],
    ai_job_drafts: [],
    ai_duplicate_log: [],
    ai_provider_failures: [],
  };

  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

const extraction = {
  title: 'SSC CGL 2026 Recruitment',
  organization: 'Staff Selection Commission',
  vacancies: '120',
  qualification: 'Graduate degree',
  age_limit: '18 to 30 years',
  salary: 'Not specified',
  application_mode: 'Online',
  selection_process: ['Computer based test'],
  important_dates: [{ event: 'Last date', date: '2026-05-31' }],
  notification_pdf: '',
  official_website: 'https://ssc.gov.in',
  application_link: '',
  job_location: 'India',
  category: 'government',
  tags: ['ssc', 'cgl'],
};

test('QueueWorker saves a complete draft and marks queue drafted', async () => {
  const supabase = createSupabaseMock();
  const worker = new QueueWorker(supabase, {
    extractor: {
      async extract() {
        return {
          extraction,
          provider: 'openrouter',
          model: 'openrouter/free',
          tokensUsed: 100,
          durationMs: 200,
          attempts: [
            { providerName: 'cerebras', ok: false, errorType: 'rate_limit' },
            { providerName: 'openrouter', ok: true },
          ],
        };
      },
    },
    duplicateAnalyzer: {
      async analyze() {
        return { duplicateRisk: 0, evidence: [] };
      },
      async recordLogs() {
        return [];
      },
    },
  });

  const result = await worker.processItem(supabase.db.ai_research_queue[0]);

  assert.equal(result.status, 'drafted');
  assert.equal(supabase.db.ai_job_drafts.length, 1);
  assert.equal(supabase.db.ai_job_drafts[0].ai_provider, 'openrouter');
  assert.equal(supabase.db.ai_job_drafts[0].generated_data.phase2.provider_attempts.length, 2);
  assert.equal(supabase.db.ai_research_queue[0].status, 'drafted');
  assert.equal(supabase.db.raw_job_notifications[0].status, 'processed');
});

test('QueueWorker does not save partial drafts when extraction fails', async () => {
  const supabase = createSupabaseMock();
  const worker = new QueueWorker(supabase, {
    maxRetries: 0,
    extractor: {
      async extract() {
        throw new Error('AI extraction validation failed');
      },
    },
    duplicateAnalyzer: {
      async analyze() {
        throw new Error('should not run');
      },
      async recordLogs() {
        return [];
      },
    },
  });

  const result = await worker.processItem(supabase.db.ai_research_queue[0]);

  assert.equal(result.status, 'rejected');
  assert.equal(supabase.db.ai_job_drafts.length, 0);
  assert.equal(supabase.db.ai_research_queue[0].status, 'rejected');
});
