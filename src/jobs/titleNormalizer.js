const GENERIC_TITLE_PATTERNS = [
  /^(notification|recruitment|advertisement|download advertisement|current openings?|apply online)$/i,
  /^advertisement\s*\(/i,
  /^(hindi|english)\b/i,
  /^\(?\d+\s*(kb|mb)\)?$/i,
  /^[()/\s\d.kbmb]+$/i,
];

const LOW_VALUE_WORDS = new Set([
  'download',
  'advertisement',
  'notification',
  'hindi',
  'english',
  'new',
  'pdf',
  'kb',
  'mb',
  'read',
  'more',
]);

const clean = (value = '') => (
  String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const titleCase = (value = '') => (
  clean(value)
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\b(Sbi|Ibps|Rrb|Ssc|Upsc|Isro|Drdo|Tnpsc|Crpd|Appr|Sco|Cgl|Chsl|Cpo|Je|Gd)\b/g, (match) => match.toUpperCase())
);

export const isGenericTitle = (title = '') => {
  const value = clean(title);
  if (!value || value.length < 4) return true;
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(value));
};

const titleFromUrl = (url = '') => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname
      .split('/')
      .map((part) => decodeURIComponent(part))
      .filter(Boolean);
    const filePart = [...parts].reverse().find((part) => /\.pdf(?:$|[/?#])/i.test(part) || /recruit|apprentice|advert|vacancy|exam|notice/i.test(part));
    if (!filePart) return '';

    const cleaned = filePart
      .replace(/\.pdf.*/i, '')
      .replace(/^\d{6,8}\s*/, '')
      .replace(/\b(final|draft|hindi|english|eng)\b/gi, ' ')
      .replace(/\b(crpd|appr|sco|cgl|chsl|cpo|je|gd)\b/gi, (match) => match.toUpperCase())
      .replace(/[-_+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.length >= 8 ? titleCase(cleaned) : '';
  } catch (_error) {
    return '';
  }
};

const meaningfulContext = (context = '') => {
  const value = clean(context)
    .replace(/\([^)]*\b(?:kb|mb)\b[^)]*\)/gi, ' ')
    .replace(/\b(hindi|english)\b/gi, ' ')
    .replace(/\b(download|apply now|read more)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!value || value.length < 12) return '';

  const words = value
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter(Boolean);
  const meaningfulWords = words.filter((word) => !LOW_VALUE_WORDS.has(word));
  if (meaningfulWords.length < 3) return '';

  return value.slice(0, 220);
};

export const normalizeNotificationTitle = ({
  title = '',
  context = '',
  notificationUrl = '',
  pdfUrl = '',
  organization = '',
  source = '',
} = {}) => {
  const cleanedTitle = clean(title)
    .replace(/\s*\(?new\)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedTitle && !isGenericTitle(cleanedTitle)) {
    return cleanedTitle.slice(0, 280);
  }

  const fromUrl = titleFromUrl(pdfUrl || notificationUrl);
  if (fromUrl && !isGenericTitle(fromUrl)) {
    return fromUrl.slice(0, 280);
  }

  const fromContext = meaningfulContext(context);
  if (fromContext && !isGenericTitle(fromContext)) {
    return fromContext.slice(0, 280);
  }

  const org = clean(organization || source);
  const suffix = /commission|board|bank|organisation|organization/i.test(org) ? 'Job Notification' : 'Recruitment Notification';
  return clean(`${org || 'Official'} ${suffix}`).slice(0, 280);
};

export default normalizeNotificationTitle;
