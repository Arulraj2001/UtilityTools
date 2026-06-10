import test from 'node:test';
import assert from 'node:assert/strict';
import TagEngine from './tagEngine.js';

test('TagEngine generates lowercase hyphenated source-derived tags', () => {
  const result = new TagEngine().generate({
    draft: {
      generated_data: {
        title: 'SSC CGL Graduate Recruitment',
        organization: 'Staff Selection Commission',
        qualification: 'Graduate degree',
        job_location: 'Tamil Nadu, India',
      },
    },
    rawNotification: {
      raw_text: 'Staff Selection Commission SSC CGL recruitment for Graduate degree candidates in Tamil Nadu, India.',
    },
  });

  assert.ok(result.tags.includes('ssc'));
  assert.ok(result.tags.includes('cgl'));
  assert.ok(result.tags.includes('graduate'));
  assert.ok(result.tags.includes('tamil-nadu'));
  assert.equal(new Set(result.tags).size, result.tags.length);
  assert.ok(result.tags.every((tag) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)));
  assert.ok(result.confidence >= 60);
});
