import test from 'node:test';
import assert from 'node:assert/strict';
import ProviderSelector, { sortPhase2Providers } from './providerSelector.js';
import { CALLERS } from '../../../server/ai/providerCore.js';

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

const provider = (name, priority) => ({
  id: `${name}-id`,
  provider_name: name,
  api_key: `${name}-key`,
  model: '',
  priority,
  is_active: true,
  health_status: 'unknown',
  stats: { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0, last_error: null },
  available_models: [],
});

const createSupabaseMock = () => {
  const db = {
    ai_provider_settings: [
      provider('groq', 3),
      provider('gemini', 4),
      provider('openrouter', 2),
      provider('cerebras', 1),
      provider('deepseek', 5),
    ],
    ai_provider_failures: [],
    ai_generation_usage: [],
  };

  return {
    db,
    from(table) {
      if (!db[table]) db[table] = [];
      return new Query(db, table);
    },
  };
};

const originalCallers = { ...CALLERS };

const restoreCallers = () => {
  Object.entries(originalCallers).forEach(([name, caller]) => {
    CALLERS[name] = caller;
  });
};

test('sortPhase2Providers enforces requested Phase 2 fallback order', () => {
  const sorted = sortPhase2Providers([
    provider('groq', 10),
    provider('deepseek', 10),
    provider('openrouter', 10),
    provider('openai', 10),
    provider('gemini', 10),
    provider('cerebras', 10),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.provider_name),
    ['cerebras', 'openrouter', 'openai', 'groq', 'gemini', 'deepseek'],
  );
});

test('ProviderSelector logs failed attempts and falls through Cerebras, OpenRouter, and Groq', async () => {
  const supabase = createSupabaseMock();

  try {
    ['cerebras', 'openrouter', 'groq'].forEach((name) => {
      CALLERS[name] = async () => {
        const error = new Error(`${name} unavailable`);
        error.status = 503;
        throw error;
      };
    });
    CALLERS.gemini = async () => ({ text: '{"ok":true}', tokensUsed: 11 });

    const selector = new ProviderSelector(supabase, { timeoutMs: 1000 });
    const result = await selector.generate('prompt', {
      adminId: 'admin-1',
      phase: 'phase2_failover_test',
      queueItemId: 'queue-1',
    });

    assert.equal(result.provider, 'gemini');
    assert.deepEqual(
      result.attempts.map((attempt) => attempt.providerName),
      ['cerebras', 'openrouter', 'groq', 'gemini'],
    );
    assert.deepEqual(
      result.attempts.map((attempt) => attempt.ok),
      [false, false, false, true],
    );
    assert.equal(result.attempts[0].provider, undefined);
    assert.equal(result.attempts[0].providerId, 'cerebras-id');
    assert.equal(supabase.db.ai_provider_failures.length, 3);
    assert.deepEqual(
      supabase.db.ai_provider_failures.map((failure) => failure.provider_name),
      ['cerebras', 'openrouter', 'groq'],
    );
    assert.equal(supabase.db.ai_provider_failures[0].details.queue_item_id, 'queue-1');
    assert.equal(supabase.db.ai_generation_usage.length, 1);
  } finally {
    restoreCallers();
  }
});
