export const DEFAULT_MONTHLY_PROVIDER_BUDGET_USD = 25;

export const DEFAULT_PROVIDER_COST_PER_1K_TOKENS = {
  cerebras: 0,
  openrouter: 0,
  groq: 0,
  gemini: 0.00035,
  huggingface: 0,
  deepseek: 0.00014,
  unknown: 0.00025,
};

export const VOLUME_SCENARIOS = [100, 1000, 10000];

const MS_PER_DAY = 86_400_000;

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
};

export const rate = (part, total) => {
  const denominator = safeNumber(total);
  if (denominator <= 0) return 0;
  return round((safeNumber(part) / denominator) * 100, 1);
};

export const average = (values = []) => {
  const nums = asArray(values).map((value) => safeNumber(value, NaN)).filter(Number.isFinite);
  if (!nums.length) return 0;
  return round(nums.reduce((sum, value) => sum + value, 0) / nums.length, 2);
};

export const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const dateBucket = (value, granularity = 'month') => {
  const date = parseDate(value);
  if (!date) return 'unknown';
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return granularity === 'day' ? `${yyyy}-${mm}-${dd}` : `${yyyy}-${mm}`;
};

export const daysBetween = (left, right) => {
  const start = parseDate(left);
  const end = parseDate(right);
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
};

const currentMonthKey = (now) => dateBucket(now, 'month');

const daysInMonth = (date) => {
  const current = parseDate(date) || new Date();
  return new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
};

const elapsedMonthDays = (date) => {
  const current = parseDate(date) || new Date();
  return Math.max(1, current.getUTCDate());
};

const providerKey = (name) => String(name || 'unknown').trim().toLowerCase() || 'unknown';

export const providerCost = (providerName, tokens = 0, rates = DEFAULT_PROVIDER_COST_PER_1K_TOKENS) => {
  const key = providerKey(providerName);
  const costPer1k = rates[key] ?? rates.unknown ?? 0;
  return (safeNumber(tokens) / 1000) * safeNumber(costPer1k);
};

const providerLabel = (providerName) => providerKey(providerName);

const qualityScore = (draft = {}, reviewByDraftId = new Map()) => {
  const quality = draft.quality_scores || {};
  const review = reviewByDraftId.get(draft.id) || {};
  return safeNumber(
    quality.overall ??
      quality.finalScore ??
      quality.contentQuality ??
      draft.readiness_score ??
      review.publish_readiness,
    0,
  );
};

const draftCategory = (draft = {}, queueById = new Map()) => {
  const queue = queueById.get(draft.queue_item_id) || {};
  return (
    draft.generated_data?.category ||
    draft.generated_data?.job_category ||
    draft.generated_data?.job_type ||
    draft.job_type ||
    queue.job_type ||
    'Uncategorized'
  );
};

const sourceName = (sourceId, sourceNameFallback, sourceById = new Map()) => {
  const source = sourceById.get(sourceId);
  return source?.name || sourceNameFallback || sourceId || 'Unknown source';
};

const sumCost = (drafts, rates) => asArray(drafts).reduce((sum, draft) => (
  sum + providerCost(draft.ai_provider, draft.tokens_used, rates)
), 0);

const buildGroupRows = ({ drafts, groupKey, labelKey, rates }) => {
  const groups = new Map();
  asArray(drafts).forEach((draft) => {
    const key = groupKey(draft) || 'unknown';
    const label = labelKey(draft, key) || key;
    const row = groups.get(key) || {
      key,
      label,
      drafts: 0,
      tokensUsed: 0,
      estimatedSpendUsd: 0,
      averageCostPerDraftUsd: 0,
    };
    row.drafts += 1;
    row.tokensUsed += safeNumber(draft.tokens_used);
    row.estimatedSpendUsd += providerCost(draft.ai_provider, draft.tokens_used, rates);
    groups.set(key, row);
  });

  return [...groups.values()]
    .map((row) => ({
      ...row,
      estimatedSpendUsd: round(row.estimatedSpendUsd, 6),
      averageCostPerDraftUsd: round(row.estimatedSpendUsd / Math.max(1, row.drafts), 6),
    }))
    .sort((a, b) => b.estimatedSpendUsd - a.estimatedSpendUsd);
};

