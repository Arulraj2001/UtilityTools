const compact = (value = '') => String(value ?? '').replace(/\s+/g, ' ').trim();
const present = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  const text = compact(value);
  return Boolean(text) && !/^not specified$/i.test(text);
};

const bounded = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const scoreExtraction = (extraction = {}) => {
  const checks = [
    extraction.title,
    extraction.organization,
    extraction.vacancies,
    extraction.qualification,
    extraction.age_limit,
    extraction.salary,
    extraction.application_mode,
    extraction.selection_process,
    extraction.important_dates,
    extraction.notification_pdf || extraction.official_website,
    extraction.job_location,
    extraction.category,
  ];
  return bounded((checks.filter(present).length / checks.length) * 100);
};

export const scoreSeo = (draft = {}) => {
  let score = 0;
  const titleLength = compact(draft.seo_title).length;
  const descriptionLength = compact(draft.seo_description).length;

  if (titleLength >= 35 && titleLength <= 70) score += 30;
  else if (titleLength > 0) score += 15;
  if (descriptionLength >= 110 && descriptionLength <= 165) score += 30;
  else if (descriptionLength > 0) score += 15;
  if (present(draft.seo_keywords)) score += 15;
  if (present(draft.canonical_url)) score += 10;
  if (present(draft.faq_items)) score += 10;
  if (present(draft.structured_schema)) score += 5;

  return bounded(score);
};

export const scoreCompleteness = (draft = {}) => {
  const checks = [
    draft.title,
    draft.organization,
    draft.short_description,
    draft.full_description,
    draft.eligibility,
    draft.selection_process,
    draft.important_dates,
    draft.notification_pdf || draft.official_website,
    draft.seo_title,
    draft.seo_description,
  ];
  return bounded((checks.filter(present).length / checks.length) * 100);
};

// ── Spam risk scoring ──────────────────────────────────────────────────────────

const BANNED_PHRASES = [
  'apply now before',
  'golden opportunity',
  'dream job',
  'once-in-a-lifetime',
  'limited seats',
  'hurry',
  'don\'t miss',
  'last chance',
  'grab this',
  'act now',
  'guaranteed selection',
  'amazing opportunity',
  'incredible opportunity',
  'in today\'s competitive landscape',
  'in today\'s fast-paced world',
  'this article aims to',
  'in this article we will explore',
  'it goes without saying',
  'needless to say',
  'as we all know',
  'it is worth mentioning',
  'it\'s important to note',
  'delve into',
];

const BANNED_PARAGRAPH_STARTERS = [
  'furthermore',
  'moreover',
  'additionally',
  'in conclusion',
];

/**
 * Scores spam risk from 0 (clean) to 100 (very spammy).
 * Checks banned phrases, keyword stuffing, and paragraph-starter patterns.
 */
export const scoreSpamRisk = (draft = {}) => {
  const fullText = compact(
    `${draft.title || ''} ${draft.short_description || ''} ${draft.full_description || ''}`
  ).toLowerCase();

  if (!fullText || fullText.length < 50) return 0;

  let penalties = 0;

  // Check banned phrases
  for (const phrase of BANNED_PHRASES) {
    if (fullText.includes(phrase)) {
      penalties += 12;
    }
  }

  // Check banned paragraph starters
  const paragraphs = fullText.split(/[\n.!?]+/).map((p) => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    for (const starter of BANNED_PARAGRAPH_STARTERS) {
      if (para.startsWith(starter)) {
        penalties += 8;
      }
    }
  }

  // Keyword stuffing: check if any word appears more than 2x per 300-word block
  const words = fullText.split(/\s+/);
  const blockSize = 300;
  for (let i = 0; i < words.length; i += blockSize) {
    const block = words.slice(i, i + blockSize);
    const freq = {};
    for (const w of block) {
      if (w.length < 4) continue; // skip short words
      freq[w] = (freq[w] || 0) + 1;
    }
    const maxFreq = Math.max(0, ...Object.values(freq));
    if (maxFreq > 6) penalties += 15;
    else if (maxFreq > 4) penalties += 8;
    else if (maxFreq > 3) penalties += 3;
  }

  // Consecutive sentences making the same point (basic: check for very similar consecutive sentences)
  const sentences = fullText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  for (let i = 1; i < sentences.length; i++) {
    const prev = new Set(sentences[i - 1].split(/\s+/));
    const curr = sentences[i].split(/\s+/);
    const overlap = curr.filter((w) => prev.has(w) && w.length > 3).length;
    if (overlap > curr.length * 0.7) {
      penalties += 10;
    }
  }

  return bounded(penalties);
};

// ── Freshness scoring ──────────────────────────────────────────────────────────

const parseFlexibleDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;

  // Check ISO format YYYY-MM-DD
  const isoMatch = text.match(/^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Check Indian format DD/MM/YYYY or DD-MM-YYYY
  const indMatch = text.match(/^\s*(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\s*$/);
  if (indMatch) {
    const day = parseInt(indMatch[1], 10);
    const month = parseInt(indMatch[2], 10) - 1;
    let year = parseInt(indMatch[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Fallback to native parsing
  const cleanedText = text.replace(/,/g, ' ').replace(/\s+/g, ' ');
  const dateObj = new Date(cleanedText);
  if (!Number.isNaN(dateObj.getTime())) return dateObj;

  return null;
};

/**
 * Scores freshness from 0 (stale) to 100 (very fresh).
 * Uses last_date, important_dates, and created_at to determine freshness.
 */
export const scoreFreshness = (draft = {}) => {
  const now = Date.now();
  const dates = [];

  // Gather all available date signals
  if (draft.last_date) {
    const d = parseFlexibleDate(draft.last_date);
    if (d) dates.push(d.getTime());
  }
  if (draft.application_start_date) {
    const d = parseFlexibleDate(draft.application_start_date);
    if (d) dates.push(d.getTime());
  }
  if (Array.isArray(draft.important_dates)) {
    for (const item of draft.important_dates) {
      if (item?.date) {
        const d = parseFlexibleDate(item.date);
        if (d) dates.push(d.getTime());
      }
    }
  }

  if (dates.length === 0) return 50; // Unknown freshness

  // Use the latest date mentioned
  const latestDate = Math.max(...dates);
  const daysDiff = Math.floor((latestDate - now) / (1000 * 60 * 60 * 24));

  // Future dates = fresh (job is upcoming)
  if (daysDiff > 30) return 100;
  if (daysDiff > 7) return 95;
  if (daysDiff > 0) return 85;

  // Past dates = stale
  const daysStale = Math.abs(daysDiff);
  if (daysStale < 7) return 80;
  if (daysStale < 30) return 65;
  if (daysStale < 60) return 45;
  if (daysStale < 90) return 25;
  return 10;
};

// ── Main quality gate ──────────────────────────────────────────────────────────

export const runQualityGate = ({ extraction = {}, draft = {}, duplicateAnalysis = {}, linkVerification = {} } = {}) => {
  const extractionScore = scoreExtraction(extraction);
  const seoScore = scoreSeo(draft);
  const completenessScore = scoreCompleteness(draft);
  const duplicateRisk = Number(duplicateAnalysis.duplicateRisk || 0);
  const duplicateScore = bounded(100 - duplicateRisk);
  const spamRisk = scoreSpamRisk(draft);
  const freshness = scoreFreshness(draft);
  const spamScore = bounded(100 - spamRisk);

  const finalScore = bounded(
    (extractionScore * 0.30) +
    (seoScore * 0.15) +
    (completenessScore * 0.25) +
    (duplicateScore * 0.15) +
    (spamScore * 0.10) +
    (freshness * 0.05),
  );

  let status =
    finalScore < 60 ? 'rejected' :
    finalScore < 80 ? 'pending_review' :
    'approved';
  if (status === 'approved' && duplicateRisk >= 80) {
    status = 'pending_review';
  }
  if (status === 'approved' && spamRisk >= 40) {
    status = 'pending_review';
  }

  // Force to pending_review if critical links are verified as invalid/broken
  const linkFailures = Object.entries(linkVerification || {}).filter(([field, result]) => {
    return ['notification_pdf', 'application_link'].includes(field) && result && !result.ok && !result.skipped;
  });

  if (status === 'approved' && linkFailures.length > 0) {
    status = 'pending_review';
  }

  const queueStatus = finalScore < 60 ? 'rejected' : 'drafted';
  const issues = [];
  if (extractionScore < 60) issues.push('Extraction is missing important required fields.');
  if (seoScore < 60) issues.push('SEO metadata is incomplete.');
  if (completenessScore < 60) issues.push('Draft content is incomplete.');
  if (duplicateRisk >= 80) issues.push('High duplicate risk detected.');
  if (spamRisk >= 40) issues.push('Content contains banned phrases or keyword stuffing patterns.');
  if (freshness < 30) issues.push('Job dates appear stale — verify dates are current.');

  linkFailures.forEach(([field, result]) => {
    issues.push(`Link verification failed for ${field.replace('_', ' ')}: ${result.error || 'Broken Link'}.`);
  });

  if (finalScore < 60) issues.push('Final Phase 2 score is below the rejection threshold.');

  return {
    extractionScore,
    seoScore,
    completenessScore,
    duplicateScore,
    duplicateRisk,
    spamRisk,
    freshness,
    finalScore,
    status,
    queueStatus,
    label: status === 'approved' ? 'Approved Draft' : status === 'pending_review' ? 'Manual Review' : 'Rejected',
    issues,
    duplicateEvidence: duplicateAnalysis.evidence || [],
    content: completenessScore,
    seo: seoScore,
    eeat: extractionScore,
    adsense: finalScore >= 60 && spamRisk < 30 ? 90 : finalScore >= 60 ? 75 : 50,
    overall: finalScore,
    linkVerification,
  };
};

export default runQualityGate;
