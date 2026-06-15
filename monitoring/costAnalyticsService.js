import { countBy, dataOrEmpty, dateBucket, daysAgoIso, safeNumber } from './monitoringUtils.js';

const DEFAULT_COST_PER_1K_TOKENS = {
  cerebras: 0.0,
  openrouter: 0.0,
  groq: 0.0,
  gemini: 0.00035,
  huggingface: 0.0,
  deepseek: 0.00014,
  unknown: 0.00025,
};

export default class CostAnalyticsService {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('CostAnalyticsService requires a Supabase client.');
    this.supabase = supabase;
    this.costPer1kTokens = { ...DEFAULT_COST_PER_1K_TOKENS, ...(options.costPer1kTokens || {}) };
  }

  providerCost(providerName = 'unknown', tokens = 0) {
    const key = String(providerName || 'unknown').toLowerCase();
    const costPer1k = this.costPer1kTokens[key] ?? this.costPer1kTokens.unknown;
    return (safeNumber(tokens) / 1000) * costPer1k;
  }

  async getCostAnalytics({ days = 30 } = {}) {
    const since = daysAgoIso(days);
    const [usageRes, draftsRes, providersRes] = await Promise.all([
      this.supabase
        .from('ai_generation_usage')
        .select('usage_date,generation_count,provider_test_count,last_generation_at,last_provider_test_at')
        .gte('usage_date', since.slice(0, 10))
        .order('usage_date', { ascending: false })
        .limit(1000),
      this.supabase
        .from('ai_job_drafts')
        .select('id,ai_provider,tokens_used,generation_ms,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000),
      this.supabase
        .from('ai_provider_settings')
        .select('provider_name,model,stats,is_active,priority')
        .order('priority'),
    ]);

    const usage = dataOrEmpty(usageRes);
    const drafts = dataOrEmpty(draftsRes);
    const providers = dataOrEmpty(providersRes);
    const totalTokens = drafts.reduce((sum, draft) => sum + safeNumber(draft.tokens_used), 0);
    const estimatedSpend = drafts.reduce((sum, draft) => (
      sum + this.providerCost(draft.ai_provider, draft.tokens_used)
    ), 0);
    const requests = usage.reduce((sum, row) => sum + safeNumber(row.generation_count), 0) || drafts.length;
    const dailyCost = drafts.reduce((counts, draft) => {
      const bucket = dateBucket(draft.created_at, 'day');
      counts[bucket] = (counts[bucket] || 0) + this.providerCost(draft.ai_provider, draft.tokens_used);
      return counts;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      totals: {
        tokensUsed: totalTokens,
        requests,
        providerTests: usage.reduce((sum, row) => sum + safeNumber(row.provider_test_count), 0),
        estimatedSpend: Number(estimatedSpend.toFixed(6)),
        dailyCostAverage: Number((estimatedSpend / Math.max(1, days)).toFixed(6)),
        projectedMonthlyCost: Number(((estimatedSpend / Math.max(1, days)) * 30).toFixed(6)),
      },
      providerUsage: countBy(drafts, (draft) => draft.ai_provider || 'unknown'),
      providerSpend: providers.map((provider) => {
        const providerDrafts = drafts.filter((draft) => draft.ai_provider === provider.provider_name);
        const tokens = providerDrafts.reduce((sum, draft) => sum + safeNumber(draft.tokens_used), 0);
        return {
          providerName: provider.provider_name,
          model: provider.model || '',
          isActive: Boolean(provider.is_active),
          requests: providerDrafts.length,
          tokensUsed: tokens,
          estimatedSpend: Number(this.providerCost(provider.provider_name, tokens).toFixed(6)),
        };
      }),
      dailyCost: Object.fromEntries(Object.entries(dailyCost).map(([day, cost]) => [day, Number(cost.toFixed(6))])),
      monthlyCost: Object.entries(dailyCost).reduce((months, [day, cost]) => {
        const month = day.slice(0, 7);
        months[month] = Number(((months[month] || 0) + cost).toFixed(6));
        return months;
      }, {}),
      assumptions: {
        costPer1kTokens: this.costPer1kTokens,
        note: 'Costs are estimates from draft tokens_used and configured provider rate assumptions.',
      },
    };
  }
}