export const buildCostGovernance = ({
  drafts = [],
  queue = [],
  sources = [],
  reviews = [],
  monthlyBudgetUsd = DEFAULT_MONTHLY_PROVIDER_BUDGET_USD,
  providerRates = DEFAULT_PROVIDER_COST_PER_1K_TOKENS,
  now = new Date(),
} = {}) => {
  const currentMonth = currentMonthKey(now);
  const queueById = new Map(asArray(queue).map((item) => [item.id, item]));
  const sourceById = new Map(asArray(sources).map((item) => [item.id, item]));
  const reviewByDraftId = new Map(asArray(reviews).filter((review) => !review.is_stale).map((review) => [review.draft_id, review]));
  const monthDrafts = asArray(drafts).filter((draft) => dateBucket(draft.created_at, 'month') === currentMonth);
  const allDraftSpend = sumCost(drafts, providerRates);
  const monthlySpend = sumCost(monthDrafts, providerRates);
  const elapsedDays = elapsedMonthDays(now);
  const projectedMonthlySpend = (monthlySpend / elapsedDays) * daysInMonth(now);
  const budget = Math.max(0, safeNumber(monthlyBudgetUsd, DEFAULT_MONTHLY_PROVIDER_BUDGET_USD));
  const budgetUsedPercent = budget ? rate(monthlySpend, budget) : 0;
  const projectedBudgetPercent = budget ? rate(projectedMonthlySpend, budget) : 0;
  const monthlyDraftCount = monthDrafts.length;

  const budgetStatus =
    budget > 0 && (monthlySpend > budget || projectedMonthlySpend > budget) ? 'critical' :
    budget > 0 && projectedBudgetPercent >= 80 ? 'watch' :
    'healthy';

  return {
    generatedAt: new Date().toISOString(),
    currentMonth,
    budget: {
      monthlyBudgetUsd: round(budget, 2),
      currentMonthSpendUsd: round(monthlySpend, 6),
      projectedMonthlySpendUsd: round(projectedMonthlySpend, 6),
      remainingBudgetUsd: round(Math.max(0, budget - monthlySpend), 6),
      budgetUsedPercent,
      projectedBudgetPercent,
      status: budgetStatus,
    },
    totals: {
      drafts: asArray(drafts).length,
      monthlyDrafts: monthlyDraftCount,
      tokensUsed: asArray(drafts).reduce((sum, draft) => sum + safeNumber(draft.tokens_used), 0),
      estimatedSpendUsd: round(allDraftSpend, 6),
      averageCostPerDraftUsd: round(allDraftSpend / Math.max(1, asArray(drafts).length), 6),
      monthlyCostPerDraftUsd: round(monthlySpend / Math.max(1, monthlyDraftCount), 6),
      averageQualityScore: average(asArray(drafts).map((draft) => qualityScore(draft, reviewByDraftId))),
    },
    providerSpend: buildGroupRows({
      drafts,
      rates: providerRates,
      groupKey: (draft) => providerLabel(draft.ai_provider),
      labelKey: (draft, key) => key,
    }),
    costPerCategory: buildGroupRows({
      drafts,
      rates: providerRates,
      groupKey: (draft) => draftCategory(draft, queueById),
      labelKey: (draft, key) => key,
    }),
    costPerSource: buildGroupRows({
      drafts,
      rates: providerRates,
      groupKey: (draft) => queueById.get(draft.queue_item_id)?.source_id || 'unknown',
      labelKey: (draft, key) => sourceName(key, null, sourceById),
    }),
    monthlySpendTrend: Object.entries(asArray(drafts).reduce((memo, draft) => {
      const month = dateBucket(draft.created_at, 'month');
      memo[month] = (memo[month] || 0) + providerCost(draft.ai_provider, draft.tokens_used, providerRates);
      return memo;
    }, {}))
      .map(([month, spend]) => ({ month, estimatedSpendUsd: round(spend, 6) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    assumptions: {
      providerRates,
      note: 'Spend is estimated from ai_job_drafts.tokens_used and provider rate assumptions. No provider secrets are read or returned.',
    },
  };
};

const failureType = (failure = {}) => {
  const text = `${failure.details?.error_type || ''} ${failure.error || ''}`.toLowerCase();
  if (/timeout|timed out|abort/.test(text)) return 'timeout';
  if (/quota|rate_limit|rate limit|429/.test(text)) return 'quota';
  if (/auth|unauthorized|401|403|key/.test(text)) return 'auth';
  return failure.details?.error_type || 'other';
};

const normalizeProviderRows = ({ providers = [], failures = [], drafts = [], reviews = [], providerRates = DEFAULT_PROVIDER_COST_PER_1K_TOKENS }) => {
  const reviewByDraftId = new Map(asArray(reviews).filter((review) => !review.is_stale).map((review) => [review.draft_id, review]));
  return asArray(providers).map((provider) => {
    const providerName = provider.provider_name || provider.providerName || 'unknown';
    const stats = provider.stats || {};
    const providerDrafts = asArray(drafts).filter((draft) => providerKey(draft.ai_provider) === providerKey(providerName));
    const providerFailures = asArray(failures).filter((failure) => providerKey(failure.provider_name) === providerKey(providerName));
    const requests = safeNumber(stats.requests, providerDrafts.length + providerFailures.length);
    const successes = safeNumber(stats.successes, providerDrafts.length);
    const failed = safeNumber(stats.failures, providerFailures.length);
    const failureCounts = providerFailures.reduce((memo, failure) => {
      const type = failureType(failure);
      memo[type] = (memo[type] || 0) + 1;
      return memo;
    }, {});
    const spend = sumCost(providerDrafts, providerRates);
    const latencies = [
      ...providerDrafts.map((draft) => draft.generation_ms),
      ...providerFailures.map((failure) => failure.duration_ms),
      provider.last_latency_ms,
      stats.avg_latency_ms,
    ].map((value) => safeNumber(value, NaN)).filter(Number.isFinite);
    const score = average(providerDrafts.map((draft) => qualityScore(draft, reviewByDraftId)));

    return {
      providerName,
      model: provider.model || '',
      priority: provider.priority ?? null,
      isActive: Boolean(provider.is_active ?? provider.isActive),
      healthStatus: provider.health_status || provider.healthStatus || 'unknown',
      requests,
      successes,
      failures: failed || providerFailures.length,
      successRate: rate(successes, requests || successes + failed || providerDrafts.length),
      latencyMs: average(latencies),
      estimatedSpendUsd: round(spend, 6),
      estimatedCostPerDraftUsd: round(spend / Math.max(1, providerDrafts.length), 6),
      qualityScore: score,
      timeoutFailures: failureCounts.timeout || 0,
      quotaFailures: failureCounts.quota || 0,
      authFailures: failureCounts.auth || 0,
      drafts: providerDrafts.length,
    };
  });
};

const withStrategyScores = (rows) => {
  const activeRows = rows.filter((row) => row.isActive);
  const maxCost = Math.max(...activeRows.map((row) => row.estimatedCostPerDraftUsd), 0.000001);
  const maxLatency = Math.max(...activeRows.map((row) => row.latencyMs), 1);

  return rows.map((row) => {
    const costEfficiency = row.estimatedCostPerDraftUsd <= 0 ? 100 : Math.max(0, 100 - ((row.estimatedCostPerDraftUsd / maxCost) * 100));
    const latencyScore = row.latencyMs <= 0 ? 100 : Math.max(0, 100 - ((row.latencyMs / maxLatency) * 100));
    const balancedScore = round(
      (row.successRate * 0.35) +
      (row.qualityScore * 0.30) +
      (costEfficiency * 0.20) +
      (latencyScore * 0.15),
      1,
    );
    return { ...row, costEfficiency: round(costEfficiency, 1), latencyScore: round(latencyScore, 1), balancedScore };
  });
};

const strategySorters = {
  'cheapest-first': (a, b) => (
    a.estimatedCostPerDraftUsd - b.estimatedCostPerDraftUsd ||
    b.successRate - a.successRate ||
    a.priority - b.priority
  ),
  'quality-first': (a, b) => (
    b.qualityScore - a.qualityScore ||
    b.successRate - a.successRate ||
    a.latencyMs - b.latencyMs
  ),
  balanced: (a, b) => (
    b.balancedScore - a.balancedScore ||
    b.successRate - a.successRate ||
    a.priority - b.priority
  ),
  'fallback-only': (a, b) => (
    safeNumber(a.priority, 999) - safeNumber(b.priority, 999) ||
    b.successRate - a.successRate
  ),
};

export const buildProviderRoutingPolicies = ({
  providers = [],
  failures = [],
  drafts = [],
  reviews = [],
  providerRates = DEFAULT_PROVIDER_COST_PER_1K_TOKENS,
  selectedStrategy = 'balanced',
} = {}) => {
  const metrics = withStrategyScores(normalizeProviderRows({ providers, failures, drafts, reviews, providerRates }));
  const active = metrics.filter((row) => row.isActive);
  const strategies = ['cheapest-first', 'quality-first', 'balanced', 'fallback-only'].reduce((memo, strategy) => {
    const sorted = [...active].sort(strategySorters[strategy]);
    memo[strategy] = {
      strategy,
      primaryProvider: sorted[0]?.providerName || null,
      providerOrder: sorted.map((row, index) => ({
        rank: index + 1,
        providerName: row.providerName,
        successRate: row.successRate,
        latencyMs: row.latencyMs,
        estimatedCostPerDraftUsd: row.estimatedCostPerDraftUsd,
        qualityScore: row.qualityScore,
        balancedScore: row.balancedScore,
      })),
    };
    return memo;
  }, {});

  const strategy = strategies[selectedStrategy] ? selectedStrategy : 'balanced';

  return {
    generatedAt: new Date().toISOString(),
    selectedStrategy: strategy,
    strategies,
    providerMetrics: metrics.sort((a, b) => safeNumber(a.priority, 999) - safeNumber(b.priority, 999)),
    activeProviderCount: active.length,
    recommendation: strategies[strategy]?.primaryProvider
      ? `${strategies[strategy].primaryProvider} is the leading provider for ${strategy}.`
      : 'No active provider has enough configuration for routing analysis.',
    policyNotes: {
      'cheapest-first': 'Ranks active providers by estimated cost per draft, then success rate.',
      'quality-first': 'Ranks active providers by observed draft/review quality, then success rate.',
      balanced: 'Balances success rate, quality, cost efficiency, and latency.',
      'fallback-only': 'Preserves configured priority order and uses metrics for visibility only.',
    },
  };
};

const countByMonth = (rows = [], dateField = 'created_at') => {
  const months = asArray(rows).reduce((memo, row) => {
    const month = dateBucket(row[dateField], 'month');
    memo[month] = (memo[month] || 0) + 1;
    return memo;
  }, {});
  return Object.entries(months)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

const archiveCandidateCount = (rows = [], { dateField = 'created_at', days = 180, statuses = [] } = {}, now = new Date()) => {
  const cutoff = new Date((parseDate(now) || new Date()).getTime() - (safeNumber(days) * MS_PER_DAY));
  const statusSet = new Set(statuses);
  return asArray(rows).filter((row) => {
    const date = parseDate(row[dateField]);
    const statusOk = !statusSet.size || statusSet.has(row.status) || statusSet.has(row.action);
    return date && date < cutoff && statusOk;
  }).length;
};

const tableGrowth = ({ key, label, rows, count, dateField = 'created_at', candidateOptions = {}, now = new Date(), windowDays = 30 }) => {
  const current = parseDate(now) || new Date();
  const cutoff30 = new Date(current.getTime() - (windowDays * MS_PER_DAY));
  const cutoff7 = new Date(current.getTime() - (7 * MS_PER_DAY));
  const total = safeNumber(count, asArray(rows).length);
  const inWindow = asArray(rows).filter((row) => {
    const date = parseDate(row[dateField]);
    return date && date >= cutoff30;
  }).length;
  const in7 = asArray(rows).filter((row) => {
    const date = parseDate(row[dateField]);
    return date && date >= cutoff7;
  }).length;
  const projectedMonthlyRows = round((inWindow / Math.max(1, windowDays)) * 30, 1);
  const candidateCount = archiveCandidateCount(rows, candidateOptions, current);

  return {
    key,
    label,
    totalRows: total,
    sampledRows: asArray(rows).length,
    rowsLast7Days: in7,
    rowsInWindow: inWindow,
    averageRowsPerDay: round(inWindow / Math.max(1, windowDays), 2),
    projectedMonthlyRows,
    monthlyGrowth: countByMonth(rows, dateField),
    archiveCandidateRows: candidateCount,
    growthStatus: projectedMonthlyRows > 10000 ? 'high' : projectedMonthlyRows > 1000 ? 'medium' : 'normal',
  };
};

export const buildRetentionRecommendations = ({
  rawNotifications = [],
  queue = [],
  drafts = [],
  reviews = [],
  moderation = [],
  monitoring = [],
  counts = {},
  now = new Date(),
  windowDays = 30,
} = {}) => {
  const tables = [
    tableGrowth({
      key: 'raw_job_notifications',
      label: 'Raw Job Notifications',
      rows: rawNotifications,
      count: counts.rawNotifications,
      dateField: 'created_at',
      candidateOptions: { dateField: 'created_at', days: 180, statuses: ['processed', 'duplicate', 'ignored', 'failed'] },
      now,
      windowDays,
    }),
    tableGrowth({
      key: 'ai_research_queue',
      label: 'AI Research Queue',
      rows: queue,
      count: counts.queue,
      dateField: 'created_at',
      candidateOptions: { dateField: 'updated_at', days: 180, statuses: ['drafted', 'rejected', 'saved_later'] },
      now,
      windowDays,
    }),
    tableGrowth({
      key: 'ai_job_drafts',
      label: 'AI Job Drafts',
      rows: drafts,
      count: counts.drafts,
      dateField: 'created_at',
      candidateOptions: { dateField: 'updated_at', days: 365, statuses: ['published', 'rejected'] },
      now,
      windowDays,
    }),
    tableGrowth({
      key: 'ai_review_results',
      label: 'Review Results',
      rows: reviews,
      count: counts.reviews,
      dateField: 'created_at',
      candidateOptions: { dateField: 'created_at', days: 365 },
      now,
      windowDays,
    }),
    tableGrowth({
      key: 'ai_moderation_actions',
      label: 'Moderation Actions',
      rows: moderation,
      count: counts.moderation,
      dateField: 'created_at',
      candidateOptions: { dateField: 'created_at', days: 365 },
      now,
      windowDays,
    }),
    tableGrowth({
      key: 'monitoring',
      label: 'Monitoring Snapshots and Alerts',
      rows: monitoring,
      count: counts.monitoring,
      dateField: 'created_at',
      candidateOptions: { dateField: 'created_at', days: 180 },
      now,
      windowDays,
    }),
  ];

  return {
    generatedAt: new Date().toISOString(),
    automaticArchival: false,
    tables,
    recommendations: tables.map((table) => ({
      table: table.key,
      label: table.label,
      recommendation:
        table.archiveCandidateRows > 0
          ? `Review ${table.archiveCandidateRows} sampled row(s) for manual archival.`
          : 'No immediate manual archival candidate found in the sampled data.',
      retentionPolicy:
        table.key === 'raw_job_notifications' ? 'Keep hot for 90 days, retain processed/duplicate records for at least 180 days, archive manually after review.' :
        table.key === 'ai_job_drafts' ? 'Keep active drafts hot. Review published/rejected drafts after 365 days for manual archival.' :
        table.key === 'monitoring' ? 'Keep recent snapshots hot for 180 days, then export/archive manually if dashboards remain performant.' :
        'Keep operational history hot for at least 365 days unless database growth requires a manual archival run.',
      risk: table.growthStatus === 'high' ? 'high_growth' : table.archiveCandidateRows > 0 ? 'archive_review' : 'normal',
    })),
  };
};

const countRecent = (rows = [], dateField = 'created_at', windowDays = 30, now = new Date()) => {
  const cutoff = new Date((parseDate(now) || new Date()).getTime() - (windowDays * MS_PER_DAY));
  return asArray(rows).filter((row) => {
    const date = parseDate(row[dateField]);
    return date && date >= cutoff;
  }).length;
};

const throughput = ({ label, rows, dateField, windowDays, now, filter = () => true }) => {
  const filtered = asArray(rows).filter(filter);
  const completed = countRecent(filtered, dateField, windowDays, now);
  return {
    label,
    completed,
    perDay: round(completed / Math.max(1, windowDays), 2),
    perMonth: round((completed / Math.max(1, windowDays)) * 30, 1),
  };
};

const coverageStatus = (coveragePercent) => (
  coveragePercent >= 120 ? 'healthy' :
  coveragePercent >= 80 ? 'watch' :
  'constrained'
);

export const buildCapacityPlanning = ({
  rawNotifications = [],
  queue = [],
  drafts = [],
  reviews = [],
  moderation = [],
  costGovernance = null,
  now = new Date(),
  windowDays = 30,
  scenarios = VOLUME_SCENARIOS,
} = {}) => {
  const queueThroughput = throughput({
    label: 'Queue throughput',
    rows: queue,
    dateField: 'updated_at',
    windowDays,
    now,
    filter: (row) => ['drafted', 'rejected'].includes(row.status),
  });
  const draftThroughput = throughput({ label: 'Draft throughput', rows: drafts, dateField: 'created_at', windowDays, now });
  const reviewThroughput = throughput({ label: 'Review throughput', rows: reviews, dateField: 'created_at', windowDays, now });
  const publishThroughput = throughput({
    label: 'Publish throughput',
    rows: moderation,
    dateField: 'created_at',
    windowDays,
    now,
    filter: (row) => ['publish', 'convert_to_draft'].includes(row.action),
  });

  const draftCount = Math.max(1, asArray(drafts).length);
  const observedQueuePerDraft = Math.max(1, asArray(queue).length / draftCount);
  const observedRawPerDraft = Math.max(1, asArray(rawNotifications).length / draftCount);
  const observedReviewPerDraft = Math.max(1, asArray(reviews).length / draftCount);
  const observedModerationPerDraft = Math.max(1, asArray(moderation).length / draftCount);
  const avgTokensPerDraft = average(asArray(drafts).map((draft) => draft.tokens_used)) || 2500;
  const avgCostPerDraft = costGovernance?.totals?.averageCostPerDraftUsd ?? 0;

  const scenarioRows = asArray(scenarios).map((monthlyJobs) => {
    const jobs = safeNumber(monthlyJobs);
    const dailyJobs = jobs / 30;
    const estimatedDrafts = Math.ceil(jobs * Math.max(1, Math.min(2, draftCount / Math.max(1, asArray(queue).length || draftCount))));
    const requiredDailyDrafts = estimatedDrafts / 30;
    const requiredDailyReviews = (estimatedDrafts * observedReviewPerDraft) / 30;
    const requiredDailyPublishes = jobs / 30;
    const queueCoverage = rate(queueThroughput.perDay, dailyJobs);
    const draftCoverage = rate(draftThroughput.perDay, requiredDailyDrafts);
    const reviewCoverage = rate(reviewThroughput.perDay, requiredDailyReviews);
    const publishCoverage = rate(publishThroughput.perDay, requiredDailyPublishes);
    const bottlenecks = [
      ['queue', queueCoverage],
      ['draft', draftCoverage],
      ['review', reviewCoverage],
      ['publish', publishCoverage],
    ].filter(([, coverage]) => coverage < 100).map(([name]) => name);

    return {
      monthlyJobs: jobs,
      dailyJobs: round(dailyJobs, 2),
      estimatedRows: {
        rawJobNotifications: Math.ceil(jobs * observedRawPerDraft),
        aiResearchQueue: Math.ceil(jobs * observedQueuePerDraft),
        aiJobDrafts: estimatedDrafts,
        aiReviewResults: Math.ceil(estimatedDrafts * observedReviewPerDraft),
        aiModerationActions: Math.ceil(estimatedDrafts * observedModerationPerDraft),
      },
      provider: {
        estimatedDrafts,
        estimatedTokens: Math.ceil(estimatedDrafts * avgTokensPerDraft),
        estimatedCostUsd: round(estimatedDrafts * avgCostPerDraft, 6),
      },
      requiredDailyThroughput: {
        queue: round(dailyJobs, 2),
        drafts: round(requiredDailyDrafts, 2),
        reviews: round(requiredDailyReviews, 2),
        publishes: round(requiredDailyPublishes, 2),
      },
      coveragePercent: {
        queue: queueCoverage,
        drafts: draftCoverage,
        reviews: reviewCoverage,
        publishes: publishCoverage,
      },
      status: coverageStatus(Math.min(queueCoverage, draftCoverage, reviewCoverage, publishCoverage)),
      bottlenecks,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    currentThroughput: {
      queue: queueThroughput,
      drafts: draftThroughput,
      reviews: reviewThroughput,
      publishes: publishThroughput,
    },
    scenarios: scenarioRows,
    assumptions: {
      averageTokensPerDraft: avgTokensPerDraft,
      averageCostPerDraftUsd: round(avgCostPerDraft, 6),
      observedRawPerDraft: round(observedRawPerDraft, 2),
      observedQueuePerDraft: round(observedQueuePerDraft, 2),
      observedReviewPerDraft: round(observedReviewPerDraft, 2),
      observedModerationPerDraft: round(observedModerationPerDraft, 2),
    },
  };
};

export const buildExecutiveReports = ({
  costGovernance,
  providerRouting,
  retention,
  capacity,
  sources = [],
  rawNotifications = [],
  fetchLogs = [],
  fetchFailures = [],
  fetchDuplicates = [],
} = {}) => {
  const activeSources = asArray(sources).filter((source) => source.is_active).length;
  const fetchSuccesses = asArray(fetchLogs).filter((log) => log.status === 'success').length;
  const fetchRunCount = asArray(fetchLogs).length;
  const highScenario = asArray(capacity?.scenarios).find((scenario) => scenario.monthlyJobs === 10000) || asArray(capacity?.scenarios).at(-1) || {};

  return {
    generatedAt: new Date().toISOString(),
    monthlyOperationsReport: {
      title: 'Monthly Operations Report',
      status: highScenario.status === 'constrained' ? 'attention' : 'ready',
      summary: `${capacity?.currentThroughput?.drafts?.perMonth || 0} drafts/month observed; ${capacity?.currentThroughput?.publishes?.perMonth || 0} publish actions/month observed.`,
      metrics: capacity?.currentThroughput || {},
    },
    monthlyCostReport: {
      title: 'Monthly Cost Report',
      status: costGovernance?.budget?.status || 'unknown',
      summary: `$${costGovernance?.budget?.projectedMonthlySpendUsd || 0} projected spend against $${costGovernance?.budget?.monthlyBudgetUsd || 0} budget.`,
      metrics: costGovernance?.budget || {},
    },
    monthlySourceReport: {
      title: 'Monthly Source Report',
      status: fetchRunCount && rate(fetchSuccesses, fetchRunCount) < 80 ? 'attention' : 'ready',
      summary: `${activeSources} active sources; ${rate(fetchSuccesses, fetchRunCount)}% fetch success across sampled runs.`,
      metrics: {
        activeSources,
        rawNotifications: asArray(rawNotifications).length,
        fetchRuns: fetchRunCount,
        fetchFailures: asArray(fetchFailures).length,
        fetchDuplicates: asArray(fetchDuplicates).length,
      },
    },
    monthlyProviderReport: {
      title: 'Monthly Provider Report',
      status: providerRouting?.activeProviderCount ? 'ready' : 'attention',
      summary: providerRouting?.recommendation || 'Provider routing metrics unavailable.',
      metrics: {
        activeProviders: providerRouting?.activeProviderCount || 0,
        selectedStrategy: providerRouting?.selectedStrategy || 'balanced',
        providerMetrics: providerRouting?.providerMetrics || [],
      },
    },
    monthlyCapacityReport: {
      title: 'Monthly Capacity Report',
      status: highScenario.status || 'unknown',
      summary: `10,000 jobs/month model is ${highScenario.status || 'unknown'} with ${(highScenario.bottlenecks || []).join(', ') || 'no'} bottlenecks.`,
      metrics: highScenario,
    },
  };
};

export const buildPhase5CAnalytics = ({
  providers = [],
  failures = [],
  drafts = [],
  queue = [],
  reviews = [],
  moderation = [],
  rawNotifications = [],
  monitoring = [],
  sources = [],
  fetchLogs = [],
  fetchFailures = [],
  fetchDuplicates = [],
  counts = {},
  selectedStrategy = 'balanced',
  monthlyBudgetUsd = DEFAULT_MONTHLY_PROVIDER_BUDGET_USD,
  providerRates = DEFAULT_PROVIDER_COST_PER_1K_TOKENS,
  now = new Date(),
  windowDays = 30,
} = {}) => {
  const costGovernance = buildCostGovernance({
    drafts,
    queue,
    sources,
    reviews,
    monthlyBudgetUsd,
    providerRates,
    now,
  });
  const providerRouting = buildProviderRoutingPolicies({
    providers,
    failures,
    drafts,
    reviews,
    providerRates,
    selectedStrategy,
  });
  const retention = buildRetentionRecommendations({
    rawNotifications,
    queue,
    drafts,
    reviews,
    moderation,
    monitoring,
    counts,
    now,
    windowDays,
  });
  const capacity = buildCapacityPlanning({
    rawNotifications,
    queue,
    drafts,
    reviews,
    moderation,
    costGovernance,
    now,
    windowDays,
  });
  const executiveReports = buildExecutiveReports({
    costGovernance,
    providerRouting,
    retention,
    capacity,
    sources,
    rawNotifications,
    fetchLogs,
    fetchFailures,
    fetchDuplicates,
  });

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    costGovernance,
    providerRouting,
    retention,
    capacity,
    executiveReports,
    security: {
      adminOnly: true,
      exposesProviderSecrets: false,
      exposesServiceRole: false,
      automaticArchival: false,
      mutatesRouting: false,
    },
  };
};
