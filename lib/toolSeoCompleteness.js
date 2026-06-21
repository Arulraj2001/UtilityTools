/**
 * Utility to determine if a tool has sufficient SEO content
 * for indexing. Tools with missing/incomplete content get noindex
 * and are excluded from the sitemap.
 */

const MIN_SEO_CONTENT_WORDS = 50;

/**
 * Counts the words in an HTML string, stripping tags first.
 */
function countHtmlWords(html = '') {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

/**
 * Determines if a tool has enough content to be indexed.
 *
 * Returns true (indexable) if the tool has:
 *   - A meaningful seo_content (≥50 words), OR
 *   - A seo_title AND seo_description AND description AND at least some FAQ items
 *
 * Tools that don't meet the threshold should be noindex and excluded from sitemap.
 */
export function isToolIndexable(tool) {
  if (!tool) return false;
  if (tool.status !== 'published') return false;

  const hasSeoTitle = Boolean(tool.seo_title && tool.seo_title.trim().length > 5);
  const hasSeoDescription = Boolean(tool.seo_description && tool.seo_description.trim().length > 10);
  const hasDescription = Boolean(tool.description && tool.description.trim().length > 10);
  const hasSeoContent = countHtmlWords(tool.seo_content) >= MIN_SEO_CONTENT_WORDS;
  const hasFaq = Array.isArray(tool.faq) && tool.faq.length >= 2;

  // A tool is indexable if it has substantive seo_content
  // OR has the basic SEO metadata + some content
  if (hasSeoContent) return true;
  if (hasSeoTitle && hasSeoDescription && hasDescription && hasFaq) return true;
  if (hasSeoTitle && hasSeoDescription && hasDescription && countHtmlWords(tool.seo_content) >= 20) return true;

  return false;
}