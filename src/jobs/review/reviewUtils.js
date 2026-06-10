export const DECISION_BANDS = {
  recommendedPublish: 'recommended_publish',
  reviewRecommended: 'review_recommended',
  manualReviewRequired: 'manual_review_required',
  blocked: 'blocked',
};

export const REVIEW_VERSION = 'phase3-review-v1';
export const VERIFICATION_VERSION = 'phase3-verification-v1';
export const SCORING_VERSION = 'phase3-scoring-v1';

export const clampScore = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export const compact = (value = '') => String(value ?? '').replace(/\s+/g, ' ').trim();

export const normalizeText = (value = '') => compact(value).toLowerCase();

export const isMissing = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === 'object') return Object.keys(value).length === 0;
  const text = compact(value);
  return !text || /^not specified/i.test(text) || /^n\/a$/i.test(text);
};

export const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

export const unique = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeText(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const normalizeUrl = (value = '') => {
  const raw = compact(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
      .forEach((param) => parsed.searchParams.delete(param));
    const normalized = parsed.toString();
    return normalized.endsWith('/') && parsed.pathname !== '/' ? normalized.slice(0, -1) : normalized;
  } catch (_error) {
    return '';
  }
};

export const hostnameOf = (value = '') => {
  const normalized = normalizeUrl(value);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_error) {
    return '';
  }
};

export const domainsMatch = (left = '', right = '') => {
  const a = hostnameOf(left) || String(left || '').replace(/^www\./i, '').toLowerCase();
  const b = hostnameOf(right) || String(right || '').replace(/^www\./i, '').toLowerCase();
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
};

export const extractUrls = (text = '') => (
  compact(text)
    .match(/https?:\/\/[^\s"'<>),]+/gi) || []
).map(normalizeUrl).filter(Boolean);

export const evidenceTextFromContext = (context = {}) => {
  const raw = context.rawNotification || {};
  const queue = context.queueItem || {};
  const source = context.source || {};
  return [
    raw.title,
    raw.organization,
    raw.source_name,
    raw.notification_url,
    raw.pdf_url,
    raw.raw_text,
    raw.raw_content,
    raw.raw_html,
    queue.title,
    queue.organization,
    queue.source_url,
    queue.raw_input,
    source.name,
    source.url,
    source.category,
    source.description,
  ].filter(Boolean).join(' ');
};

export const evidenceUrlsFromContext = (context = {}) => {
  const raw = context.rawNotification || {};
  const queue = context.queueItem || {};
  const source = context.source || {};
  return unique([
    raw.notification_url,
    raw.pdf_url,
    queue.source_url,
    source.url,
    ...extractUrls(evidenceTextFromContext(context)),
  ].map(normalizeUrl).filter(Boolean));
};

export const containsEvidence = (evidenceText = '', value = '') => {
  if (isMissing(value)) return true;
  const evidence = normalizeText(evidenceText);
  const needle = normalizeText(value);
  if (!needle) return true;
  if (evidence.includes(needle)) return true;

  const numeric = needle.match(/\d[\d,]*/g) || [];
  if (numeric.length > 0) {
    return numeric.some((item) => evidence.includes(item.replace(/,/g, '')));
  }

  const words = needle.split(/\s+/).filter((word) => word.length > 3);
  if (words.length < 2) return false;
  const matched = words.filter((word) => evidence.includes(word)).length;
  return matched / words.length >= 0.7;
};

export const parseIsoDate = (value = '') => {
  const text = compact(value);
  if (!text) return '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(`${text}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return '';
  }
  return text;
};

export const dateEvidenceAliases = (isoDate = '') => {
  const iso = parseIsoDate(isoDate);
  if (!iso) return [];
  const [year, month, day] = iso.split('-');
  return [
    iso,
    `${day}-${month}-${year}`,
    `${day}/${month}/${year}`,
    `${day}.${month}.${year}`,
    `${Number(day)}-${Number(month)}-${year}`,
    `${Number(day)}/${Number(month)}/${year}`,
  ];
};

export const dateAppearsInEvidence = (evidenceText = '', isoDate = '') => {
  const evidence = normalizeText(evidenceText);
  return dateEvidenceAliases(isoDate).some((alias) => evidence.includes(alias.toLowerCase()));
};

export const textSimilarity = (left = '', right = '') => {
  const a = normalizeText(left).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const b = normalizeText(right).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  if (!a.length || !b.length) return 0;
  const leftSet = new Set(a);
  const rightSet = new Set(b);
  const intersection = [...leftSet].filter((word) => rightSet.has(word)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return clampScore((intersection / union) * 100);
};

export const hasRawEvidence = (context = {}) => {
  const evidence = evidenceTextFromContext(context);
  return compact(evidence).length >= 20 || evidenceUrlsFromContext(context).length > 0;
};

export const severityRank = (severity = 'low') => ({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}[severity] || 1);
