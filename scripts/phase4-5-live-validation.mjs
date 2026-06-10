import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import DashboardAggregator from '../src/monitoring/dashboardAggregator.js';
import OperationalMetricsService from '../src/monitoring/operationalMetricsService.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('PHASE4_5_LIVE_VALIDATION_ERROR missing Supabase URL or service role key');
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
});

const anon = anonKey ? createClient(url, anonKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
}) : null;

const countTable = async (table) => {
  const result = await service.from(table).select('id', { count: 'exact', head: true });
  return { table, count: result.count ?? 0, error: result.error?.message || null };
};

const fetchRows = async (table, select, limit = 10000) => {
  const result = await service.from(table).select(select).limit(limit);
  return { rows: result.data || [], error: result.error?.message || null };
};

const duplicateIds = (rows, key) => {
  const counts = new Map();
  rows.forEach((row) => {
    const value = row[key];
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
};

const anonProbe = async (table) => {
  if (!anon) return { table, configured: false, visibleRows: null, error: 'anon key not configured' };
  const result = await anon.from(table).select('id').limit(1);
  return {
    table,
    configured: true,
    visibleRows: result.data?.length ?? 0,
    error: result.error?.message || null,
  };
};

const dashboard = new DashboardAggregator(service);
const metricsService = new OperationalMetricsService(service);
const overview = await dashboard.getOverview({ days: 30, persistAlerts: true });

const [
  rawCount,
  queueCount,
  draftCount,
  reviewCount,
  verificationCount,
  actionCount,
  alertCount,
  snapshotCountBefore,
] = await Promise.all([
  countTable('raw_job_notifications'),
  countTable('ai_research_queue'),
  countTable('ai_job_drafts'),
  countTable('ai_review_results'),
  countTable('ai_fact_verifications'),
  countTable('ai_moderation_actions'),
  countTable('monitoring_alerts'),
  countTable('monitoring_metrics_snapshots'),
]);

const [
  queueRows,
  draftRows,
  reviewRows,
  verificationRows,
  actionRows,
  jobRows,
] = await Promise.all([
  fetchRows('ai_research_queue', 'id,status,updated_at,created_at,extracted_data', 10000),
  fetchRows('ai_job_drafts', 'id,queue_item_id,status,published_job_id,latest_review_id,latest_verification_id,created_at', 10000),
  fetchRows('ai_review_results', 'id,draft_id,queue_item_id,is_stale,decision_band,created_at', 10000),
  fetchRows('ai_fact_verifications', 'id,draft_id,queue_item_id,verified_at', 10000),
  fetchRows('ai_moderation_actions', 'id,draft_id,job_id,action,created_at', 10000),
  fetchRows('jobs', 'id,ai_draft_id,source_raw_notification_id,status,created_at', 10000),
]);

const queueIds = new Set(queueRows.rows.map((row) => row.id));
const draftIds = new Set(draftRows.rows.map((row) => row.id));
const jobIds = new Set(jobRows.rows.map((row) => row.id));
const staleCutoff = Date.now() - 30 * 60_000;

const dataIntegrity = {
  duplicateDraftQueueItems: duplicateIds(draftRows.rows, 'queue_item_id'),
  duplicateJobsByAiDraft: duplicateIds(jobRows.rows, 'ai_draft_id'),
  duplicateActiveReviews: duplicateIds(reviewRows.rows.filter((row) => row.is_stale === false), 'draft_id'),
  orphanDraftQueueRefs: draftRows.rows
    .filter((row) => row.queue_item_id && !queueIds.has(row.queue_item_id))
    .map((row) => row.id),
  orphanReviewDraftRefs: reviewRows.rows
    .filter((row) => row.draft_id && !draftIds.has(row.draft_id))
    .map((row) => row.id),
  orphanVerificationDraftRefs: verificationRows.rows
    .filter((row) => row.draft_id && !draftIds.has(row.draft_id))
    .map((row) => row.id),
  orphanActionDraftRefs: actionRows.rows
    .filter((row) => row.draft_id && !draftIds.has(row.draft_id))
    .map((row) => row.id),
  orphanActionJobRefs: actionRows.rows
    .filter((row) => row.job_id && !jobIds.has(row.job_id))
    .map((row) => row.id),
  staleProcessingQueue: queueRows.rows
    .filter((row) => row.status === 'processing' && new Date(row.updated_at || row.created_at).getTime() < staleCutoff)
    .map((row) => row.id),
};

const snapshotPayload = {
  generatedAt: new Date().toISOString(),
  overview,
  counts: {
    raw: rawCount,
    queue: queueCount,
    drafts: draftCount,
    reviews: reviewCount,
    verifications: verificationCount,
    actions: actionCount,
    alerts: alertCount,
  },
  dataIntegrity,
};

const snapshot = await metricsService.persistSnapshot({
  snapshotType: 'phase4_5_live_validation',
  payload: snapshotPayload,
});
const snapshotCountAfter = await countTable('monitoring_metrics_snapshots');

const anonRlsProbe = await Promise.all([
  anonProbe('raw_job_notifications'),
  anonProbe('ai_research_queue'),
  anonProbe('ai_job_drafts'),
  anonProbe('ai_review_results'),
  anonProbe('ai_fact_verifications'),
  anonProbe('ai_moderation_actions'),
  anonProbe('monitoring_alerts'),
  anonProbe('monitoring_metrics_snapshots'),
]);

const errors = {
  queueRows: queueRows.error,
  draftRows: draftRows.error,
  reviewRows: reviewRows.error,
  verificationRows: verificationRows.error,
  actionRows: actionRows.error,
  jobRows: jobRows.error,
  snapshotBefore: snapshotCountBefore.error,
  snapshotAfter: snapshotCountAfter.error,
};

console.log('PHASE4_5_LIVE_VALIDATION_RESULT', JSON.stringify({
  generatedAt: snapshotPayload.generatedAt,
  queue: overview.queue.counts,
  quality: {
    averages: overview.quality.averages,
    decisionBands: overview.quality.distributions.decisionBands,
    validationFailures: overview.quality.validationFailures,
  },
  moderation: overview.moderation.totals,
  monitoring: {
    providers: overview.providers.totals,
    costs: overview.costs.totals,
    alertsComputed: overview.alerts.length,
    alertsPersisted: alertCount.count,
    snapshotId: snapshot.id,
    snapshotsBefore: snapshotCountBefore.count,
    snapshotsAfter: snapshotCountAfter.count,
  },
  dataIntegrity,
  anonRlsProbe,
  errors,
}, null, 2));
