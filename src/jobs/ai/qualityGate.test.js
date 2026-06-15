import test from 'node:test';
import assert from 'node:assert/strict';
import { runQualityGate } from './qualityGate.js';
import { generateDraft } from './draftGenerator.js';

const extraction = {
  title: 'SSC CGL 2026 Recruitment',
  organization: 'Staff Selection Commission',
  vacancies: '120',
  qualification: 'Graduate degree',
  age_limit: '18 to 30 years',
  salary: '35400',
  application_mode: 'Online',
  selection_process: ['CBT'],
  important_dates: [{ event: 'Last date', date: '2026-05-31' }],
  notification_pdf: 'https://ssc.gov.in/notice.pdf',
  official_website: 'https://ssc.gov.in',
  application_link: 'https://ssc.gov.in/apply',
  job_location: 'India',
  category: 'government',
  tags: ['ssc', 'cgl'],
};

test('quality gate approves complete low-duplicate drafts', () => {
  const draft = generateDraft({ extraction });
  const result = runQualityGate({
    extraction,
    draft,
    duplicateAnalysis: { duplicateRisk: 5, evidence: [] },
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.queueStatus, 'drafted');
  assert.ok(result.finalScore >= 80);
});

test('quality gate sends medium score drafts to manual review', () => {
  const draft = generateDraft({
    extraction: {
      ...extraction,
      notification_pdf: '',
      application_link: '',
      important_dates: [],
    },
  });
  const result = runQualityGate({
    extraction: { ...extraction, important_dates: [], notification_pdf: '', application_link: '' },
    draft,
    duplicateAnalysis: { duplicateRisk: 80, evidence: [{ risk: 80 }] },
  });

  assert.equal(result.status, 'pending_review');
  assert.equal(result.queueStatus, 'drafted');
});

test('quality gate rejects incomplete/high-duplicate drafts', () => {
  const result = runQualityGate({
    extraction: { title: 'Draft', organization: 'Org' },
    draft: { title: 'Draft', organization: 'Org' },
    duplicateAnalysis: { duplicateRisk: 100, evidence: [{ risk: 100 }] },
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.queueStatus, 'rejected');
  assert.ok(result.issues.length > 0);
});

test('quality gate forces pending_review if critical link verification fails', () => {
  const draft = generateDraft({ extraction });
  const result = runQualityGate({
    extraction,
    draft,
    duplicateAnalysis: { duplicateRisk: 5, evidence: [] },
    linkVerification: {
      notification_pdf: { ok: false, error: 'HTTP 404' },
      official_website: { ok: true },
      application_link: { ok: true },
    },
  });

  assert.equal(result.status, 'pending_review');
  assert.ok(result.issues.some((issue) => issue.includes('Link verification failed for notification pdf')));
});
