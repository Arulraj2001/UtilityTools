import test from 'node:test';
import assert from 'node:assert/strict';

import JobFetchService from './jobFetchService.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createMemorySupabase = (initialTables) => {
  const db = initialTables;

  class Builder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.limitValue = null;
      this.orderSpecs = [];
      this.operation = 'select';
      this.payload = null;
      this.patch = null;
      this.upsertOptions = {};
    }

    select() {
      return this;
    }

    eq(column, value) {
      this.filters.push((row) => row[column] === value);
      return this;
    }

    in(column, values) {
      const set = new Set(values);
      this.filters.push((row) => set.has(row[column]));
      return this;
    }

    gte(column, value) {
      this.filters.push((row) => String(row[column]) >= String(value));
      return this;
    }

    order(column, options = {}) {
      this.orderSpecs.push({ column, ascending: options.ascending !== false });
      return this;
    }

    limit(value) {
      this.limitValue = value;
      return this;
    }

    insert(rows) {
      this.operation = 'insert';
      this.payload = rows;
      return this;
    }

    update(patch) {
      this.operation = 'update';
      this.patch = patch;
      return this;
    }

    upsert(rows, options = {}) {
      this.operation = 'upsert';
      this.payload = rows;
      this.upsertOptions = options;
      return this;
    }

    maybeSingle() {
      return this.execute(true);
    }

    then(resolve, reject) {
      return this.execute(false).then(resolve, reject);
    }

    matchingRows() {
      const rows = db[this.table] || [];
      return rows.filter((row) => this.filters.every((filter) => filter(row)));
    }

    async execute(single) {
      db[this.table] = db[this.table] || [];

      if (this.operation === 'insert') {
        const inserted = this.payload.map((row) => ({
          id: row.id || `${this.table}-${db[this.table].length + 1}`,
          ...clone(row),
        }));
        db[this.table].push(...inserted);
        return { data: single ? inserted[0] : inserted, error: null };
      }

      if (this.operation === 'update') {
        const updated = [];
        db[this.table] = db[this.table].map((row) => {
          if (!this.filters.every((filter) => filter(row))) return row;
          const next = { ...row, ...clone(this.patch) };
          updated.push(next);
          return next;
        });
        return { data: single ? updated[0] || null : updated, error: null };
      }

      if (this.operation === 'upsert') {
        const key = this.upsertOptions.onConflict || 'id';
        const upserted = [];
        for (const row of this.payload) {
          const index = db[this.table].findIndex((existing) => existing[key] === row[key]);
          if (index >= 0) {
            db[this.table][index] = { ...db[this.table][index], ...clone(row) };
            upserted.push(db[this.table][index]);
          } else {
            const next = { id: row.id || `${this.table}-${db[this.table].length + 1}`, ...clone(row) };
            db[this.table].push(next);
            upserted.push(next);
          }
        }
        return { data: single ? upserted[0] || null : upserted, error: null };
      }

      let rows = this.matchingRows().map(clone);
      for (const spec of this.orderSpecs.reverse()) {
        rows = rows.sort((a, b) => {
          if (a[spec.column] === b[spec.column]) return 0;
          const result = a[spec.column] > b[spec.column] ? 1 : -1;
          return spec.ascending ? result : -result;
        });
      }
      if (this.limitValue !== null) rows = rows.slice(0, this.limitValue);
      return { data: single ? rows[0] || null : rows, error: null };
    }
  }

  return {
    db,
    from(table) {
      return new Builder(table);
    },
  };
};

const baseTables = () => ({
  ai_job_sources: [{
    id: 'source-1',
    name: 'UPSC Official',
    url: 'https://upsc.gov.in',
    tier: 1,
    category: 'government',
    is_active: true,
    check_count: 0,
    items_found: 0,
  }],
  raw_job_notifications: [],
  ai_research_queue: [],
  jobs: [],
  job_fetch_logs: [],
  fetch_failures: [],
  job_fetch_duplicates: [],
  job_fetch_source_metrics: [],
});

const fakeFetcherFactory = (notifications) => () => ({
  errors: [],
  fetch: async () => notifications,
});

test('JobFetchService saves raw notifications and enqueues AI research items', async () => {
  const supabase = createMemorySupabase(baseTables());
  const service = new JobFetchService({
    supabase,
    fetcherFactory: fakeFetcherFactory([{
      title: 'UPSC Recruitment 2026',
      organization: 'Union Public Service Commission',
      source: 'UPSC Official',
      notification_url: 'https://upsc.gov.in/recruitment/example',
      pdf_url: 'https://upsc.gov.in/file.pdf',
      published_date: '2026-06-01',
      last_date: '2026-07-01',
      raw_content: 'Applications invited for UPSC posts.',
      raw_html: '<main>Applications invited</main>',
    }]),
  });

  const result = await service.runAll();

  assert.equal(result.totals.items_found, 1);
  assert.equal(result.totals.items_saved, 1);
  assert.equal(supabase.db.raw_job_notifications.length, 1);
  assert.equal(supabase.db.raw_job_notifications[0].status, 'queued');
  assert.equal(supabase.db.ai_research_queue.length, 1);
  assert.equal(supabase.db.ai_research_queue[0].status, 'pending');
  assert.equal(supabase.db.ai_job_sources[0].check_count, 1);
  assert.equal(supabase.db.job_fetch_logs[0].status, 'success');
});

test('JobFetchService blocks duplicates before inserting raw notifications', async () => {
  const tables = baseTables();
  tables.raw_job_notifications.push({
    id: 'raw-existing',
    notification_url: 'https://upsc.gov.in/recruitment/example',
    pdf_url: null,
    hash: 'existing-hash',
  });
  const supabase = createMemorySupabase(tables);
  const service = new JobFetchService({
    supabase,
    fetcherFactory: fakeFetcherFactory([{
      title: 'UPSC Recruitment 2026',
      organization: 'Union Public Service Commission',
      notification_url: 'https://upsc.gov.in/recruitment/example',
      pdf_url: '',
      raw_content: 'Applications invited for UPSC posts.',
      raw_html: '',
    }]),
  });

  const result = await service.runAll();

  assert.equal(result.totals.items_saved, 0);
  assert.equal(result.totals.duplicates, 1);
  assert.equal(supabase.db.raw_job_notifications.length, 1);
  assert.equal(supabase.db.ai_research_queue.length, 0);
  assert.equal(supabase.db.job_fetch_duplicates.length, 1);
});
