import test from 'node:test';
import assert from 'node:assert/strict';
import ReviewEngine from './reviewEngine.js';

test('ReviewEngine returns explainable blocked decision for hallucinated facts', () => {
  const result = new ReviewEngine().review({
    draft: {
      id: 'draft-1',
      quality_scores: {
        extractionScore: 95,
        seo: 90,
        completenessScore: 92,
        duplicateRisk: 0,
        freshness: 90,
      },
      generated_data: {
        title: 'UPSC Civil Services 2026',
        organization: 'Union Public Service Commission',
        official_website: 'https://upsc.gov.in',
        apply_link: 'https://fake-example.test/apply',
        notification_pdf: 'https://upsc.gov.in/notice.pdf',
        important_dates: [{ event: 'Last date', date: '2026-04-30' }],
        category: 'UPSC',
      },
    },
    rawNotification: {
      id: 'raw-1',
      organization: 'Union Public Service Commission',
      notification_url: 'https://upsc.gov.in',
      pdf_url: 'https://upsc.gov.in/notice.pdf',
      raw_text: 'UPSC Civil Services 2026. Last date 30/04/2026. Notification PDF https://upsc.gov.in/notice.pdf.',
    },
    source: { name: 'UPSC Official', url: 'https://upsc.gov.in', tier: 1 },
    duplicateLogs: [],
  });

  assert.equal(result.decisionBand, 'blocked');
  assert.ok(result.warnings.some((item) => item.severity === 'critical'));
  assert.ok(result.recommendations.some((item) => item.code === 'decision_band'));
  assert.equal(result.categorySuggestion.primaryCategory, 'UPSC');
  assert.equal(result.scoringVersion, 'phase3-scoring-v1');
});
