import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategoryCoverage,
  buildDraftQualityReport,
  buildFreshnessIntelligence,
  buildOperationsReports,
  buildPublishingSla,
  buildQueueHealthReport,
  buildSourceIntelligence,
  percentile,
} from './phase5bContentOps.js';

const now = new Date('2026-06-05T00:00:00Z');

test('buildSourceIntelligence scores source reliability and duplicate rate', () => {
  const result = buildSourceIntelligence({
    sources: [{ id: 'source-1', name: 'SSC', tier: 1, category: 'government', is_active: true }],
    fetchLogs: [
      { source_id: 'source-1', status: 'success', items_found: 10, started_at: '2026-06-05T01:00:00Z' },
      { source_id: 'source-1', status: 'partial', items_found: 4, started_at: '2026-06-04T01:00:00Z' },
    ],
    fetchFailures: [],
    fetchDuplicates: [{ source_id: 'source-1' }],
    queue: [{ id: 'queue-1', source_id: 'source-1' }, { id: 'queue-2', source_id: 'source-1' }],
    drafts: [
      { id: 'draft-1', queue_item_id: 'queue-1', status: 'approved' },
      { id: 'draft-2', queue_item_id: 'queue-2', status: 'rejected' },
    ],
  });

  assert.equal(result.summary.sources, 1);
  assert.equal(result.rows[0].successRate, 75);
  assert.equal(result.rows[0].averageItemsDiscovered, 7);
  assert.equal(result.rows[0].acceptedDrafts, 1);
  assert.equal(result.rows[0].rejectedDrafts, 1);
  assert.ok(result.rows[0].duplicateRate > 0);
});

test('buildFreshnessIntelligence tracks active, expired, and expiring jobs', () => {
  const result = buildFreshnessIntelligence([
    { id: 'job-1', status: 'published', last_date: '2026-06-04', title: 'Expired' },
    { id: 'job-2', status: 'published', last_date: '2026-06-06', title: 'Soon' },
    { id: 'job-3', status: 'published', last_date: '2026-07-01', title: 'Later' },
    { id: 'job-4', status: 'published', last_date: null, title: 'Missing' },
  ], { now });

  assert.equal(result.summary.expiredJobs, 1);
  assert.equal(result.summary.activeJobs, 3);
  assert.equal(result.summary.expiring1Day, 1);
  assert.equal(result.summary.expiring30Days, 2);
  assert.equal(result.summary.missingDeadlines, 1);
  assert.equal(result.staleIndicators[0].staleIndicator, 'expired');
});

test('buildCategoryCoverage highlights category gaps and growth', () => {
  const result = buildCategoryCoverage({
    categories: [{ name: 'SSC' }, { name: 'UPSC' }, { name: 'Railway' }],
    jobs: [
      { id: 'job-1', category: 'SSC', status: 'published', created_at: '2026-06-01' },
      { id: 'job-2', category: 'SSC', status: 'draft', created_at: '2026-05-01' },
    ],
    drafts: [
      { id: 'draft-1', generated_data: { category: 'UPSC' }, created_at: '2026-06-02' },
    ],
    now,
  });

  const railway = result.rows.find((row) => row.category === 'Railway');
  const upsc = result.rows.find((row) => row.category === 'UPSC');
  assert.equal(result.summary.categories, 3);
  assert.equal(railway.isInactive, true);
  assert.equal(upsc.isUnderrepresented, true);
  assert.ok(result.gaps.length >= 2);
});

test('buildPublishingSla computes p50, p90, and p95 cycle metrics', () => {
  const result = buildPublishingSla({
    drafts: [
      { id: 'draft-1', created_at: '2026-06-01T00:00:00Z' },
      { id: 'draft-2', created_at: '2026-06-01T00:00:00Z' },
    ],
    moderationActions: [
      { draft_id: 'draft-1', action: 'run_review', created_at: '2026-06-01T02:00:00Z' },
      { draft_id: 'draft-1', action: 'approve', created_at: '2026-06-01T05:00:00Z' },
      { draft_id: 'draft-1', action: 'publish', created_at: '2026-06-01T09:00:00Z' },
      { draft_id: 'draft-2', action: 'run_review', created_at: '2026-06-01T04:00:00Z' },
      { draft_id: 'draft-2', action: 'approve', created_at: '2026-06-01T10:00:00Z' },
      { draft_id: 'draft-2', action: 'publish', created_at: '2026-06-02T00:00:00Z' },
    ],
  });

  assert.equal(result.draftToReview.p50, 2);
  assert.equal(result.reviewToApproval.p95, 6);
  assert.equal(result.approvalToPublish.sampleSize, 2);
  assert.equal(result.totalPublishCycle.p90, 24);
});

test('operations reports summarize source, category, draft, SLA, and queue health', () => {
  assert.equal(percentile([1, 2, 3, 4], 95), 4);
  const draftQuality = buildDraftQualityReport({
    drafts: [{ status: 'rejected' }, { status: 'approved' }],
    reviews: [{ publish_readiness: 80, confidence: 70, decision_band: 'blocked' }],
  });
  const queueHealth = buildQueueHealthReport([
    { status: 'pending', extracted_data: { phase2_retries: 1 } },
    { status: 'drafted', extracted_data: {} },
  ]);
  const reports = buildOperationsReports({
    sourceIntelligence: { summary: { averageReliability: 80, failingSources: 0 } },
    categoryCoverage: { summary: { categories: 3, inactive: 1 } },
    draftQuality,
    publishingSla: { totalPublishCycle: { p95: 12 } },
    queueHealth,
  });

  assert.equal(draftQuality.blockedDrafts, 1);
  assert.equal(queueHealth.retryCount, 1);
  assert.equal(reports.categoryCoverage.status, 'attention');
  assert.equal(reports.queueHealth.primary, '1 pending');
});
