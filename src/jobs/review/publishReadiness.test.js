import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePublishReadiness } from './publishReadiness.js';

const highQuality = {
  extractionScore: 95,
  seo: 92,
  completenessScore: 94,
  duplicateRisk: 5,
  freshness: 90,
};

test('PublishReadiness recommends publish at 90+', () => {
  const result = calculatePublishReadiness({
    qualityScores: highQuality,
    verification: { verificationScore: 96, sourceConfidence: 95, blockingIssues: [] },
  });

  assert.equal(result.decisionBand, 'recommended_publish');
  assert.ok(result.publishReadiness >= 90);
});

test('PublishReadiness uses review_recommended band for 75-89', () => {
  const result = calculatePublishReadiness({
    qualityScores: { extractionScore: 82, seo: 78, completenessScore: 80, duplicateRisk: 10, freshness: 80 },
    verification: { verificationScore: 82, sourceConfidence: 75, blockingIssues: [] },
  });

  assert.equal(result.decisionBand, 'review_recommended');
  assert.ok(result.publishReadiness >= 75 && result.publishReadiness < 90);
});

test('PublishReadiness blocks duplicate risk and critical verification blockers', () => {
  const duplicate = calculatePublishReadiness({
    qualityScores: highQuality,
    verification: { verificationScore: 95, sourceConfidence: 95, blockingIssues: [] },
    duplicateRisk: 80,
  });
  const invalidDate = calculatePublishReadiness({
    qualityScores: highQuality,
    verification: {
      verificationScore: 60,
      sourceConfidence: 95,
      blockingIssues: [{ code: 'invalid_critical_date', severity: 'critical' }],
    },
  });

  assert.equal(duplicate.decisionBand, 'blocked');
  assert.equal(invalidDate.decisionBand, 'blocked');
});

test('PublishReadiness blocks ungrounded critical fact blockers', () => {
  const result = calculatePublishReadiness({
    qualityScores: highQuality,
    verification: {
      verificationScore: 70,
      sourceConfidence: 90,
      blockingIssues: [{ code: 'ungrounded_salary', severity: 'critical' }],
    },
  });

  assert.equal(result.decisionBand, 'blocked');
});
