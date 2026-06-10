export const nowIso = () => new Date().toISOString();

export const clampPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const avg = (values = []) => {
  const nums = values.map((value) => safeNumber(value, NaN)).filter(Number.isFinite);
  if (!nums.length) return 0;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
};

export const percentile = (values = [], percentileValue = 95) => {
  const nums = values.map((value) => safeNumber(value, NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const index = Math.ceil((percentileValue / 100) * nums.length) - 1;
  return Math.round(nums[Math.max(0, Math.min(nums.length - 1, index))]);
};

export const rate = (part, total) => {
  const denominator = safeNumber(total);
  if (denominator <= 0) return 0;
  return clampPercent((safeNumber(part) / denominator) * 100);
};

export const countBy = (items = [], keyFn = (item) => item) => items.reduce((counts, item) => {
  const key = keyFn(item) || 'unknown';
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

export const daysAgoIso = (days = 30) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - safeNumber(days, 30));
  return date.toISOString();
};

export const ageHours = (isoDate) => {
  if (!isoDate) return 0;
  const time = new Date(isoDate).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round(((Date.now() - time) / 3_600_000) * 10) / 10);
};

export const dateBucket = (isoDate, granularity = 'day') => {
  const date = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(date.getTime())) return 'unknown';
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  if (granularity === 'month') return `${yyyy}-${mm}`;
  if (granularity === 'week') {
    const temp = new Date(Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((temp - yearStart) / 86_400_000) + 1) / 7);
    return `${temp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return `${yyyy}-${mm}-${dd}`;
};

export const dataOrEmpty = (result) => (result?.error ? [] : (result?.data || []));

export const pickProviderPublicFields = (provider = {}) => ({
  id: provider.id,
  providerName: provider.provider_name,
  model: provider.model || '',
  priority: provider.priority ?? null,
  isActive: Boolean(provider.is_active),
  baseUrl: provider.base_url || null,
  healthStatus: provider.health_status || 'unknown',
  lastTested: provider.last_tested || null,
  lastLatencyMs: provider.last_latency_ms ?? null,
  updatedAt: provider.updated_at || null,
  availableModelsCount: Array.isArray(provider.available_models) ? provider.available_models.length : 0,
});
