import Ajv from 'ajv';
import { z } from 'zod';

const UNKNOWN_VALUES = new Set([
  '',
  'not specified',
  'not mentioned',
  'not available',
  'na',
  'n/a',
  'nil',
  'none',
]);

const normalizeText = (value = '') => String(value ?? '').replace(/\s+/g, ' ').trim();
const lower = (value = '') => normalizeText(value).toLowerCase();

export const extractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'organization',
    'vacancies',
    'qualification',
    'age_limit',
    'salary',
    'application_mode',
    'selection_process',
    'important_dates',
    'notification_pdf',
    'official_website',
    'application_link',
    'job_location',
    'category',
    'tags',
  ],
  properties: {
    title: { type: 'string', minLength: 4, maxLength: 300 },
    organization: { type: 'string', minLength: 2, maxLength: 240 },
    vacancies: { type: 'string', maxLength: 500 },
    qualification: { type: 'string', maxLength: 4000 },
    age_limit: { type: 'string', maxLength: 1200 },
    salary: { type: 'string', maxLength: 1200 },
    application_mode: { type: 'string', maxLength: 120 },
    selection_process: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 500 },
      maxItems: 12,
    },
    important_dates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['event', 'date'],
        properties: {
          event: { type: 'string', minLength: 1, maxLength: 200 },
          date: { type: 'string', minLength: 1, maxLength: 80 },
        },
      },
      maxItems: 20,
    },
    notification_pdf: { type: 'string', maxLength: 1000 },
    official_website: { type: 'string', maxLength: 1000 },
    application_link: { type: 'string', maxLength: 1000 },
    job_location: { type: 'string', maxLength: 500 },
    category: { type: 'string', maxLength: 120 },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 80 },
      maxItems: 12,
    },
  },
};

const importantDateSchema = z.object({
  event: z.string().min(1).max(200),
  date: z.string().min(1).max(80),
});

export const extractionZodSchema = z.object({
  title: z.string().min(4).max(300),
  organization: z.string().min(2).max(240),
  vacancies: z.string().max(500).default('Not specified'),
  qualification: z.string().max(4000).default('Not specified'),
  age_limit: z.string().max(1200).default('Not specified'),
  salary: z.string().max(1200).default('Not specified'),
  application_mode: z.string().max(120).default('Not specified'),
  selection_process: z.array(z.string().min(1).max(500)).max(12).default([]),
  important_dates: z.array(importantDateSchema).max(20).default([]),
  notification_pdf: z.string().max(1000).default(''),
  official_website: z.string().max(1000).default(''),
  application_link: z.string().max(1000).default(''),
  job_location: z.string().max(500).default('Not specified'),
  category: z.string().max(120).default('government'),
  tags: z.array(z.string().min(1).max(80)).max(12).default([]),
});

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});

const validateAjv = ajv.compile(extractionJsonSchema);

export const parseJsonObject = (value) => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  if (typeof value !== 'string') {
    throw new Error('AI extraction output is not JSON text.');
  }

  const text = value.trim();
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('AI extraction output must be a JSON object.');
    }
    return parsed;
  } catch (directError) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (_error) {
        // Fall through to the direct parse error below.
      }
    }
    throw new Error(`Malformed AI JSON: ${directError.message}`);
  }
};

const isUnknown = (value = '') => UNKNOWN_VALUES.has(lower(value));

const isHttpUrl = (value = '') => {
  if (!value || isUnknown(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (_error) {
    return false;
  }
};

const normalizeUrlForCompare = (url = '') => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch (_error) {
    return '';
  }
};

const hostOf = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (_error) {
    return '';
  }
};

const extractUrls = (text = '') => (
  String(text || '').match(/https?:\/\/[^\s"'<>),]+/gi) || []
);

const knownUrlsFromContext = (context = {}) => {
  const values = [
    context.source_url,
    context.notification_url,
    context.pdf_url,
    context.official_website,
    ...(extractUrls(context.raw_text || '')),
    ...(extractUrls(context.raw_html || '')),
  ];

  return values
    .map(normalizeUrlForCompare)
    .filter(Boolean);
};

const assertTrustedUrl = (field, value, context, errors) => {
  if (!value || isUnknown(value)) return;
  if (!isHttpUrl(value)) {
    errors.push(`${field} must be an HTTP(S) URL.`);
    return;
  }

  const normalized = normalizeUrlForCompare(value);
  const knownUrls = knownUrlsFromContext(context);
  const knownHosts = new Set(knownUrls.map(hostOf).filter(Boolean));
  const host = hostOf(normalized);

  if (knownUrls.includes(normalized)) return;
  if (host && knownHosts.has(host)) return;

  errors.push(`${field} appears hallucinated because it is not present in or aligned with the official source URLs.`);
};

const validDateText = (value = '') => {
  const text = normalizeText(value);
  if (!text || isUnknown(text)) return true;
  if (/^(to be announced|tba|will be updated|as per notification)$/i.test(text)) return true;
  if (/\b(not specified|not mentioned|not available|not released|to be notified|will be notified|will be announced|will be intimated|announced later|not yet announced)\b/i.test(text)) return true;
  if (/\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\b/i.test(text)) return true;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return !Number.isNaN(Date.parse(text));
  if (/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text)) return true;
  return Number.isNaN(Date.parse(text)) ? false : true;
};

const digitsIn = (value = '') => (String(value || '').match(/\d+/g) || []);

const assertGroundedNumber = (field, value, rawText, errors) => {
  if (!value || isUnknown(value)) return;
  const digits = digitsIn(value).filter((item) => item.length >= 2);
  if (!digits.length) return;
  const source = String(rawText || '');
  const missing = digits.filter((item) => !source.includes(item));
  if (missing.length === digits.length) {
    errors.push(`${field} contains numeric data not found in the official source text.`);
  }
};

export const validateExtraction = (input, context = {}) => {
  const parsed = parseJsonObject(input);
  const zodResult = extractionZodSchema.safeParse(parsed);
  if (!zodResult.success) {
    return {
      ok: false,
      data: null,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }

  const data = zodResult.data;
  const ajvOk = validateAjv(data);
  const errors = ajvOk
    ? []
    : (validateAjv.errors || []).map((error) => `${error.instancePath || '/'} ${error.message}`);

  ['notification_pdf', 'official_website', 'application_link'].forEach((field) => {
    assertTrustedUrl(field, data[field], context, errors);
  });

  data.important_dates.forEach((item, index) => {
    if (!validDateText(item.date)) {
      errors.push(`important_dates[${index}].date is not a valid date or accepted date placeholder.`);
    }
  });

  const sourceText = [
    context.raw_text,
    context.raw_html,
    context.queue_raw_input,
  ].filter(Boolean).join('\n');
  assertGroundedNumber('vacancies', data.vacancies, sourceText, errors);
  assertGroundedNumber('salary', data.salary, sourceText, errors);

  return {
    ok: errors.length === 0,
    data: errors.length === 0 ? data : null,
    errors,
  };
};

export default validateExtraction;
