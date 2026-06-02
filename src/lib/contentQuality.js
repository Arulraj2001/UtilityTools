const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const wordCount = (value = '') => {
  const text = stripHtml(Array.isArray(value) ? value.join(' ') : String(value || ''))
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

const hasValidFaq = (items = []) => (
  Array.isArray(items) && items.some((item) => item?.question?.trim() && item?.answer?.trim())
)

const contentByType = (item, type) => {
  if (type === 'tool') return [item.description, item.long_description, item.seo_content].join(' ')
  if (type === 'blog') return [item.excerpt, item.content].join(' ')
  if (type === 'workflow') return [item.excerpt, item.content].join(' ')
  if (type === 'job') return [item.short_description, item.full_description].join(' ')
  return [item.description, item.content, item.seo_content].join(' ')
}

const getTitle = (item, type) => item.seo_title || item.title || item.name || (type === 'job' ? item.title : '')
const getDescription = (item) => item.seo_description || item.excerpt || item.description || item.short_description || ''

const thresholds = {
  tool: 90,
  blog: 450,
  workflow: 250,
  job: 160,
  category: 140,
}

export const validateContentQuality = (item = {}, { type = 'page', existingItems = [] } = {}) => {
  const blockers = []
  const warnings = []
  const title = getTitle(item, type)
  const description = getDescription(item)
  const content = contentByType(item, type)
  const count = wordCount(content)
  const minWords = thresholds[type] || 120
  const faq = item.faq || item.faq_items || []

  if (!title?.trim()) blockers.push('Missing SEO title or page title.')
  if (!item.slug?.trim()) blockers.push('Missing slug.')
  if (!description?.trim()) blockers.push('Missing SEO description or summary.')
  if (description && description.length < 70) warnings.push('SEO description is short; aim for a specific 90-160 character summary.')
  if (content && count < minWords) blockers.push(`Thin content: ${count} words found, ${minWords}+ recommended for published ${type} pages.`)
  if (!content?.trim()) blockers.push('Missing main content.')

  if (['tool', 'workflow'].includes(type) && !hasValidFaq(faq)) {
    blockers.push('Missing FAQ items for a published page.')
  } else if (['blog', 'job'].includes(type) && !hasValidFaq(faq)) {
    warnings.push('No FAQ items found; add FAQs when the topic has recurring user questions.')
  }

  if (content && !/example|for example|sample|scenario/i.test(stripHtml(content))) {
    warnings.push('No practical example detected in the main content.')
  }

  const normalizedDescription = description.trim().toLowerCase()
  const duplicate = existingItems.find((other) => (
    other?.id !== item?.id &&
    normalizedDescription &&
    (other.seo_description || other.excerpt || other.description || '').trim().toLowerCase() === normalizedDescription
  ))
  if (duplicate) blockers.push(`Duplicate SEO description detected: ${duplicate.title || duplicate.name || duplicate.slug}.`)

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    wordCount: count,
  }
}

export const formatQualityIssues = (result) => [
  ...result.blockers,
  ...result.warnings.map((warning) => `Warning: ${warning}`),
].join(' ')

