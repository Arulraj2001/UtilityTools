import { avg, countBy, dataOrEmpty, safeNumber } from './monitoringUtils.js';

const distribution = (values = []) => values.reduce((counts, value) => {
  const score = safeNumber(value);
  const band =
    score >= 90 ? '90_100' :
    score >= 75 ? '75_89' :
    score >= 50 ? '50_74' :
    score > 0 ? '1_49' :
    '0';
  counts[band] = (counts[band] || 0) + 1;
  return counts;
}, {});

export default class DraftQualityService {
  constructor(supabase) {
    if (!supabase) throw new Error('DraftQualityService requires a Supabase client.');
    this.supabase = supabase;
  }

  async getQualityMetrics() {
    const [draftsRes, reviewsRes, verificationsRes] = await Promise.all([
      this.supabase
        .from('ai_job_drafts')
        .select('id,status,quality_scores,readiness_score,confidence_score,created_at')
        .order('created_at', { ascending: false })
        .limit(2000),
      this.supabase
        .from('ai_review_results')
        .select('id,draft_id,publish_readiness,confidence,decision_band,warnings,is_stale,created_at')
        .eq('is_stale', false)
        .order('created_at', { ascending: false })
        .limit(2000),
      this.supabase
        .from('ai_fact_verifications')
        .select('id,draft_id,verification_score,source_confidence,blocking_issues,warnings,verified_at')
        .order('verified_at', { ascending: false })
        .limit(2000),
    ]);

    const drafts = dataOrEmpty(draftsRes);
    const reviews = dataOrEmpty(reviewsRes);
    const verifications = dataOrEmpty(verificationsRes);
    const qualityScores = drafts.map((draft) => (
      draft.quality_scores?.overall ??
      draft.quality_scores?.finalScore ??
      draft.readiness_score ??
      0
    ));
    const duplicateRisks = drafts.map((draft) => draft.quality_scores?.duplicateRisk ?? 0);
    const readinessScores = reviews.map((review) => review.publish_readiness);
    const confidenceScores = reviews.map((review) => review.confidence);
    const validationFailures = verifications.reduce((sum, verification) => (
      sum + (Array.isArray(verification.blocking_issues) ? verification.blocking_issues.length : 0)
    ), 0);

    return {
      generatedAt: new Date().toISOString(),
      averages: {
        qualityScore: avg(qualityScores),
        duplicateRisk: avg(duplicateRisks),
        readiness: avg(readinessScores),
        confidence: avg(confidenceScores),
        verificationScore: avg(verifications.map((item) => item.verification_score)),
        sourceConfidence: avg(verifications.map((item) => item.source_confidence)),
      },
      distributions: {
        approval: countBy(drafts, (draft) => draft.status || 'unknown'),
        rejection: {
          rejected: drafts.filter((draft) => draft.status === 'rejected').length,
          needsRevision: drafts.filter((draft) => draft.status === 'needs_revision').length,
          blocked: reviews.filter((review) => review.decision_band === 'blocked').length,
        },
        readiness: distribution(readinessScores),
        confidence: distribution(confidenceScores),
        decisionBands: countBy(reviews, (review) => review.decision_band || 'unknown'),
      },
      validationFailures,
      warningCount: reviews.reduce((sum, review) => sum + (Array.isArray(review.warnings) ? review.warnings.length : 0), 0),
      counts: {
        drafts: drafts.length,
        reviews: reviews.length,
        verifications: verifications.length,
      },
    };
  }
}
