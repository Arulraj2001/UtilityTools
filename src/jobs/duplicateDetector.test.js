import test from 'node:test';
import assert from 'node:assert/strict';

import DuplicateDetector from './duplicateDetector.js';

const createDuplicateSupabase = (tables) => ({
  from(table) {
    const state = {
      table,
      filters: [],
      inserted: null,
    };

    const builder = {
      select() {
        return builder;
      },
      eq(column, value) {
        state.filters.push({ column, value });
        return builder;
      },
      limit() {
        return builder;
      },
      insert(rows) {
        state.inserted = rows;
        return builder;
      },
      async maybeSingle() {
        if (state.inserted) {
          const row = { id: `${table}-${(tables[table] || []).length + 1}`, ...state.inserted[0] };
          tables[table] = tables[table] || [];
          tables[table].push(row);
          return { data: row, error: null };
        }

        const row = (tables[table] || []).find((candidate) => (
          state.filters.every((filter) => candidate[filter.column] === filter.value)
        ));
        return { data: row || null, error: null };
      },
    };

    return builder;
  },
});

test('DuplicateDetector allows new notifications', async () => {
  const tables = {
    raw_job_notifications: [],
    ai_research_queue: [],
    jobs: [],
    job_fetch_duplicates: [],
  };
  const detector = new DuplicateDetector(createDuplicateSupabase(tables));

  const result = await detector.check({
    title: 'UPSC Recruitment 2026',
    organization: 'UPSC',
    notification_url: 'https://upsc.gov.in/recruitment/example',
    pdf_url: 'https://upsc.gov.in/file.pdf',
    raw_content: 'Applications invited for posts.',
  });

  assert.equal(result.isDuplicate, false);
  assert.equal(result.hash.length, 64);
});

test('DuplicateDetector blocks existing notification URLs and records events', async () => {
  const tables = {
    raw_job_notifications: [{
      id: 'raw-1',
      notification_url: 'https://upsc.gov.in/recruitment/example',
      pdf_url: null,
      hash: 'old-hash',
    }],
    ai_research_queue: [],
    jobs: [],
    job_fetch_duplicates: [],
  };
  const detector = new DuplicateDetector(createDuplicateSupabase(tables));

  const notification = {
    title: 'UPSC Recruitment 2026',
    organization: 'UPSC',
    notification_url: 'https://upsc.gov.in/recruitment/example',
    raw_content: 'Applications invited for posts.',
  };
  const result = await detector.check(notification);

  assert.equal(result.isDuplicate, true);
  assert.equal(result.matches[0].matched_table, 'raw_job_notifications');

  await detector.recordDuplicate({ sourceId: 'source-1', notification, duplicate: result });
  assert.equal(tables.job_fetch_duplicates.length, 1);
  assert.equal(tables.job_fetch_duplicates[0].matched_id, 'raw-1');
});
