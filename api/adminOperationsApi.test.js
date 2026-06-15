import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminApiRequest,
  approveReviewItem,
  getMonitoringOverview,
  getReviewQueue,
  getScaleOperations,
} from './adminOperationsApi.js';

test('adminApiRequest attaches bearer token and parses JSON responses', async () => {
  const calls = [];
  const result = await adminApiRequest('/api/admin/example', {
    tokenProvider: async () => 'test-token',
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ ok: true });
        },
      };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].path, '/api/admin/example');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('adminApiRequest throws server error payloads', async () => {
  await assert.rejects(
    () => adminApiRequest('/api/admin/example', {
      tokenProvider: async () => 'test-token',
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        async text() {
          return JSON.stringify({ error: 'Admin role required.' });
        },
      }),
    }),
    /Admin role required/,
  );
});

test('Phase 5A API helpers target existing admin endpoints', async () => {
  const paths = [];
  const options = {
    tokenProvider: async () => 'test-token',
    fetchImpl: async (path, request) => {
      paths.push({ path, method: request.method, body: request.body });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ ok: true });
        },
      };
    },
  };

  await getMonitoringOverview({ days: 14 }, options);
  await getScaleOperations({ days: 30, monthlyBudgetUsd: 50, strategy: 'quality-first' }, options);
  await getReviewQueue({ limit: 25, decisionBand: 'blocked' }, options);
  await approveReviewItem('draft-1', { reasonCode: 'checked' }, options);

  assert.equal(paths[0].path, '/api/admin/monitoring/overview?days=14');
  assert.equal(paths[1].path, '/api/admin/monitoring/scale-ops?days=30&monthlyBudgetUsd=50&strategy=quality-first');
  assert.equal(paths[2].path, '/api/admin/review-queue?limit=25&decisionBand=blocked');
  assert.equal(paths[3].path, '/api/admin/approve/draft-1');
  assert.equal(paths[3].method, 'POST');
  assert.equal(paths[3].body, JSON.stringify({ reasonCode: 'checked' }));
});
