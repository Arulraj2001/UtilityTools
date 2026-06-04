const noopLogger = {
  warn: () => {},
};

const dataOrThrow = (result, operation) => {
  if (result.error) {
    const error = new Error(`${operation} failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data || [];
};

const successStatuses = new Set(['success', 'partial']);

const isSuccessStatus = (status) => successStatuses.has(status);

const averageDuration = (currentAverage, currentRuns, nextDuration) => {
  if (!nextDuration) return currentAverage || 0;
  const previousTotal = (currentAverage || 0) * Math.max(0, currentRuns - 1);
  return Math.round((previousTotal + nextDuration) / Math.max(1, currentRuns));
};

export default class FetchHealthService {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.logger = options.logger || noopLogger;
  }

  async recordSourceRun(source, result = {}) {
    if (!source?.id) return null;

    const currentResult = await this.supabase
      .from('job_fetch_source_metrics')
      .select('*')
      .eq('source_id', source.id)
      .maybeSingle();

    const current = currentResult.error ? null : currentResult.data;
    if (currentResult.error) {
      this.logger.warn?.(`Unable to load fetch metrics: ${currentResult.error.message}`);
    }

    const status = result.status || 'failed';
    const successful = isSuccessStatus(status);
    const totalRuns = (current?.total_runs || 0) + 1;
    const failureCount = (current?.failure_count || 0) + (successful ? 0 : 1);
    const successCount = (current?.success_count || 0) + (successful ? 1 : 0);

    const payload = {
      source_id: source.id,
      last_status: status,
      last_success_at: successful ? new Date().toISOString() : current?.last_success_at || null,
      last_failure_at: successful ? current?.last_failure_at || null : new Date().toISOString(),
      total_runs: totalRuns,
      success_count: successCount,
      failure_count: failureCount,
      consecutive_failures: successful ? 0 : (current?.consecutive_failures || 0) + 1,
      total_items_found: (current?.total_items_found || 0) + (result.items_found || 0),
      total_items_saved: (current?.total_items_saved || 0) + (result.items_saved || 0),
      avg_duration_ms: averageDuration(current?.avg_duration_ms || 0, totalRuns, result.duration_ms || 0),
      last_error: successful ? null : result.error_message || result.errors?.[0]?.message || null,
      updated_at: new Date().toISOString(),
    };

    const upsert = await this.supabase
      .from('job_fetch_source_metrics')
      .upsert([payload], { onConflict: 'source_id' })
      .select()
      .maybeSingle();

    if (upsert.error) {
      this.logger.warn?.(`Unable to upsert fetch metrics: ${upsert.error.message}`);
      return null;
    }

    return upsert.data || null;
  }

  async getLogs({ limit = 50, status = null, sourceId = null } = {}) {
    let query = this.supabase
      .from('job_fetch_logs')
      .select('*, ai_job_sources(name, tier, category)')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);
    if (sourceId) query = query.eq('source_id', sourceId);

    const result = await query;
    return dataOrThrow(result, 'Fetch logs query');
  }

  async getStatus() {
    const [sourcesResult, metricsResult, logsResult, failuresResult] = await Promise.all([
      this.supabase
        .from('ai_job_sources')
        .select('id,name,url,tier,category,is_active,last_checked,check_count,items_found')
        .order('tier')
        .order('name'),
      this.supabase
        .from('job_fetch_source_metrics')
        .select('*')
        .order('updated_at', { ascending: false }),
      this.supabase
        .from('job_fetch_logs')
        .select('id,source_id,started_at,completed_at,status,items_found,items_saved,duration_ms,errors')
        .order('started_at', { ascending: false })
        .limit(20),
      this.supabase
        .from('fetch_failures')
        .select('id,source_id,url,error_message,created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const sources = dataOrThrow(sourcesResult, 'Sources query');
    const metrics = dataOrThrow(metricsResult, 'Metrics query');
    const recentLogs = dataOrThrow(logsResult, 'Recent logs query');
    const recentFailures = dataOrThrow(failuresResult, 'Recent failures query');
    const activeSources = sources.filter((source) => source.is_active);
    const totalRuns = metrics.reduce((sum, metric) => sum + (metric.total_runs || 0), 0);
    const successCount = metrics.reduce((sum, metric) => sum + (metric.success_count || 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      totalSources: sources.length,
      activeSources: activeSources.length,
      totalRuns,
      successRate: totalRuns > 0 ? Number(((successCount / totalRuns) * 100).toFixed(2)) : null,
      lastRun: recentLogs[0] || null,
      sources,
      metrics,
      recentLogs,
      recentFailures,
    };
  }
}
