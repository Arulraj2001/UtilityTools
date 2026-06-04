import { load } from 'cheerio';
import { normalizeNotification, cleanWhitespace } from '../normalizeNotification.js';

const DEFAULT_MAX_NOTIFICATIONS = 15;
const DEFAULT_MAX_CANDIDATES = 30;

const GENERIC_POSITIVE_KEYWORDS = [
  'recruitment',
  'vacancy',
  'notification',
  'advertisement',
  'apply online',
  'current opening',
  'employment notice',
  'posts',
];

const GENERIC_NEGATIVE_KEYWORDS = [
  'result',
  'answer key',
  'admit card',
  'hall ticket',
  'call letter',
  'score card',
  'marks',
  'syllabus',
  'interview schedule',
  'rajbhasha',
  'tender',
  'procurement',
  'office order',
  'press release',
  'newsletter',
  'holiday',
];

const uniq = (values) => [...new Set(values.filter(Boolean))];

const isPdfUrl = (url = '') => /\.pdf(?:$|[/?#])/i.test(url);

const stripUrlForKey = (url = '') => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().toLowerCase();
  } catch (_error) {
    return String(url || '').toLowerCase();
  }
};

const isGenericLinkText = (value = '') => (
  /^(hindi|english)\b/i.test(cleanWhitespace(value)) ||
  /^(download|view|click here|pdf|\(?\d+\s*(kb|mb)\)?|[()/\s\d.kbmb]+)$/i.test(cleanWhitespace(value))
);

const isGenericPageTitle = (value = '') => (
  /^(home|careers?|notification|latest updates?|ministry of|government of|staff selection commission|state bank of india|union public service commission|संघ लोक सेवा आयोग)/i
    .test(cleanWhitespace(value))
);

const containsKeyword = (value, keywords) => (
  keywords.some((keyword) => value.includes(keyword.toLowerCase()))
);

const scoreCandidate = ({ text = '', href = '', context = '' }, config = {}) => {
  const positive = [...GENERIC_POSITIVE_KEYWORDS, ...(config.positiveKeywords || [])];
  const negative = [...GENERIC_NEGATIVE_KEYWORDS, ...(config.negativeKeywords || [])];
  const haystack = `${text} ${href} ${context}`.toLowerCase();
  const linkText = String(text || '').toLowerCase();
  let score = 0;

  if (isPdfUrl(href)) score += 10;
  if (containsKeyword(haystack, positive)) score += 20;
  if (/\b(20\d{2}|202[5-9]|2030)\b/.test(haystack)) score += 6;
  if (/\b(latest|new|current|active|ongoing)\b/.test(haystack)) score += 5;
  if (/\benglish\b/.test(haystack)) score += 3;
  if (/\bhindi\b/.test(haystack)) score -= 2;
  if (/^english\b/.test(linkText)) score += 5;
  if (/^hindi\b/.test(linkText)) score -= 5;
  if (/\b(recruitment|notification|advertisement|vacancy|apply)\b/.test(haystack)) score += 8;
  if (containsKeyword(haystack, negative)) score -= 35;
  if (!text || text.length < 4) score -= 10;
  if (/javascript:|mailto:|tel:/i.test(href)) score -= 50;

  return score;
};

const extractContextText = ($, element) => {
  const contextNode = $(element).closest('tr,li,article,section,div,p');
  const context = contextNode.length ? contextNode.text() : $(element).parent().text();
  return cleanWhitespace(context).slice(0, 2_000);
};

const extractTitleFromDetail = ($, fallback = '') => {
  const fallbackTitle = cleanWhitespace(fallback);
  if (fallbackTitle && !isGenericLinkText(fallbackTitle) && !isGenericPageTitle(fallbackTitle)) {
    return fallbackTitle;
  }

  const candidates = [
    $('h1').first().text(),
    $('h2').first().text(),
    $('title').first().text(),
    fallback,
  ];

  return cleanWhitespace(candidates.find((value) => (
    cleanWhitespace(value).length > 5 &&
    !isGenericPageTitle(value) &&
    !isGenericLinkText(value)
  )) || fallbackTitle || fallback);
};

