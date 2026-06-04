const compact = (value = '') => String(value ?? '').replace(/\s+/g, ' ').trim();

const slugify = (value = '') => compact(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const truncate = (value = '', max = 160) => {
  const text = compact(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}.`;
};

const unique = (values = []) => [...new Set(values.map(compact).filter(Boolean))];

const unknown = (value = '') => !compact(value) || /^not specified$/i.test(compact(value));

export const generateSeo = (extraction = {}, options = {}) => {
  const title = compact(extraction.title || 'Job Notification');
  const organization = compact(extraction.organization || '');
  const category = compact(extraction.category || options.jobType || 'government');
  const location = compact(extraction.job_location || '');
  const vacancies = compact(extraction.vacancies || '');
  const primary = `${title}${organization ? ` ${organization}` : ''}`;
  const seoTitle = truncate(`${title}${organization ? ` - ${organization}` : ''}`, 60);
  const descriptionParts = [
    title,
    organization ? `from ${organization}` : '',
    !unknown(vacancies) ? `${vacancies} vacancies` : '',
    !unknown(location) ? `in ${location}` : '',
    'eligibility, dates, selection process and official links.',
  ];
  const seoDescription = truncate(descriptionParts.filter(Boolean).join(' '), 155);
  const keywords = unique([
    primary,
    `${title} notification`,
    `${organization} recruitment`,
    `${category} jobs`,
    'government job notification',
    ...((extraction.tags || []).slice(0, 5)),
  ]).slice(0, 8);

  const canonicalSlug = slugify(`${title} ${organization}`) || `job-notification-${Date.now()}`;
  const canonicalBase = (options.siteUrl || process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://www.quickutils.page')
    .replace(/\/$/, '');
  const canonicalUrl = `${canonicalBase}/jobs/${canonicalSlug}`;

  const faq = [
    {
      question: `What is the ${title} notification about?`,
      answer: `${organization || 'The official organization'} has released details for ${title}. Candidates should verify all details from the official notification before applying.`,
    },
    {
      question: `What is the last date for ${title}?`,
      answer: extraction.important_dates?.find((item) => /last|closing|end/i.test(item.event || ''))?.date || 'The last date is not specified in the extracted source data.',
    },
    {
      question: `Where can candidates apply for ${title}?`,
      answer: extraction.application_link || extraction.official_website || 'Use the official website listed in the notification when available.',
    },
  ];

  const structuredSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    hiringOrganization: organization ? { '@type': 'Organization', name: organization } : undefined,
    jobLocation: unknown(location) ? undefined : { '@type': 'Place', address: location },
    url: canonicalUrl,
    description: seoDescription,
  };

  return {
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: keywords.join(', '),
    og_title: truncate(title, 80),
    og_description: seoDescription,
    canonical_url: canonicalUrl,
    canonical_slug: canonicalSlug,
    faq_items: faq,
    structured_schema: structuredSchema,
  };
};

export default generateSeo;
