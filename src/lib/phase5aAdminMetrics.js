export const safeNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const ageHours = (value) => {
  if (!value) return 0;
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round((ms / 36_000_00) * 10) / 10;
};

export const ageLabel = (value) => {
  const hours = typeof value === 'number' ? value : ageHours(value);
  if (hours >= 48) return `${Math.round(hours / 24)}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;
  return `${Math.max(0, Math.round(hours * 60))}m`;
};

export const countBy = (rows = [], mapper) => (
  asArray(rows).reduce((counts, row) => {
    const key = mapper(row) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {})
);

export const average = (values = []) => {
  const numbers = asArray(values).map((value) => safeNumber(value, NaN)).filter(Number.isFinite);
  if (!numbers.length) return 0;
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
};

export const draftData = (item = {}) => item.draft?.generated_data || item.generated_data || {};

export const itemSourceName = (item = {}) => (
  item.source?.name ||
  item.draft?.ai_research_queue?.title ||
  item.draft?.ai_research_queue?.organization ||
  item.draft?.generated_data?.organization ||
  item.draft?.generated_data?.source_name ||
  'Unknown source'
);

export const itemCategory = (item = {}) => (
  draftData(item).category ||
  draftData(item).job_type ||
  item.draft?.job_type ||
  'Uncategorized'
);

export const computePublishingSla = (items = [], moderation = {}) => {
  const queueItems = asArray(items);
  const pendingReviews = queueItems.filter((item) => item.decisionBand !== 'blocked');
  const blocked = queueItems.filter((item) => item.decisionBand === 'blocked');
  const draftAges = queueItems.map((item) => ageHours(item.draft?.created_at));
  const reviewAges = queueItems.map((item) => ageHours(item.review?.created_at || item.draft?.updated_at));
  const recentPublish = asArray(moderation.recent).find((action) => action.action === 'publish');

  return {
    averageDraftAgeHours: average(draftAges),
    averageReviewAgeHours: average(reviewAges),
    publishAgeHours: recentPublish ? ageHours(recentPublish.created_at) : 0,
    oldestPendingReviewHours: pendingReviews.length
      ? Math.max(...pendingReviews.map((item) => ageHours(item.draft?.created_at)))
      : 0,
    oldestBlockedDraftHours: blocked.length
      ? Math.max(...blocked.map((item) => ageHours(item.draft?.created_at)))
      : 0,
  };
};

export const buildReportRows = (items = [], overview = {}) => {
  const reviewItems = asArray(items);
  const bySource = countBy(reviewItems, itemSourceName);
  const byCategory = countBy(reviewItems, itemCategory);
  const providers = asArray(overview.providers?.providers);
  const queueCounts = overview.queue?.counts || {};
  const moderationTotals = overview.moderation?.totals || {};

  return {
    sources: Object.entries(bySource)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    categories: Object.entries(byCategory)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    providers: providers.map((provider) => ({
      name: provider.providerName,
      status: provider.status,
      successRate: provider.successRate,
      failures: provider.failures,
      latency: provider.p95LatencyMs || provider.averageLatencyMs,
    })).slice(0, 8),
    queue: [
      { name: 'Pending', count: queueCounts.pending || 0 },
      { name: 'Processing', count: queueCounts.processing || 0 },
      { name: 'Drafted', count: queueCounts.drafted || 0 },
      { name: 'Rejected', count: queueCounts.rejected || 0 },
    ],
    moderation: [
      { name: 'Reviews', count: moderationTotals.reviews || 0 },
      { name: 'Approvals', count: moderationTotals.approvals || 0 },
      { name: 'Rejections', count: moderationTotals.rejections || 0 },
      { name: 'Conversions', count: moderationTotals.conversions || 0 },
      { name: 'Publishes', count: moderationTotals.publishes || 0 },
    ],
  };
};

export const computeOperationsDashboard = ({ overview = {}, reviewQueue = {} } = {}) => {
  const items = asArray(reviewQueue.items);
  const quality = overview.quality || {};
  const queue = overview.queue || {};
  const providers = asArray(overview.providers?.providers);
  const alerts = asArray(overview.alerts);
  const bands = quality.distributions?.decisionBands || {};
  const approval = quality.distributions?.approval || {};

  return {
    queue: queue.counts || {},
    drafts: {
      approved: approval.approved || 0,
      blocked: bands.blocked || 0,
      reviewRecommended: bands.review_recommended || 0,
      manualReviewRequired: bands.manual_review_required || 0,
    },
    review: {
      averageReadiness: quality.averages?.readiness || average(items.map((item) => item.readiness)),
      averageConfidence: quality.averages?.confidence || average(items.map((item) => item.confidence)),
      queueItems: items.length,
    },
    providers: {
      active: overview.providers?.totals?.activeProviders || providers.filter((provider) => provider.isActive).length,
      unhealthy: providers.filter((provider) => ['down', 'degraded'].includes(String(provider.status || '').toLowerCase())).length,
      successRate: average(providers.map((provider) => provider.successRate)),
    },
    alerts: {
      active: alerts.length,
      critical: alerts.filter((alert) => alert.severity === 'critical').length,
      high: alerts.filter((alert) => alert.severity === 'high').length,
    },
    oldestPendingItemHours: queue.oldestPendingAgeHours || 0,
    sla: computePublishingSla(items, overview.moderation || {}),
    reports: buildReportRows(items, overview),
  };
};

export const decisionBandMeta = (band = '') => ({
  recommended_publish: { label: 'Recommended', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  review_recommended: { label: 'Review', tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  manual_review_required: { label: 'Manual', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  blocked: { label: 'Blocked', tone: 'text-red-700 bg-red-50 border-red-200' },
}[band] || { label: band || 'Unknown', tone: 'text-slate-700 bg-slate-50 border-slate-200' });