const extractPdfUrl = ($, fetcher, baseUrl) => {
  const links = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const absolute = fetcher.absolutizeUrl(href, baseUrl);
    if (!absolute || !isPdfUrl(absolute)) return;
    try {
      fetcher.assertSafeUrl(absolute);
      links.push(absolute);
    } catch (_error) {
      // Unsafe links are ignored.
    }
  });
  return links[0] || '';
};

const extractCandidates = ($, fetcher, baseUrl, config = {}) => {
  const candidates = [];

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const absolute = fetcher.absolutizeUrl(href, baseUrl);
    if (!absolute) return;

    try {
      fetcher.assertSafeUrl(absolute);
    } catch (_error) {
      return;
    }

    const text = cleanWhitespace($(element).text() || $(element).attr('title') || $(element).attr('aria-label') || '');
    const context = extractContextText($, element);
    const score = scoreCandidate({ text, href: absolute, context }, config);
    if (score < 18) return;

    candidates.push({
      title: text || context.slice(0, 160),
      url: absolute,
      pdf_url: isPdfUrl(absolute) ? absolute : '',
      context,
      score,
    });
  });

  const seen = new Set();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const key = stripUrlForKey(candidate.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const hydrateCandidate = async (candidate, page, fetcher, source, config) => {
  const title = isGenericLinkText(candidate.title)
    ? candidate.context
    : candidate.title;

  if (candidate.pdf_url) {
    return normalizeNotification({
      title,
      notification_url: page.url,
      pdf_url: candidate.pdf_url,
      organization: config.organization,
      raw_content: candidate.context,
      raw_html: page.text,
      context: candidate.context,
    }, { ...source, organization: config.organization });
  }

  try {
    const detailPage = await fetcher.fetchPage(candidate.url);
    const sanitizedHtml = fetcher.sanitizeHtml(detailPage.text);
    const $ = load(sanitizedHtml);
    const rawContent = fetcher.htmlToText(sanitizedHtml);
    const pdfUrl = extractPdfUrl($, fetcher, detailPage.url);

    return normalizeNotification({
      title: extractTitleFromDetail($, candidate.title),
      notification_url: detailPage.url,
      pdf_url: pdfUrl,
      organization: config.organization,
      raw_content: rawContent,
      raw_html: sanitizedHtml,
      context: candidate.context,
    }, { ...source, organization: config.organization });
  } catch (error) {
    fetcher.recordError(error, { url: candidate.url, phase: 'hydrateCandidate' });
    return normalizeNotification({
      title,
      notification_url: candidate.url,
      pdf_url: '',
      organization: config.organization,
      raw_content: candidate.context,
      raw_html: page.text,
      context: candidate.context,
    }, { ...source, organization: config.organization });
  }
};

export const discoverOfficialNotifications = async (fetcher, source = {}, config = {}) => {
  fetcher.resetErrors();

  const startUrls = uniq([
    ...(config.startUrls || []),
    source.url,
  ]);
  const maxNotifications = config.maxNotifications || DEFAULT_MAX_NOTIFICATIONS;
  const maxCandidates = config.maxCandidates || DEFAULT_MAX_CANDIDATES;
  const notifications = [];
  const seen = new Set();

  for (const startUrl of startUrls) {
    if (notifications.length >= maxNotifications) break;

    let page;
    try {
      page = await fetcher.fetchPage(startUrl);
    } catch (error) {
      fetcher.recordError(error, { url: startUrl, phase: 'fetchStartPage' });
      continue;
    }

    const sanitizedHtml = fetcher.sanitizeHtml(page.text);
    const $ = load(sanitizedHtml);
    const candidates = extractCandidates($, fetcher, page.url, config).slice(0, maxCandidates);

    for (const candidate of candidates) {
      if (notifications.length >= maxNotifications) break;
      const key = stripUrlForKey(candidate.pdf_url || candidate.url);
      if (seen.has(key)) continue;
      seen.add(key);

      const notification = await hydrateCandidate(
        candidate,
        { ...page, text: sanitizedHtml },
        fetcher,
        source,
        config,
      );

      if (!notification.notification_url && !notification.pdf_url) continue;
      if (!notification.title || notification.title.length < 5) continue;
      notifications.push(notification);
    }
  }

  if (notifications.length === 0 && fetcher.errors.length > 0) {
    const error = new Error('No notifications discovered from reachable official source pages.');
    error.fetchErrors = fetcher.errors;
    throw error;
  }

  return notifications;
};

export default discoverOfficialNotifications;
