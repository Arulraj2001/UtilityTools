export const safeNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const daysBetween = (start, end) => {
  const left = parseDate(start);
  const right = parseDate(end);
  if (!left || !right) return null;
  return (right.getTime() - left.getTime()) / 86_400_000;
};

export const hoursBetween = (start, end) => {
  const days = daysBetween(start, end);
  return days === null ? null : days * 24;
};

export const average = (values = []) => {
  const numbers = asArray(values).map((value) => safeNumber(value, NaN)).filter(Number.isFinite);
  if (!numbers.length) return 0;
  return Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10;
};

export const rate = (count, total) => {
  const denominator = safeNumber(total);
  if (!denominator) return 0;
  return Math.round((safeNumber(count) / denominator) * 1000) / 10;
};

export const percentile = (values = [], pct = 50) => {
  const numbers = asArray(values).map((value) => safeNumber(value, NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!numbers.length) return 0;
  const rank = Math.ceil((pct / 100) * numbers.length) - 1;
  return Math.round(numbers[Math.max(0, Math.min(numbers.length - 1, rank))] * 10) / 10;
};

const lower = (value) => String(value || '').trim().toLowerCase();

const draftCategory = (draft = {}) => (
  draft.generated_data?.category ||
  draft.generated_data?.job_type ||
  draft.job_type ||
  draft.ai_research_queue?.job_type ||
  'Uncategorized'
);

const jobCategory = (job = {}) => job.category || job.job_type || 'Uncategorized';

const draftAccepted = (draft = {}) => ['approved', 'published'].includes(String(draft.status || '').toLowerCase());

const draftRejected = (draft = {}) => ['rejected', 'needs_revision'].includes(String(draft.status || '').toLowerCase());

const sourceTrend = ({ logs = [], successRate = 0, failureRate = 0 }) => {
  if (!logs.length) return 'no_data';
  const recent = logs.slice(0, 5);
  const recentFailures = recent.filter((log) => log.status === 'failed').length;
  if (recent[0]?.status === 'failed' || failureRate >= 50 || recentFailures >= 3) return 'failing';
  if (successRate < 75 || recent.some((log) => log.status === 'partial')) return 'degraded';
  return 'healthy';
};

export const buildSourceIntelligence = ({
  sources = [],
  fetchLogs = [],
  fetchFailures = [],
  fetchDuplicates = [],
  queue = [],
  drafts = [],
} = {}) => {
  const queueById = new Map(asArray(queue).map((item) => [item.id, item]));
  const rows = asArray(sources).map((source) => {
    const sourceId = source.id;
    const logs = asArray(fetchLogs)
      .filter((log) => log.source_id === sourceId)
      .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')));
    const failures = asArray(fetchFailures).filter((failure) => failure.source_id === sourceId);
    const duplicates = asArray(fetchDuplicates).filter((duplicate) => duplicate.source_id === sourceId);
    const sourceQueue = asArray(queue).filter((item) => item.source_id === sourceId);
    const sourceDrafts = asArray(drafts).filter((draft) => queueById.get(draft.queue_item_id)?.source_id === sourceId);
    const runCount = logs.length;
    const successCount = logs.filter((log) => log.status === 'success').length;
    const failureCount = logs.filter((log) => log.status === 'failed').length + failures.length;
    const partialCount = logs.filter((log) => log.status === 'partial').length;
    const itemsFound = logs.reduce((sum, log) => sum + safeNumber(log.items_found), 0);
    const acceptedDrafts = sourceDrafts.filter(draftAccepted).length;
    const rejectedDrafts = sourceDrafts.filter(draftRejected).length;
    const successRate = rate(successCount + (partialCount * 0.5), runCount);
    const failureRate = runCount ? rate(failureCount, runCount + failures.length) : (failures.length ? 100 : 0);
    const duplicateRate = rate(duplicates.length, Math.max(itemsFound, sourceQueue.length, duplicates.length));
    const acceptedRate = rate(acceptedDrafts, Math.max(sourceDrafts.length, 1));
    const reliabilityScore = Math.round(
      (successRate * 0.40) +
      ((100 - Math.min(100, failureRate)) * 0.20) +
      ((100 - duplicateRate) * 0.20) +
      (acceptedRate * 0.20),
    );

    return {
      sourceId,
      name: source.name || 'Unknown source',
      tier: source.tier || null,
      category: source.category || 'uncategorized',
      isActive: Boolean(source.is_active),
      successRate,
      failureRate,
      reliabilityScore,
      averageItemsDiscovered: average(logs.map((log) => log.items_found)),
      averageAcceptedDrafts: runCount ? Math.round((acceptedDrafts / runCount) * 10) / 10 : acceptedDrafts,
      averageRejectedDrafts: runCount ? Math.round((rejectedDrafts / runCount) * 10) / 10 : rejectedDrafts,
      duplicateRate,
      healthTrend: sourceTrend({ logs, successRate, failureRate }),
      runs: runCount,
      itemsFound,
      acceptedDrafts,
      rejectedDrafts,
      duplicates: duplicates.length,
      failures: failureCount,
      lastChecked: logs[0]?.started_at || source.last_checked || null,
    };
  });

  return {
    rows: rows.sort((a, b) => b.reliabilityScore - a.reliabilityScore),
    summary: {
      sources: rows.length,
      activeSources: rows.filter((row) => row.isActive).length,
      averageReliability: average(rows.map((row) => row.reliabilityScore)),
      failingSources: rows.filter((row) => row.healthTrend === 'failing').length,
      degradedSources: rows.filter((row) => row.healthTrend === 'degraded').length,
    },
  };
};

export const buildFreshnessIntelligence = (jobs = [], { now = new Date() } = {}) => {
  const current = parseDate(now) || new Date();
  const rows = asArray(jobs).map((job) => {
    const lastDate = parseDate(job.last_date);
    const daysToDeadline = lastDate ? Math.ceil((lastDate.getTime() - current.getTime()) / 86_400_000) : null;
    const isPublished = job.status === 'published';
    const isExpired = lastDate ? daysToDeadline < 0 : false;
    return {
      ...job,
      daysToDeadline,
      isExpired,
      isActive: isPublished && !isExpired,
      missingDeadline: !lastDate,
      staleIndicator: isExpired ? 'expired' : !lastDate ? 'missing_deadline' : daysToDeadline <= 7 ? 'expiring_soon' : 'current',
    };
  });

  const published = rows.filter((job) => job.status === 'published');
  const expiringWithin = (days) => published.filter((job) => job.daysToDeadline !== null && job.daysToDeadline >= 0 && job.daysToDeadline <= days);

  return {
    rows,
    summary: {
      activeJobs: published.filter((job) => job.isActive).length,
      expiredJobs: published.filter((job) => job.isExpired).length,
      expiring1Day: expiringWithin(1).length,
      expiring3Days: expiringWithin(3).length,
      expiring7Days: expiringWithin(7).length,
      expiring30Days: expiringWithin(30).length,
      missingDeadlines: published.filter((job) => job.missingDeadline).length,
    },
    staleIndicators: rows
      .filter((job) => job.staleIndicator !== 'current')
      .sort((a, b) => safeNumber(a.daysToDeadline, 9999) - safeNumber(b.daysToDeadline, 9999))
      .slice(0, 20),
  };
};

export const buildCategoryCoverage = ({
  jobs = [],
  drafts = [],
  categories = [],
  now = new Date(),
} = {}) => {
  const current = parseDate(now) || new Date();
  const cutoff = new Date(current.getTime() - 30 * 86_400_000);
  const names = new Map();
  asArray(categories).forEach((category) => names.set(lower(category.name || category.slug), category.name || category.slug));
  asArray(jobs).forEach((job) => names.set(lower(jobCategory(job)), jobCategory(job)));
  asArray(drafts).forEach((draft) => names.set(lower(draftCategory(draft)), draftCategory(draft)));

  const rows = [...names.values()].filter(Boolean).map((categoryName) => {
    const key = lower(categoryName);
    const categoryJobs = asArray(jobs).filter((job) => lower(jobCategory(job)) === key);
    const categoryDrafts = asArray(drafts).filter((draft) => lower(draftCategory(draft)) === key);
    const publishedJobs = categoryJobs.filter((job) => job.status === 'published');
    const growth = [
      ...categoryJobs.filter((job) => parseDate(job.created_at) && parseDate(job.created_at) >= cutoff),
      ...categoryDrafts.filter((draft) => parseDate(draft.created_at) && parseDate(draft.created_at) >= cutoff),
    ].length;
    const total = categoryJobs.length + categoryDrafts.length;
    return {
      category: categoryName,
      jobs: categoryJobs.length,
      drafts: categoryDrafts.length,
      publishedJobs: publishedJobs.length,
      growth30Days: growth,
      total,
      isUnderrepresented: total > 0 && total < 2,
      isInactive: total === 0,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    rows,
    summary: {
      categories: rows.length,
      underrepresented: rows.filter((row) => row.isUnderrepresented).length,
      inactive: rows.filter((row) => row.isInactive).length,
      totalPublishedJobs: rows.reduce((sum, row) => sum + row.publishedJobs, 0),
      totalDrafts: rows.reduce((sum, row) => sum + row.drafts, 0),
    },
    gaps: rows.filter((row) => row.isUnderrepresented || row.isInactive),
  };
};

const actionTime = (actions = [], draftId, actionName) => (
  asArray(actions)
    .filter((action) => action.draft_id === draftId && action.action === actionName)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))[0]?.created_at || null
);

const metricStats = (values) => ({
  p50: percentile(values, 50),
  p90: percentile(values, 90),
  p95: percentile(values, 95),
  sampleSize: asArray(values).filter((value) => Number.isFinite(Number(value))).length,
});

export const buildPublishingSla = ({ drafts = [], moderationActions = [] } = {}) => {
  const draftToReview = [];
  const reviewToApproval = [];
  const approvalToPublish = [];
  const totalPublishCycle = [];

  asArray(drafts).forEach((draft) => {
    const draftId = draft.id;
    const reviewAt = actionTime(moderationActions, draftId, 'run_review');
    const approveAt = actionTime(moderationActions, draftId, 'approve');
    const publishAt = actionTime(moderationActions, draftId, 'publish');
    const convertAt = actionTime(moderationActions, draftId, 'convert_to_draft');
    const finalAt = publishAt || convertAt;

    const dtr = hoursBetween(draft.created_at, reviewAt);
    const rta = hoursBetween(reviewAt, approveAt);
    const atp = hoursBetween(approveAt, publishAt);
    const total = hoursBetween(draft.created_at, finalAt);

    if (dtr !== null && dtr >= 0) draftToReview.push(dtr);
    if (rta !== null && rta >= 0) reviewToApproval.push(rta);
    if (atp !== null && atp >= 0) approvalToPublish.push(atp);
    if (total !== null && total >= 0) totalPublishCycle.push(total);
  });

  return {
    draftToReview: metricStats(draftToReview),
    reviewToApproval: metricStats(reviewToApproval),
    approvalToPublish: metricStats(approvalToPublish),
    totalPublishCycle: metricStats(totalPublishCycle),
  };
};

export const buildDraftQualityReport = ({ drafts = [], reviews = [] } = {}) => ({
  totalDrafts: asArray(drafts).length,
  averageReadiness: average(asArray(reviews).map((review) => review.publish_readiness)),
  averageConfidence: average(asArray(reviews).map((review) => review.confidence)),
  blockedDrafts: asArray(reviews).filter((review) => review.decision_band === 'blocked').length,
  rejectedDrafts: asArray(drafts).filter((draft) => draft.status === 'rejected').length,
});

export const buildQueueHealthReport = (queue = []) => {
  const rows = asArray(queue);
  const counts = rows.reduce((memo, item) => {
    memo[item.status || 'unknown'] = (memo[item.status || 'unknown'] || 0) + 1;
    return memo;
  }, {});
  return {
    total: rows.length,
    pending: counts.pending || 0,
    processing: counts.processing || 0,
    drafted: counts.drafted || 0,
    rejected: counts.rejected || 0,
    retryCount: rows.reduce((sum, item) => sum + safeNumber(item.extracted_data?.phase2_retries), 0),
  };
};

export const buildOperationsReports = ({
  sourceIntelligence,
  categoryCoverage,
  draftQuality,
  publishingSla,
  queueHealth,
} = {}) => ({
  sourcePerformance: {
    title: 'Source Performance Report',
    status: sourceIntelligence?.summary?.failingSources ? 'attention' : 'healthy',
    primary: `${sourceIntelligence?.summary?.averageReliability || 0}% avg reliability`,
  },
  categoryCoverage: {
    title: 'Category Coverage Report',
    status: categoryCoverage?.summary?.inactive ? 'attention' : 'healthy',
    primary: `${categoryCoverage?.summary?.categories || 0} categories tracked`,
  },
  draftQuality: {
    title: 'Draft Quality Report',
    status: draftQuality?.blockedDrafts ? 'attention' : 'healthy',
    primary: `${draftQuality?.averageReadiness || 0}% avg readiness`,
  },
  publishingSla: {
    title: 'Publishing SLA Report',
    status: publishingSla?.totalPublishCycle?.p95 > 72 ? 'attention' : 'healthy',
    primary: `${publishingSla?.totalPublishCycle?.p95 || 0}h p95 cycle`,
  },
  queueHealth: {
    title: 'Queue Health Report',
    status: queueHealth?.processing || queueHealth?.pending > 100 ? 'attention' : 'healthy',
    primary: `${queueHealth?.pending || 0} pending`,
  },
});
