import { generateSeo } from './seoGenerator.js';

const compact = (value = '') => String(value ?? '').replace(/\s+/g, ' ').trim();
const isMissing = (value = '') => !compact(value) || /^not specified$/i.test(compact(value));

const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const asText = (value, fallback = 'Not specified in the source notification.') => (
  isMissing(value) ? fallback : compact(value)
);

const renderList = (items = []) => {
  const values = (Array.isArray(items) ? items : []).map(compact).filter(Boolean);
  if (!values.length) return '<p>Not specified in the source notification.</p>';
  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
};

const renderDates = (items = []) => {
  const values = (Array.isArray(items) ? items : []).filter((item) => item?.event && item?.date);
  if (!values.length) return '<p>Not specified in the source notification.</p>';
  return [
    '<table><thead><tr><th>Event</th><th>Date</th></tr></thead><tbody>',
    ...values.map((item) => `<tr><td>${escapeHtml(item.event)}</td><td>${escapeHtml(item.date)}</td></tr>`),
    '</tbody></table>',
  ].join('');
};

const renderOfficialLinks = (extraction = {}) => {
  const links = [
    ['Notification PDF', extraction.notification_pdf],
    ['Official Website', extraction.official_website],
    ['Application Link', extraction.application_link],
  ].filter(([, url]) => compact(url));

  if (!links.length) return '<p>No official links were extracted from the source notification.</p>';
  return `<ul>${links.map(([label, url]) => (
    `<li><a href="${escapeHtml(url)}" rel="nofollow noopener" target="_blank">${escapeHtml(label)}</a></li>`
  )).join('')}</ul>`;
};

const summarize = (extraction = {}) => {
  const pieces = [
    `${asText(extraction.organization, 'The official organization')} has released ${asText(extraction.title, 'a job notification')}.`,
    `Vacancies: ${asText(extraction.vacancies)}.`,
    `Application mode: ${asText(extraction.application_mode)}.`,
  ];
  return pieces.join(' ');
};

export const generateDraft = ({ extraction = {}, queueItem = {}, rawNotification = {}, siteUrl } = {}) => {
  const seo = generateSeo(extraction, {
    jobType: queueItem.job_type,
    siteUrl,
  });
  const title = compact(extraction.title || queueItem.title || rawNotification.title || 'Official Job Notification');
  const organization = compact(extraction.organization || queueItem.organization || rawNotification.organization || '');
  const shortDescription = seo.seo_description;

  const fullDescription = `
<h2>Quick Summary</h2>
<p>${escapeHtml(summarize(extraction))}</p>

<h2>Vacancy Details</h2>
<p>${escapeHtml(asText(extraction.vacancies))}</p>

<h2>Eligibility</h2>
<p><strong>Qualification:</strong> ${escapeHtml(asText(extraction.qualification))}</p>
<p><strong>Age limit:</strong> ${escapeHtml(asText(extraction.age_limit))}</p>

<h2>Salary</h2>
<p>${escapeHtml(asText(extraction.salary))}</p>

<h2>Selection Process</h2>
${renderList(extraction.selection_process)}

<h2>Important Dates</h2>
${renderDates(extraction.important_dates)}

<h2>Application Process</h2>
<p><strong>Application mode:</strong> ${escapeHtml(asText(extraction.application_mode))}</p>
<p>Candidates should apply only through the official link or website listed in the source notification.</p>

<h2>Official Links</h2>
${renderOfficialLinks(extraction)}
`.trim();

  return {
    title,
    slug: seo.canonical_slug,
    organization,
    short_description: shortDescription,
    full_description: fullDescription,
    eligibility: {
      education: asText(extraction.qualification),
      age: asText(extraction.age_limit),
      experience: 'Not specified in the source notification.',
    },
    selection_process: extraction.selection_process || [],
    important_dates: extraction.important_dates || [],
    application_fee: 'Not specified in the source notification.',
    salary: asText(extraction.salary),
    vacancies: asText(extraction.vacancies),
    notification_pdf: extraction.notification_pdf || rawNotification.pdf_url || '',
    official_website: extraction.official_website || '',
    apply_link: extraction.application_link || '',
    job_location: asText(extraction.job_location),
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    seo_keywords: seo.seo_keywords,
    og_title: seo.og_title,
    og_description: seo.og_description,
    canonical_url: seo.canonical_url,
    faq_items: seo.faq_items,
    structured_schema: seo.structured_schema,
    schema_type: 'JobPosting',
    tags: extraction.tags || [],
    job_type: queueItem.job_type || extraction.category || 'government',
    category: extraction.category || queueItem.job_type || 'government',
    source_url: queueItem.source_url || rawNotification.notification_url || '',
    raw_notification_id: rawNotification.id || queueItem.extracted_data?.raw_notification_id || null,
    phase2_extraction: extraction,
  };
};

export default generateDraft;
