const normalize = (value = '') => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const tokenize = (value = '') => normalize(value)
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((word) => word.length > 2);

const normalizeUrl = (value = '') => {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch (_error) {
    return normalize(value);
  }
};

export const textSimilarity = (a = '', b = '') => {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return Math.round((intersection / union) * 100);
};

const orgSimilarity = (a = '', b = '') => {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 85;
  return textSimilarity(left, right);
};

const exactUrlRisk = (draft = {}, candidate = {}) => {
  const draftUrls = [
    draft.notification_pdf,
    draft.apply_link,
    draft.official_website,
    draft.source_url,
    draft.canonical_url,
  ].map(normalizeUrl).filter(Boolean);
  const candidateUrls = [
    candidate.notification_pdf,
    candidate.apply_link,
    candidate.canonical_url,
    candidate.source_url,
    candidate.notification_url,
    candidate.pdf_url,
  ].map(normalizeUrl).filter(Boolean);

  const matchedUrl = draftUrls.find((url) => candidateUrls.includes(url));
  return matchedUrl ? { risk: 100, matchedUrl } : { risk: 0, matchedUrl: null };
};

const scoreCandidate = (draft = {}, candidate = {}, sourceTable = '') => {
  const url = exactUrlRisk(draft, candidate);
  const title = textSimilarity(draft.title, candidate.title);
  const organization = orgSimilarity(draft.organization, candidate.organization);
  const combined = Math.max(
    url.risk,
    Math.round((title * 0.7) + (organization * 0.3)),
  );

  return {
    source_table: sourceTable,
    matched_id: candidate.id || null,
    title: candidate.title || '',
    organization: candidate.organization || '',
    title_similarity: title,
    organization_similarity: organization,
    matched_url: url.matchedUrl,
    risk: combined,
  };
};

const dataOrEmpty = (result) => (result.error ? [] : (result.data || []));

export default class DuplicateAnalyzer {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('DuplicateAnalyzer requires a Supabase client.');
    this.supabase = supabase;
    this.limit = options.limit || 75;
  }

  async loadCandidates() {
    const [jobs, drafts, raw] = await Promise.all([
      this.supabase
        .from('jobs')
        .select('id,title,organization,canonical_url,notification_pdf,apply_link')
        .order('created_at', { ascending: false })
        .limit(this.limit),
      this.supabase
        .from('ai_job_drafts')
        .select('id,generated_data,status')
        .order('created_at', { ascending: false })
        .limit(this.limit),
      this.supabase
        .from('raw_job_notifications')
        .select('id,title,organization,notification_url,pdf_url')
        .order('created_at', { ascending: false })
        .limit(this.limit),
    ]);

    return [
      ...dataOrEmpty(jobs).map((item) => ({ ...item, source_table: 'jobs' })),
      ...dataOrEmpty(drafts).map((item) => ({
        id: item.id,
        source_table: 'ai_job_drafts',
        title: item.generated_data?.title || '',
        organization: item.generated_data?.organization || '',
        canonical_url: item.generated_data?.canonical_url || '',
        notification_pdf: item.generated_data?.notification_pdf || '',
        apply_link: item.generated_data?.apply_link || '',
        status: item.status,
      })),
      ...dataOrEmpty(raw).map((item) => ({ ...item, source_table: 'raw_job_notifications' })),
    ];
  }

  async analyze(draft = {}, options = {}) {
    const candidates = await this.loadCandidates();
    const excludedRawId = options.rawNotificationId || draft.raw_notification_id || null;
    const excludedDraftId = options.draftId || null;
    const evidence = candidates
      .filter((candidate) => !(
        (excludedRawId && candidate.source_table === 'raw_job_notifications' && candidate.id === excludedRawId) ||
        (excludedDraftId && candidate.source_table === 'ai_job_drafts' && candidate.id === excludedDraftId)
      ))
      .map((candidate) => scoreCandidate(draft, candidate, candidate.source_table))
      .filter((item) => item.risk >= 35)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 10);

    const duplicateRisk = evidence[0]?.risk || 0;
    return {
      duplicateRisk,
      isDuplicateLikely: duplicateRisk >= 80,
      evidence,
    };
  }

  async recordLogs({ queueItemId = null, draftId = null, analysis = {} } = {}) {
    const rows = (analysis.evidence || []).slice(0, 5).map((item) => ({
      queue_item_id: queueItemId,
      draft_id: draftId,
      check_type: item.matched_url ? 'url' : 'title',
      matched_job_id: item.source_table === 'jobs' ? item.matched_id : null,
      similarity: item.risk,
      is_duplicate: item.risk >= 80,
      details: item,
      resolved: false,
    }));

    if (!rows.length) return [];
    const result = await this.supabase.from('ai_duplicate_log').insert(rows).select();
    if (result.error) return [];
    return result.data || [];
  }
}
