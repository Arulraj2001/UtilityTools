import crypto from 'node:crypto';
import { load } from 'cheerio';
import { normalizeNotificationTitle } from './titleNormalizer.js';

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]);

export const cleanWhitespace = (value = '') => (
  String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

export const stripHtmlToText = (html = '') => {
  if (!html) return '';
  const $ = load(String(html || ''));
  $('script,style,noscript,iframe,object,embed,form,input,button,svg,canvas').remove();
  return cleanWhitespace($.root().text());
};

export const normalizeUrl = (url = '') => {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    TRACKING_PARAMS.forEach((param) => parsed.searchParams.delete(param));
    const normalized = parsed.toString();
    return normalized.endsWith('/') && parsed.pathname !== '/' ? normalized.slice(0, -1) : normalized;
  } catch (_error) {
    return '';
  }
};

const normalizeTitle = (title = '') => {
  const cleaned = cleanWhitespace(title)
    .replace(/^(new|latest|download|click here|view|read more)\s*[:\-]?\s*/i, '')
    .replace(/\s*\(?pdf\)?\s*$/i, '')
    .replace(/\s*\(?notification\)?\s*$/i, ' Notification')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, 280);
};

const toIsoDate = (year, month, day) => {
  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  if (!yyyy || !mm || !dd || mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

export const extractFirstDate = (text = '') => {
  const value = cleanWhitespace(text);
  if (!value) return '';

  const numeric = value.match(/\b([0-3]?\d)[./-]([01]?\d)[./-]((?:20)?\d{2})\b/);
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return toIsoDate(year, numeric[2], numeric[1]);
  }

  const named = value.match(/\b([0-3]?\d)(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+((?:20)?\d{2})\b/i);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return month ? toIsoDate(year, month, named[1]) : '';
  }

  return '';
};

export const extractLastDate = (text = '') => {
  const value = cleanWhitespace(text);
  if (!value) return '';

  const patterns = [
    /(?:last date|closing date|last day|apply online till|apply till|end date|last date for submission)[^0-9A-Za-z]{0,20}(.{0,120})/i,
    /(?:last date|closing date|last day|end date).{0,80}/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const date = extractFirstDate(match[1] || match[0]);
      if (date) return date;
    }
  }

  return '';
};

export const buildContentHash = (notification = {}) => {
  const sourceText = cleanWhitespace(
    notification.raw_content ||
    notification.raw_text ||
    stripHtmlToText(notification.raw_html || '') ||
    notification.title ||
    notification.notification_url ||
    notification.pdf_url ||
    ''
  ).toLowerCase();

  const fingerprint = [
    cleanWhitespace(notification.title || '').toLowerCase(),
    cleanWhitespace(notification.organization || '').toLowerCase(),
    normalizeUrl(notification.notification_url || ''),
    normalizeUrl(notification.pdf_url || ''),
    sourceText.slice(0, 25_000),
  ].join('\n');

  return crypto.createHash('sha256').update(fingerprint).digest('hex');
};

export const normalizeNotification = (input = {}, source = {}) => {
  const rawHtml = String(input.raw_html || input.rawHtml || '');
  const rawContent = cleanWhitespace(
    input.raw_content ||
    input.raw_text ||
    input.rawText ||
    stripHtmlToText(rawHtml)
  ).slice(0, 250_000);

  const organization = cleanWhitespace(
    input.organization ||
    source.organization ||
    source.name ||
    ''
  ).slice(0, 180);

  const notificationUrl = normalizeUrl(input.notification_url || input.notificationUrl || input.url || '');
  const pdfUrl = normalizeUrl(input.pdf_url || input.pdfUrl || '');
  const title = normalizeNotificationTitle({
    title: normalizeTitle(
      input.title ||
      input.link_text ||
      input.heading ||
      ''
    ),
    context: input.context || rawContent,
    notificationUrl,
    pdfUrl,
    organization,
    source: source.name || input.source || '',
  });
  const dateCorpus = [
    input.published_date,
    input.date_text,
    input.context,
    rawContent,
    title,
  ].filter(Boolean).join(' ');

  const lastDateCorpus = [
    input.last_date,
    rawContent,
    input.context,
    title,
  ].filter(Boolean).join(' ');

  return {
    title,
    organization,
    source: cleanWhitespace(source.name || input.source || '').slice(0, 180),
    notification_url: notificationUrl,
    pdf_url: pdfUrl,
    published_date: input.published_date || extractFirstDate(dateCorpus) || '',
    last_date: input.last_date || extractLastDate(lastDateCorpus) || '',
    raw_content: rawContent,
    raw_html: rawHtml.slice(0, 500_000),
  };
};

export default normalizeNotification;
