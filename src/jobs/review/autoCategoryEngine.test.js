import test from 'node:test';
import assert from 'node:assert/strict';
import AutoCategoryEngine from './autoCategoryEngine.js';

test('AutoCategoryEngine classifies SSC from deterministic source signals', () => {
  const result = new AutoCategoryEngine().categorize({
    draft: {
      generated_data: {
        title: 'SSC CGL 2026 Recruitment',
        organization: 'Staff Selection Commission',
        tags: ['ssc', 'cgl'],
      },
    },
    source: { url: 'https://ssc.gov.in', category: 'government' },
  });

  assert.equal(result.primaryCategory, 'SSC');
  assert.ok(result.confidence >= 90);
  assert.ok(result.matchedSignals.some((signal) => signal.field === 'source_domain'));
});

test('AutoCategoryEngine returns warnings when category evidence is weak', () => {
  const result = new AutoCategoryEngine().categorize({
    draft: { generated_data: { title: 'Assistant Recruitment', organization: 'Unknown Board' } },
  });

  assert.equal(result.primaryCategory, 'Central Government');
  assert.ok(result.confidence < 70);
  assert.ok(result.warnings.length > 0);
});
