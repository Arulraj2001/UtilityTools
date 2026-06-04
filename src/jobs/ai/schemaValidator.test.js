import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExtraction } from './schemaValidator.js';

const baseContext = {
  source_url: 'https://ssc.gov.in/ssc-calender',
  notification_url: 'https://ssc.gov.in/ssc-calender',
  pdf_url: 'https://ssc.gov.in/notice.pdf',
  raw_text: 'SSC CGL 2026 notification. Total 120 vacancies. Salary 35400. Last date 2026-05-31. https://ssc.gov.in/notice.pdf https://ssc.gov.in/apply',
};

const validExtraction = {
  title: 'SSC CGL 2026 Recruitment',
  organization: 'Staff Selection Commission',
  vacancies: '120',
  qualification: 'Graduate degree',
  age_limit: '18 to 30 years',
  salary: '35400',
  application_mode: 'Online',
  selection_process: ['Computer based test'],
  important_dates: [{ event: 'Last date', date: '2026-05-31' }],
  notification_pdf: 'https://ssc.gov.in/notice.pdf',
  official_website: 'https://ssc.gov.in',
  application_link: 'https://ssc.gov.in/apply',
  job_location: 'India',
  category: 'government',
  tags: ['ssc', 'cgl'],
};

test('validates grounded extraction JSON', () => {
  const result = validateExtraction(validExtraction, baseContext);
  assert.equal(result.ok, true);
  assert.equal(result.data.title, validExtraction.title);
});

test('rejects malformed JSON text', () => {
  assert.throws(() => validateExtraction('not json', baseContext), /Malformed AI JSON/);
});

test('rejects hallucinated links', () => {
  const result = validateExtraction({
    ...validExtraction,
    application_link: 'https://fake.example.com/apply',
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /hallucinated/);
});

test('rejects invalid dates', () => {
  const result = validateExtraction({
    ...validExtraction,
    important_dates: [{ event: 'Last date', date: 'soon-ish' }],
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /valid date/);
});

test('rejects ungrounded numeric vacancy data', () => {
  const result = validateExtraction({
    ...validExtraction,
    vacancies: '9999',
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /vacancies/);
});
