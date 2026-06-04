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

export const runQualityGate = ({ extraction = {}, draft = {}, duplicateAnalysis = {} } = {}) => {
  const extractionScore = scoreExtraction(extraction);
  const seoScore = scoreSeo(draft);
  const completenessScore = scoreCompleteness(draft);
  const duplicateRisk = Number(duplicateAnalysis.duplicateRisk || 0);
  const duplicateScore = bounded(100 - duplicateRisk);
  const finalScore = bounded(
    (extractionScore * 0.35) +
    (seoScore * 0.2) +
    (completenessScore * 0.3) +
    (duplicateScore * 0.15),
  );

  let status =
    finalScore < 60 ? 'rejected' :
    finalScore < 80 ? 'pending_review' :
    'approved';
  if (status === 'approved' && duplicateRisk >= 80) {
    status = 'pending_review';
  }

  const queueStatus = finalScore < 60 ? 'rejected' : 'drafted';
  const issues = [];
  if (extractionScore < 60) issues.push('Extraction is missing important required fields.');
  if (seoScore < 60) issues.push('SEO metadata is incomplete.');
  if (completenessScore < 60) issues.push('Draft content is incomplete.');
  if (duplicateRisk >= 80) issues.push('High duplicate risk detected.');
  if (finalScore < 60) issues.push('Final Phase 2 score is below the rejection threshold.');

  return {
    extractionScore,
    seoScore,
    completenessScore,
    duplicateScore,
    duplicateRisk,
    finalScore,
    status,
    queueStatus,
    label: status === 'approved' ? 'Approved Draft' : status === 'pending_review' ? 'Manual Review' : 'Rejected',
    issues,
    duplicateEvidence: duplicateAnalysis.evidence || [],
    content: completenessScore,
    seo: seoScore,
    eeat: extractionScore,
    adsense: finalScore >= 60 ? 90 : 70,
    spamRisk: 0,
    freshness: 85,
    overall: finalScore,
  };
};

export default runQualityGate;
