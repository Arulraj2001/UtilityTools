import test from 'node:test';
import assert from 'node:assert/strict';
import DuplicateAnalyzer, { textSimilarity } from './duplicateAnalyzer.js';

test('textSimilarity scores overlapping titles', () => {
  assert.ok(textSimilarity('SSC CGL 2026 Recruitment', 'SSC CGL Recruitment 2026') >= 70);
  assert.ok(textSimilarity('SSC CGL 2026 Recruitment', 'ISRO Scientist Notification') < 30);
});

test('DuplicateAnalyzer raises risk for exact URLs and title matches', async () => {
  const analyzer = new DuplicateAnalyzer({}, { limit: 10 });
  analyzer.loadCandidates = async () => [
    {
      id: 'job-1',
      source_table: 'jobs',
      title: 'SSC CGL 2026 Recruitment',
      organization: 'Staff Selection Commission',
      notification_pdf: 'https://ssc.gov.in/notice.pdf',
    },
    {
      id: 'job-2',
      source_table: 'jobs',
      title: 'ISRO Scientist Recruitment',
      organization: 'ISRO',
    },
  ];

  const result = await analyzer.analyze({
    title: 'SSC CGL Recruitment 2026',
    organization: 'Staff Selection Commission',
    notification_pdf: 'https://ssc.gov.in/notice.pdf',
  });

  assert.equal(result.duplicateRisk, 100);
  assert.equal(result.isDuplicateLikely, true);
  assert.equal(result.evidence[0].matched_id, 'job-1');
});

test('DuplicateAnalyzer excludes the source raw notification from duplicate risk', async () => {
  const analyzer = new DuplicateAnalyzer({}, { limit: 10 });
  analyzer.loadCandidates = async () => [
    {
      id: 'raw-1',
      source_table: 'raw_job_notifications',
      title: 'SSC CGL 2026 Recruitment',
      organization: 'Staff Selection Commission',
      notification_url: 'https://ssc.gov.in/ssc-calender',
    },
  ];

  const result = await analyzer.analyze({
    title: 'SSC CGL 2026 Recruitment',
    organization: 'Staff Selection Commission',
    source_url: 'https://ssc.gov.in/ssc-calender',
    raw_notification_id: 'raw-1',
  });

  assert.equal(result.duplicateRisk, 0);
  assert.equal(result.evidence.length, 0);
});
