import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModerationItem,
  recordModerationAction,
  sortModerationQueue,
} from './moderationQueue.js';

test('ModerationQueue sorts high-readiness items before blocked items', () => {
  const recommended = buildModerationItem({
    draft: { id: 'draft-1', quality_scores: { duplicateRisk: 0, freshness: 90 } },
    review: {
      decisionBand: 'recommended_publish',
      publishReadiness: 94,
      confidence: 92,
      duplicateRisk: 0,
      warnings: [],
      subscores: { freshness: 90 },
    },
  });
  const blocked = buildModerationItem({
    draft: { id: 'draft-2', quality_scores: { duplicateRisk: 90, freshness: 90 } },
    review: {
      decisionBand: 'blocked',
      publishReadiness: 90,
      confidence: 90,
      duplicateRisk: 90,
      warnings: [{ severity: 'critical', code: 'duplicate_url' }],
      subscores: { freshness: 90 },
    },
    verification: { blockingIssues: [{ code: 'duplicate_url' }] },
  });

  const sorted = sortModerationQueue([blocked, recommended]);

  assert.equal(sorted[0].draftId, 'draft-1');
  assert.ok(recommended.priority > blocked.priority);
});

test('recordModerationAction inserts an audit row', async () => {
  const calls = [];
  const supabase = {
    from(table) {
      return {
        insert(rows) {
          calls.push({ table, rows });
          return {
            async select() {
              return { data: [{ id: 'audit-1', ...rows[0] }], error: null };
            },
          };
        },
      };
    },
  };

  const row = await recordModerationAction(supabase, {
    draftId: 'draft-1',
    adminId: 'admin-1',
    action: 'approve',
    beforeState: { status: 'pending_review' },
    afterState: { status: 'approved' },
  });

  assert.equal(calls[0].table, 'ai_moderation_actions');
  assert.equal(row.action, 'approve');
  assert.equal(row.draft_id, 'draft-1');
});
