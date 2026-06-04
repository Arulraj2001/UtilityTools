import { callAI, classifyProviderError } from '../../../server/ai/providerCore.js';

export const PHASE2_PROVIDER_ORDER = [
  'cerebras',
  'openrouter',
  'groq',
  'gemini',
  'deepseek',
];

const noopLogger = {
  warn: () => {},
  error: () => {},
};

const redact = (value = '') => String(value || '')
  .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
  .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]')
  .replace(/("api_key"\s*:\s*")[^"]+/gi, '$1[REDACTED]')
  .slice(0, 2_000);

const providerRank = (providerName = '') => {
  const index = PHASE2_PROVIDER_ORDER.indexOf(String(providerName || '').toLowerCase());
  return index >= 0 ? index + 1 : 99;
};

const healthPenalty = (provider = {}) => {
  const status = String(provider.health_status || 'unknown').toLowerCase();
  const lastError = String(provider.stats?.last_error || '').toLowerCase();

  if (status === 'healthy') return 0;
  if (status === 'unknown') return 8;
  if (status === 'degraded') return 20;
  if (/rate.?limit|timeout|network|fetch failed/.test(lastError)) return 30;
  if (/quota|insufficient balance|payment required|unauthorized|forbidden|invalid api key|permission/.test(lastError)) return 70;
  if (status === 'down') return 60;
  return 15;
};

export const sortPhase2Providers = (providers = []) => (
  [...providers]
    .filter((provider) => (
      provider?.is_active &&
      String(provider.provider_name || '').trim() &&
      String(provider.api_key || '').trim() &&
      PHASE2_PROVIDER_ORDER.includes(String(provider.provider_name).toLowerCase())
    ))
    .map((provider) => ({
      ...provider,
      provider_name: String(provider.provider_name).toLowerCase(),
      phase2_priority: providerRank(provider.provider_name),
    }))
    .sort((a, b) => {
      const penaltyDelta = healthPenalty(a) - healthPenalty(b);
      if (penaltyDelta !== 0) return penaltyDelta;
      return providerRank(a.provider_name) - providerRank(b.provider_name);
    })
    .map((provider, index) => ({
      ...provider,
      priority: index + 1,
    }))
);

const dataOrThrow = (result, operation) => {
  if (result.error) {
    const error = new Error(`${operation} failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data || [];
};

const updateProviderStats = async (supabase, providerId, { success, durationMs = 0, error = null } = {}) => {
  if (!providerId) return;
  const current = await supabase
    .from('ai_provider_settings')
    .select('stats')
    .eq('id', providerId)
    .maybeSingle();

  if (current.error || !current.data) return;

  const prev = current.data.stats || {};
  const requests = Number(prev.requests || 0) + 1;
  const successes = Number(prev.successes || 0) + (success ? 1 : 0);
  const failures = Number(prev.failures || 0) + (success ? 0 : 1);
  const previousAverage = Number(prev.avg_latency_ms || 0);
  const avgLatency = Math.round(((previousAverage * (requests - 1)) + Number(durationMs || 0)) / requests);

  await supabase
    .from('ai_provider_settings')
    .update({
      stats: {
        ...prev,
        requests,
        successes,
        failures,
        avg_latency_ms: avgLatency,
        last_error: success ? null : redact(error || 'Provider failed'),
      },
      last_latency_ms: Number(durationMs || 0),
      last_tested: new Date().toISOString(),
      health_status: success ? 'healthy' : (failures >= 3 ? 'down' : 'degraded'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);
};

const logProviderFailure = async (supabase, attempt = {}, context = {}) => {
  const payload = {
    provider_name: attempt.providerName || attempt.provider?.provider_name || 'unknown',
    error: redact(attempt.error || 'Provider failed'),
    details: {
      phase: context.phase || 'phase2_ai_pipeline',
      queue_item_id: context.queueItemId || null,
      error_type: attempt.errorType || null,
      model: attempt.model || null,
    },
    duration_ms: Number(attempt.durationMs || 0),
    occurred_at: new Date().toISOString(),
  };

  const result = await supabase.from('ai_provider_failures').insert([payload]);
  if (result.error) {
    await supabase.from('analytics_events').insert([{
      event_type: 'provider_failure',
      event_data: payload,
      page_url: '',
    }]).catch?.(() => {});
  }
};

const recordGenerationUsage = async (supabase, adminId) => {
  if (!adminId) return;
  const usageDate = new Date().toISOString().slice(0, 10);
  const current = await supabase
    .from('ai_generation_usage')
    .select('*')
    .eq('admin_id', adminId)
    .eq('usage_date', usageDate)
    .maybeSingle();

  if (current.error) return;

  if (current.data?.id) {
    await supabase
      .from('ai_generation_usage')
      .update({
        generation_count: Number(current.data.generation_count || 0) + 1,
        last_generation_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.data.id);
    return;
  }

  await supabase.from('ai_generation_usage').insert([{
    admin_id: adminId,
    usage_date: usageDate,
    generation_count: 1,
    provider_test_count: 0,
    last_generation_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);
};

export default class ProviderSelector {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('ProviderSelector requires a Supabase client.');
    this.supabase = supabase;
    this.logger = options.logger || noopLogger;
    this.timeoutMs = options.timeoutMs || 45_000;
  }

  async loadProviders() {
    const result = await this.supabase
      .from('ai_provider_settings')
      .select('*')
      .eq('is_active', true)
      .order('priority');
    return sortPhase2Providers(dataOrThrow(result, 'Load AI providers'));
  }

  async generate(prompt, options = {}) {
    const providers = options.providers || await this.loadProviders();
    if (!providers.length) {
      const error = new Error('No active Phase 2 AI providers with saved keys.');
      error.code = 'NO_ACTIVE_PHASE2_PROVIDERS';
      throw error;
    }

    const attempts = [];
    const startedAt = Date.now();
    try {
      const result = await callAI(providers, prompt, {
        timeoutMs: options.timeoutMs || this.timeoutMs,
        signal: options.signal,
        onAttempt: async (attempt) => {
          const normalized = {
            provider: attempt.provider,
            providerName: attempt.providerName || attempt.provider?.provider_name || 'unknown',
            model: attempt.model || null,
            ok: Boolean(attempt.ok),
            durationMs: Number(attempt.durationMs || 0),
            tokensUsed: Number(attempt.tokensUsed || 0),
            error: attempt.error || null,
            errorType: attempt.errorType || null,
          };
          attempts.push(normalized);
          await updateProviderStats(this.supabase, attempt.provider?.id, {
            success: normalized.ok,
            durationMs: normalized.durationMs,
            error: normalized.error,
          });
          if (!normalized.ok) {
            await logProviderFailure(this.supabase, normalized, {
              phase: options.phase,
              queueItemId: options.queueItemId,
            });
          }
        },
      });

      await recordGenerationUsage(this.supabase, options.adminId);

      return {
        ...result,
        attempts,
        durationMs: result.durationMs || (Date.now() - startedAt),
      };
    } catch (error) {
      const errorType = classifyProviderError(error);
      this.logger.warn?.(`Phase 2 provider fallback failed: ${redact(error.message)}`);
      error.errorType = error.errorType || errorType;
      error.attempts = attempts.length ? attempts : error.attempts || [];
      throw error;
    }
  }
}
