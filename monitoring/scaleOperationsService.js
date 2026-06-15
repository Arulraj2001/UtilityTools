import { dataOrEmpty } from './monitoringUtils.js';
import {
  DEFAULT_MONTHLY_PROVIDER_BUDGET_USD,
  buildPhase5CAnalytics,
  safeNumber,
} from '../lib/phase5cScaleOps.js';

const envBudget = () => safeNumber(
  process.env.AI_PROVIDER_MONTHLY_BUDGET_USD ||
    process.env.PHASE5C_MONTHLY_PROVIDER_BUDGET_USD,
  DEFAULT_MONTHLY_PROVIDER_BUDGET_USD,
);

export default class ScaleOperationsService {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('ScaleOperationsService requires a Supabase client.');
    this.supabase = supabase;
    this.defaultBudgetUsd = safeNumber(options.defaultBudgetUsd, envBudget());
    this.providerRates = options.providerRates;
    this.now = options.now;
  }

  async tableRows(table, select, { orderBy = 'created_at', ascending = false, limit = 5000 } = {}) {
    const result = await this.supabase
      .from(table)
      .select(select, { count: 'exact' })
      .order(orderBy, { ascending })
      .limit(limit);
    return {
      rows: dataOrEmpty(result),
      count: safeNumber(result?.count, dataOrEmpty(result).length),
      error: result?.error || null,
    };
  }

  async getScaleOperations({
    days = 30,
    monthlyBudgetUsd = this.defaultBudgetUsd,
    strategy = 'balanced',
  } = {}) {
    const windowDays = Math.max(1, Math.min(365, safeNumber(days, 30)));
    const [
      providers,
      failures,
      drafts,
      queue,
      reviews,
      moderation,
      rawNotifications,
      snapshots,
      alerts,
      sources,
      fetchLogs,
      fetchFailures,
      fetchDuplicates,
    ] = await Promise.all([
      this.tableRows(
        'ai_provider_settings',
        'id,provider_name,model,priority,is_active,stats,health_status,last_tested,last_latency_ms,updated_at',
        { orderBy: 'priority', ascending: true, limit: 100 },
      ),
      this.tableRows(
        'ai_provider_failures',
        'id,provider_name,error,details,duration_ms,occurred_at,created_at',
        { orderBy: 'occurred_at', ascending: false, limit: 2000 },
      ),
      this.tableRows(
        'ai_job_drafts',
        'id,queue_item_id,job_type,ai_provider,tokens_used,generation_ms,generated_data,quality_scores,status,readiness_score,confidence_score,published_job_id,created_at,updated_at',
        { orderBy: 'created_at', ascending: false, limit: 10000 },
      ),
      this.tableRows(
        'ai_research_queue',
        'id,source_id,job_type,status,priority,extracted_data,created_at,updated_at',
        { orderBy: 'created_at', ascending: false, limit: 10000 },
      ),
      this.tableRows(
        'ai_review_results',
        'id,draft_id,queue_item_id,publish_readiness,confidence,decision_band,is_stale,created_at,updated_at',
        { orderBy: 'created_at', ascending: false, limit: 10000 },
      ),
      this.tableRows(
        'ai_moderation_actions',
        'id,draft_id,job_id,action,reason_code,created_at',
        { orderBy: 'created_at', ascending: false, limit: 10000 },
      ),
      this.tableRows(
        'raw_job_notifications',
        'id,source_id,source_name,status,fetched_at,created_at,updated_at',
        { orderBy: 'created_at', ascending: false, limit: 10000 },
      ),
      this.tableRows(
        'monitoring_metrics_snapshots',
        'id,snapshot_type,captured_at,created_at',
        { orderBy: 'captured_at', ascending: false, limit: 3000 },
      ),
      this.tableRows(
        'monitoring_alerts',
        'id,type,severity,status,created_at,updated_at',
        { orderBy: 'created_at', ascending: false, limit: 3000 },
      ),
      this.tableRows(
        'ai_job_sources',
        'id,name,tier,category,is_active,created_at,updated_at',
        { orderBy: 'name', ascending: true, limit: 1000 },
      ),
      this.tableRows(
        'job_fetch_logs',
        'id,source_id,status,items_found,started_at,completed_at,created_at',
        { orderBy: 'started_at', ascending: false, limit: 5000 },
      ),
      this.tableRows(
        'fetch_failures',
        'id,source_id,error_message,details,created_at',
        { orderBy: 'created_at', ascending: false, limit: 5000 },
      ),
      this.tableRows(
        'job_fetch_duplicates',
        'id,source_id,reason,created_at',
        { orderBy: 'created_at', ascending: false, limit: 5000 },
      ),
    ]);

    const monitoringRows = [
      ...snapshots.rows.map((row) => ({ ...row, kind: 'snapshot', created_at: row.created_at || row.captured_at })),
      ...alerts.rows.map((row) => ({ ...row, kind: 'alert' })),
    ];

    return buildPhase5CAnalytics({
      providers: providers.rows,
      failures: failures.rows,
      drafts: drafts.rows,
      queue: queue.rows,
      reviews: reviews.rows,
      moderation: moderation.rows,
      rawNotifications: rawNotifications.rows,
      monitoring: monitoringRows,
      sources: sources.rows,
      fetchLogs: fetchLogs.rows,
      fetchFailures: fetchFailures.rows,
      fetchDuplicates: fetchDuplicates.rows,
      counts: {
        rawNotifications: rawNotifications.count,
        queue: queue.count,
        drafts: drafts.count,
        reviews: reviews.count,
        moderation: moderation.count,
        monitoring: snapshots.count + alerts.count,
      },
      selectedStrategy: strategy,
      monthlyBudgetUsd,
      providerRates: this.providerRates,
      now: this.now || new Date(),
      windowDays,
    });
  }
}
