import test from 'node:test';
import assert from 'node:assert/strict';
import AdminReviewService, { draftSnapshotHash } from './adminReviewService.js';

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
    if (!this.db[this.table]) this.db[this.table] = [];

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
    ai_job_drafts: [{
      id: 'draft-1',
      status: 'approved',
      queue_item_id: 'queue-1',
      generated_data: { title: 'Recovered SSC CGL Draft' },
      quality_scores: {},
    }],
    jobs: [{
      id: 'job-1',
      title: 'Recovered SSC CGL Draft',
      status: 'draft',
      ai_draft_id: 'draft-1',
      created_at: '2026-06-05T01:00:00Z',
    }],
    ai_moderation_actions: [],
  };

  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

test('draftSnapshotHash changes when generated data changes', () => {
  const draft = {
    id: 'draft-1',
    queue_item_id: 'queue-1',
    generated_data: { title: 'Original title' },
    quality_scores: { overall: 90 },
  };
  const changed = {
    ...draft,
    generated_data: { title: 'Changed title' },
  };

  assert.notEqual(draftSnapshotHash(draft), draftSnapshotHash(changed));
  assert.equal(draftSnapshotHash(draft), draftSnapshotHash({
    quality_scores: { overall: 90 },
    generated_data: { title: 'Original title' },
    queue_item_id: 'queue-1',
  }));
});

test('convertToJobDraft rejects already converted drafts', async () => {
  class GuardOnlyService extends AdminReviewService {
    async loadContext() {
      return {
        draft: {
          id: 'draft-1',
          status: 'published',
          published_job_id: 'job-1',
          generated_data: {},
        },
        queueItem: null,
        rawNotification: null,
        source: null,
        duplicateLogs: [],
      };
    }
  }

  const service = new GuardOnlyService({ from() { throw new Error('should not query'); } });

  await assert.rejects(
    () => service.convertToJobDraft('draft-1'),
    /already been converted/,
  );
});

test('convertToJobDraft recovers an existing job row for the AI draft', async () => {
  const supabase = createSupabaseMock();
  const service = new AdminReviewService(supabase);

  const result = await service.convertToJobDraft('draft-1', { adminId: 'admin-1' });

  assert.equal(result.recovered, true);
  assert.equal(result.job.id, 'job-1');
  assert.equal(supabase.db.jobs.length, 1);
  assert.equal(supabase.db.ai_job_drafts[0].status, 'published');
  assert.equal(supabase.db.ai_job_drafts[0].published_job_id, 'job-1');
  assert.equal(supabase.db.ai_moderation_actions.length, 1);
  assert.equal(supabase.db.ai_moderation_actions[0].action, 'convert_to_draft');
  assert.equal(supabase.db.ai_moderation_actions[0].metadata.recovered, true);
});
