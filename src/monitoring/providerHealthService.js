import {
  avg,
  dataOrEmpty,
  daysAgoIso,
  pickProviderPublicFields,
  percentile,
  rate,
  safeNumber,
} from './monitoringUtils.js';

const failureType = (failure = {}) => {
  const details = failure.details || {};
  const text = `${details.error_type || ''} ${failure.error || ''}`.toLowerCase();
  if (/timeout|timed out|abort/.test(text)) return 'timeout';
  if (/quota|rate_limit|rate limit|429/.test(text)) return 'quota';
  if (/auth|unauthorized|401|403|key/.test(text)) return 'auth';
  return details.error_type || 'other';
};

export default class ProviderHealthService {
  constructor(supabase) {
    if (!supabase) throw new Error('ProviderHealthService requires a Supabase client.');
    this.supabase = supabase;
  }

  async getProviderHealth({ days = 30 } = {}) {
    const since = daysAgoIso(days);
    const [providersRes, failuresRes, usageRes] = await Promise.all([
      this.supabase
        .from('ai_provider_settings')
        .select('id,provider_name,model,priority,is_active,base_url,available_models,stats,health_status,last_tested,last_latency_ms,updated_at')
        .order('priority'),
      this.supabase
        .from('ai_provider_failures')
        .select('provider_name,error,details,duration_ms,occurred_at,created_at')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(500),
      this.supabase
        .from('ai_generation_usage')
        .select('usage_date,generation_count,provider_test_count,last_generation_at,last_provider_test_at')
        .gte('usage_date', since.slice(0, 10))
        .order('usage_date', { ascending: false })
        .limit(500),
    ]);

    const providers = dataOrEmpty(providersRes);
    const failures = dataOrEmpty(failuresRes);
    const usage = dataOrEmpty(usageRes);

    const providerMetrics = providers.map((provider) => {
      const stats = provider.stats || {};
      const providerFailures = failures.filter((failure) => failure.provider_name === provider.provider_name);
      const requests = safeNumber(stats.requests);
      const successes = safeNumber(stats.successes);
      const failed = safeNumber(stats.failures, providerFailures.length);
      const durations = [
        ...providerFailures.map((failure) => failure.duration_ms),
        provider.last_latency_ms,
        stats.avg_latency_ms,
      ].filter((value) => safeNumber(value, NaN) >= 0);

      const typeCounts = providerFailures.reduce((counts, failure) => {
        const type = failureType(failure);
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {});

      return {
        ...pickProviderPublicFields(provider),
        status: provider.health_status || (provider.is_active ? 'unknown' : 'inactive'),
        requests,
        successes,
        failures: failed,
        successRate: rate(successes, requests || successes + failed),
        failureRate: rate(failed || providerFailures.length, requests || successes + failed || providerFailures.length),
        averageLatencyMs: safeNumber(stats.avg_latency_ms, avg(durations)),
        p95LatencyMs: percentile(durations, 95),
        timeoutRate: rate(typeCounts.timeout || 0, requests || providerFailures.length),
        quotaFailures: typeCounts.quota || 0,
        authFailures: typeCounts.auth || 0,
        lastSuccess: stats.last_success_at || (provider.health_status === 'healthy' ? provider.last_tested : null),
        lastFailure: providerFailures[0]?.occurred_at || null,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      providers: providerMetrics,
      totals: {
        providers: providerMetrics.length,
        activeProviders: providerMetrics.filter((provider) => provider.isActive).length,
        requests: providerMetrics.reduce((sum, provider) => sum + provider.requests, 0),
        failures: providerMetrics.reduce((sum, provider) => sum + provider.failures, 0),
        generationRequests: usage.reduce((sum, row) => sum + safeNumber(row.generation_count), 0),
        providerTests: usage.reduce((sum, row) => sum + safeNumber(row.provider_test_count), 0),
      },
    };
  }
}
