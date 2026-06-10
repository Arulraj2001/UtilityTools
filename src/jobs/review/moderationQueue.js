import { DECISION_BANDS, clampScore, severityRank } from './reviewUtils.js';

const BAND_ORDER = {
  [DECISION_BANDS.recommendedPublish]: 4,
  [DECISION_BANDS.reviewRecommended]: 3,
  [DECISION_BANDS.manualReviewRequired]: 2,
  [DECISION_BANDS.blocked]: 1,
};

const warningPenalty = (warnings = []) => warnings.reduce((total, warning) => {
  if (warning.severity === 'critical') return total + 35;
  if (warning.severity === 'high') return total + 18;
  if (warning.severity === 'medium') return total + 8;
  return total + 3;
}, 0);

export const calculateModerationPriority = ({
  readiness = 0,
  confidence = 0,
  duplicateRisk = 0,
  freshness = 75,
  warnings = [],
  missingSource = false,
  expiredDeadline = false,
} = {}) => {
  const base =
    (clampScore(readiness) * 0.45) +
    (clampScore(confidence) * 0.30) +
    ((100 - clampScore(duplicateRisk)) * 0.15) +
    (clampScore(freshness) * 0.10);

  const penalty =
    warningPenalty(warnings) +
    (duplicateRisk >= 80 ? 40 : 0) +
    (expiredDeadline ? 25 : 0) +
    (missingSource ? 35 : 0);

  return clampScore(base - penalty);
};

export const buildModerationItem = ({ draft = {}, review = {}, verification = {} } = {}) => {
  const warnings = review.warnings || verification.warnings || [];
  const freshness = review.subscores?.freshness ?? draft.quality_scores?.freshness ?? 75;
  const priority = calculateModerationPriority({
    readiness: review.publishReadiness ?? draft.readiness_score ?? 0,
    confidence: review.confidence ?? draft.confidence_score ?? 0,
    duplicateRisk: review.duplicateRisk ?? draft.quality_scores?.duplicateRisk ?? 0,
    freshness,
    warnings,
    missingSource: (verification.blockingIssues || []).some((item) => item.code === 'no_raw_evidence'),
    expiredDeadline: freshness === 0,
  });

  return {
    draftId: draft.id,
    queueItemId: draft.queue_item_id,
    decisionBand: review.decisionBand || DECISION_BANDS.manualReviewRequired,
    priority,
    readiness: review.publishReadiness ?? draft.readiness_score ?? 0,
    confidence: review.confidence ?? draft.confidence_score ?? 0,
    duplicateRisk: review.duplicateRisk ?? draft.quality_scores?.duplicateRisk ?? 0,
    warningCount: warnings.length,
    maxSeverity: warnings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]?.severity || 'low',
    draft,
    review,
    verification,
  };
};

export const sortModerationQueue = (items = []) => [...items].sort((left, right) => {
  const bandDelta = (BAND_ORDER[right.decisionBand] || 0) - (BAND_ORDER[left.decisionBand] || 0);
  if (bandDelta !== 0) return bandDelta;
  return (right.priority || 0) - (left.priority || 0);
});

export const recordModerationAction = async (supabase, {
  draftId = null,
  jobId = null,
  adminId = null,
  action,
  reasonCode = null,
  notes = null,
  beforeState = null,
  afterState = null,
  metadata = {},
} = {}) => {
  if (!supabase) throw new Error('Supabase client is required for moderation audit.');
  if (!action) throw new Error('Moderation action is required.');

  const payload = {
    draft_id: draftId,
    job_id: jobId,
    admin_id: adminId,
    action,
    reason_code: reasonCode,
    notes,
    before_state: beforeState,
    after_state: afterState,
    metadata,
  };

  const result = await supabase.from('ai_moderation_actions').insert([payload]).select();
  if (result.error) {
    const error = new Error(`Moderation audit insert failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data?.[0] || null;
};

export default {
  calculateModerationPriority,
  buildModerationItem,
  sortModerationQueue,
  recordModerationAction,
};
