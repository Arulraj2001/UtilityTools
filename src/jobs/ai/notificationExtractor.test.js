import test from 'node:test';
import assert from 'node:assert/strict';
import NotificationExtractor, { buildExtractionPrompt } from './notificationExtractor.js';

const queueItem = {
  id: 'queue-1',
  title: 'SSC CGL 2026',
  organization: 'SSC',
  source_url: 'https://ssc.gov.in/ssc-calender',
  job_type: 'government',
  raw_input: 'SSC CGL 2026. Total 120 vacancies. Last date 2026-05-31. https://ssc.gov.in/apply',
};

const rawNotification = {
  id: 'raw-1',
  notification_url: 'https://ssc.gov.in/ssc-calender',
  pdf_url: '',
  raw_text: queueItem.raw_input,
};

const extraction = {
  title: 'SSC CGL 2026 Recruitment',
  organization: 'Staff Selection Commission',
  vacancies: '120',
  qualification: 'Graduate degree',
  age_limit: '18 to 30 years',
  salary: 'Not specified',
  application_mode: 'Online',
  selection_process: ['Computer based test'],
  important_dates: [{ event: 'Last date', date: '2026-05-31' }],
  notification_pdf: '',
  official_website: 'https://ssc.gov.in',
  application_link: 'https://ssc.gov.in/apply',
  job_location: 'India',
  category: 'government',
  tags: ['ssc', 'cgl'],
};

test('buildExtractionPrompt uses untrusted source boundary and JSON-only instructions', () => {
  const prompt = buildExtractionPrompt({ queueItem, rawNotification });
  assert.match(prompt, /Return ONLY one valid JSON object/);
  assert.match(prompt, /BEGIN_UNTRUSTED_OFFICIAL_SOURCE_JSON/);
  assert.doesNotMatch(prompt, /```/);
});

test('extract calls provider selector and validates JSON', async () => {
  let capturedPrompt = '';
  const providerSelector = {
    async generate(prompt) {
      capturedPrompt = prompt;
      return {
        text: JSON.stringify(extraction),
        provider: 'openrouter',
        model: 'test-model',
        tokensUsed: 42,
        durationMs: 25,
        attempts: [
          { providerName: 'cerebras', ok: false, errorType: 'rate_limit' },
          { providerName: 'openrouter', ok: true },
        ],
      };
    },
  };

  const extractor = new NotificationExtractor({ providerSelector });
  const result = await extractor.extract({ queueItem, rawNotification, supabase: {} });

  assert.match(capturedPrompt, /SSC CGL 2026/);
  assert.equal(result.extraction.title, extraction.title);
  assert.equal(result.provider, 'openrouter');
  assert.equal(result.attempts.length, 2);
});

test('extract rejects invalid provider JSON before database save', async () => {
  const extractor = new NotificationExtractor({
    providerSelector: {
      async generate() {
        return { text: '{"title":"Too short"}', provider: 'openrouter' };
      },
    },
  });

  await assert.rejects(
    () => extractor.extract({ queueItem, rawNotification, supabase: {} }),
    /validation failed/,
  );
});
