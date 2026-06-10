import AutoCategoryEngine from './autoCategoryEngine.js';
import FactVerifier from './factVerifier.js';
import { calculatePublishReadiness } from './publishReadiness.js';
import TagEngine from './tagEngine.js';
import { REVIEW_VERSION, SCORING_VERSION, clampScore, severityRank } from './reviewUtils.js';

const uniqueWarnings = (warnings = []) => {
  const seen = new Set();
  return warnings
    .filter(Boolean)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .filter((warning) => {
      const key = `${warning.code}:${warning.field}:${warning.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const recommendationForBand = (band) => ({
  recommended_publish: 'Ready for fast human review and conversion to a job draft.',
  review_recommended: 'Review warnings before converting to a job draft.',
  manual_review_required: 'Manual field-by-field review is required before conversion.',
  blocked: 'Do not convert or publish until blocking issues are resolved or explicitly overridden.',
}[band] || 'Review required.');

export class ReviewEngine {
  constructor(options = {}) {
    this.factVerifier = options.factVerifier || new FactVerifier();
    this.categoryEngine = options.categoryEngine || new AutoCategoryEngine();
    this.tagEngine = options.tagEngine || new TagEngine();
  }

  review(context = {}) {
    const draft = context.draft || {};
    const qualityScores = draft.quality_scores || context.qualityScores || {};
    const duplicateRisk = context.duplicateRisk ?? qualityScores.duplicateRisk ?? context.queueItem?.duplicate_check?.risk_score ?? 0;

    const verification = context.verification || this.factVerifier.verify(context);
    const categorySuggestion = context.categorySuggestion || this.categoryEngine.categorize(context);
    const tagSuggestion = context.tagSuggestion || this.tagEngine.generate(context);
    const readiness = calculatePublishReadiness({
      qualityScores,
      verification,
      duplicateRisk,
    });

    const warnings = uniqueWarnings([
      ...(verification.warnings || []),
      ...(verification.blockingIssues || []),
      ...(categorySuggestion.warnings || []),
      ...(tagSuggestion.warnings || []),
      ...(qualityScores.issues || []).map((message) => ({
        severity: 'medium',
        code: 'phase2_quality_issue',
        field: 'quality_scores',
        message,
      })),
    ]);

    const confidence = clampScore(
      (readiness.publishReadiness * 0.35) +
      ((verification.verificationScore || 0) * 0.30) +
      ((verification.sourceConfidence || 0) * 0.15) +
      ((categorySuggestion.confidence || 0) * 0.10) +
      ((tagSuggestion.confidence || 0) * 0.10) -
      (warnings.filter((item) => item.severity === 'critical').length * 20),
    );

    const recommendations = [
      {
        severity: readiness.decisionBand === 'blocked' ? 'critical' : 'low',
        code: 'decision_band',
        message: recommendationForBand(readiness.decisionBand),
      },
    ];

    if (categorySuggestion.primaryCategory) {
      recommendations.push({
        severity: 'low',
        code: 'category_suggestion',
        message: `Suggested category: ${categorySuggestion.primaryCategory}.`,
      });
    }

    if (tagSuggestion.tags?.length) {
      recommendations.push({
        severity: 'low',
        code: 'tag_suggestion',
        message: `Suggested tags: ${tagSuggestion.tags.slice(0, 8).join(', ')}.`,
      });
    }

    return {
      publishReadiness: readiness.publishReadiness,
      confidence,
      decisionBand: readiness.decisionBand,
      subscores: readiness.subscores,
      warnings,
      recommendations,
      categorySuggestion,
      tagSuggestion,
      verification,
      duplicateRisk: readiness.duplicateRisk,
      reviewVersion: REVIEW_VERSION,
      scoringVersion: SCORING_VERSION,
    };
  }
}

export const reviewDraft = (context, options) => new ReviewEngine(options).review(context);

export default ReviewEngine;
