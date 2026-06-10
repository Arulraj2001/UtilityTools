import { DECISION_BANDS, clampScore } from './reviewUtils.js';

const criticalBlockerCodes = new Set([
  'hallucinated_url',
  'organization_mismatch',
  'duplicate_url',
  'invalid_critical_date',
  'no_raw_evidence',
  'ungrounded_vacancies',
  'ungrounded_salary',
  'ungrounded_qualification',
  'ungrounded_age',
]);

export const decisionBandForScore = (score) => {
  if (score >= 90) return DECISION_BANDS.recommendedPublish;
  if (score >= 75) return DECISION_BANDS.reviewRecommended;
  return DECISION_BANDS.manualReviewRequired;
};

export const calculatePublishReadiness = ({
  qualityScores = {},
  verification = {},
  duplicateRisk,
  sourceConfidence,
  freshness,
} = {}) => {
  const extractionQuality = clampScore(qualityScores.extractionScore ?? qualityScores.eeat ?? qualityScores.content ?? qualityScores.overall);
  const seoQuality = clampScore(qualityScores.seoScore ?? qualityScores.seo);
  const completeness = clampScore(qualityScores.completenessScore ?? qualityScores.content ?? qualityScores.overall);
  const risk = clampScore(duplicateRisk ?? qualityScores.duplicateRisk ?? 0);
  const duplicateSafety = clampScore(100 - risk);
  const verificationScore = clampScore(verification.verificationScore ?? qualityScores.verificationScore ?? 0);
  const source = clampScore(sourceConfidence ?? verification.sourceConfidence ?? 0);
  const fresh = clampScore(freshness ?? qualityScores.freshness ?? 75);

  const publishReadiness = clampScore(
    (extractionQuality * 0.18) +
    (seoQuality * 0.14) +
    (completeness * 0.14) +
    (duplicateSafety * 0.14) +
    (verificationScore * 0.30) +
    (source * 0.06) +
    (fresh * 0.04),
  );

  const blockingIssues = verification.blockingIssues || [];
  const hasCriticalBlocker = blockingIssues.some((item) => criticalBlockerCodes.has(item.code));
  const forcedBlocked = hasCriticalBlocker || risk >= 80;

  return {
    publishReadiness,
    decisionBand: forcedBlocked ? DECISION_BANDS.blocked : decisionBandForScore(publishReadiness),
    duplicateSafety,
    duplicateRisk: risk,
    subscores: {
      extractionQuality,
      seoQuality,
      completeness,
      duplicateSafety,
      verificationScore,
      sourceConfidence: source,
      freshness: fresh,
    },
    blockingIssues: [
      ...blockingIssues,
      ...(risk >= 80 ? [{ code: 'duplicate_risk_high', severity: 'critical', field: 'duplicateRisk', message: 'Duplicate risk is 80 or higher.' }] : []),
    ],
  };
};

export default calculatePublishReadiness;
