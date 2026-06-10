import test from 'node:test';
import assert from 'node:assert/strict';
import FactVerifier from './factVerifier.js';

const baseContext = {
  draft: {
    id: 'draft-1',
    generated_data: {
      title: 'SSC CGL 2026 Recruitment',
      organization: 'Staff Selection Commission',
      official_website: 'https://ssc.gov.in',
      notification_pdf: 'https://ssc.gov.in/notice.pdf',
      apply_link: 'https://ssc.gov.in/apply',
      important_dates: [{ event: 'Last date', date: '2026-05-31' }],
      vacancies: '120',
      salary: 'Not specified',
      qualification: 'Graduate degree',
      job_location: 'India',
      application_mode: 'Online',
      category: 'SSC',
    },
  },
  queueItem: {
    id: 'queue-1',
    title: 'SSC CGL 2026 Recruitment',
    organization: 'Staff Selection Commission',
    source_url: 'https://ssc.gov.in',
    raw_input: 'SSC CGL 2026. Graduate degree. Apply online at https://ssc.gov.in/apply. Last date 31/05/2026. Total 120 vacancies.',
  },
  rawNotification: {
    id: 'raw-1',
    title: 'SSC CGL 2026 Recruitment',
    organization: 'Staff Selection Commission',
    notification_url: 'https://ssc.gov.in',
    pdf_url: 'https://ssc.gov.in/notice.pdf',
    raw_text: 'SSC CGL 2026 notification. Graduate degree. Apply online at https://ssc.gov.in/apply. Last date 31/05/2026. Total 120 vacancies. India.',
  },
  source: {
    id: 'source-1',
    name: 'SSC Official',
    url: 'https://ssc.gov.in',
    tier: 1,
    category: 'government',
  },
  duplicateLogs: [],
};

test('FactVerifier blocks hallucinated application URLs', () => {
  const context = structuredClone(baseContext);
  context.draft.generated_data.apply_link = 'https://fake-example.test/apply';

  const verification = new FactVerifier().verify(context);

  assert.equal(verification.fieldResults.apply_link.status, 'blocked');
  assert.ok(verification.blockingIssues.some((item) => item.code === 'hallucinated_url'));
  assert.ok(verification.verificationScore < 75);
});

test('FactVerifier blocks invalid critical dates', () => {
  const context = structuredClone(baseContext);
  context.draft.generated_data.important_dates = [{ event: 'Last date', date: '2026-02-31' }];

  const verification = new FactVerifier().verify(context);

  assert.equal(verification.fieldResults.dates.status, 'blocked');
  assert.ok(verification.blockingIssues.some((item) => item.code === 'invalid_critical_date'));
});

test('FactVerifier blocks ungrounded critical numeric facts', () => {
  const context = structuredClone(baseContext);
  context.draft.generated_data.salary = 'Rs 99,999 per month';

  const verification = new FactVerifier().verify(context);

  assert.equal(verification.fieldResults.salary.status, 'blocked');
  assert.ok(verification.blockingIssues.some((item) => item.code === 'ungrounded_salary'));
});

test('FactVerifier verifies a grounded official draft', () => {
  const verification = new FactVerifier().verify(baseContext);

  assert.equal(verification.fieldResults.apply_link.status, 'verified');
  assert.equal(verification.fieldResults.notification_pdf.status, 'verified');
  assert.equal(verification.fieldResults.organization.status, 'verified');
  assert.ok(verification.sourceConfidence >= 80);
  assert.ok(verification.verificationScore >= 80);
});
