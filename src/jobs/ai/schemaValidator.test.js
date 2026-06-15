import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExtraction, isTrustedGovernmentDomain } from './schemaValidator.js';

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

test('rejects fabricated same-host application links', () => {
  const result = validateExtraction({
    ...validExtraction,
    application_link: 'https://ssc.gov.in/fabricated-apply-path',
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /application_link/);
});

test('rejects invalid dates', () => {
  const result = validateExtraction({
    ...validExtraction,
    important_dates: [{ event: 'Last date', date: 'soon-ish' }],
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /valid date/);
});

test('rejects impossible numeric dates', () => {
  const result = validateExtraction({
    ...validExtraction,
    important_dates: [{ event: 'Last date', date: '31/02/2026' }],
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

test('rejects partially ungrounded salary data', () => {
  const result = validateExtraction({
    ...validExtraction,
    salary: '35400 to 99999',
  }, baseContext);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /salary/);
});

test('identifies trusted government domains correctly', () => {
  assert.equal(isTrustedGovernmentDomain('https://ssc.nic.in'), true);
  assert.equal(isTrustedGovernmentDomain('https://upsc.gov.in/notice'), true);
  assert.equal(isTrustedGovernmentDomain('http://iitd.ac.in'), true);
  assert.equal(isTrustedGovernmentDomain('https://iisc.res.in/careers'), true);
  assert.equal(isTrustedGovernmentDomain('https://google.com'), false);
  assert.equal(isTrustedGovernmentDomain('invalid-url'), false);
});

test('allows trusted government domains even if not in context', () => {
  const result = validateExtraction({
    ...validExtraction,
    application_link: 'https://opsconline.gov.in/apply',
  }, baseContext);
  assert.equal(result.ok, true);
});
