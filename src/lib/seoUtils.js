import slugify from 'slugify'

export const slugifyText = (value) => {
  if (!value) return ''
  return slugify(value, { lower: true, strict: true, remove: /[*+~.()"!:@]/g })
}

export const estimateReadingTime = (html) => {
  if (!html) return 1
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text.split(' ').filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export const getKeywordDensity = (content = '', keywords = '') => {
  const normalized = content
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[“”‘’]/g, "'")
    .replace(/[^\w\s']/g, ' ')

  const terms = keywords
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((term) => term.trim())
    .filter(Boolean)

  if (!terms.length) return 0

  const wordList = normalized.split(/\s+/).filter(Boolean)
  const totalWords = wordList.length || 1

  const matches = terms.reduce((count, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')
    return count + (normalized.match(regex)?.length || 0)
  }, 0)

  return Math.min(100, Math.round((matches / totalWords) * 10000) / 100)
}

export const buildSeoScore = ({ title, description, keywords, canonical_url, og_image, content, categoryId, schema_type }) => {
  let score = 0
  const warnings = []

  if (title && title.length >= 40 && title.length <= 70) score += 20
  else if (title) score += 10
  else warnings.push('Missing SEO title')

  if (description && description.length >= 120 && description.length <= 160) score += 20
  else if (description) score += 10
  else warnings.push('Missing SEO description')

  if (keywords) score += 15
  else warnings.push('Add target keywords')

  if (canonical_url) score += 10
  else warnings.push('Add canonical URL')

  if (og_image) score += 10
  else warnings.push('Add Open Graph image')

  if (categoryId) score += 10
  else warnings.push('Assign a blog category')

  if (content && content.length > 500) score += 15
  else warnings.push('Expand the article content')

  if (schema_type) score += 5
  else warnings.push('Specify schema type')

  return {
    score: Math.min(100, score),
    warnings,
    label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work',
  }
}

const ensureMetaTag = (name, content, attr = 'name') => {
  let element = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content || '')
}

const ensureLinkTag = (rel, href) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href || '')
}

export const applySeoMeta = ({
  title,
  description,
  canonical_url,
  keywords,
  author = 'Utility Tools',
  robots = 'index,follow',
  og_image,
  twitter_card = 'summary_large_image',
  language = 'en-US',
}) => {
  if (title) document.title = title
  ensureMetaTag('description', description)
  ensureMetaTag('keywords', keywords)
  ensureMetaTag('author', author)
  ensureMetaTag('robots', robots)
  ensureMetaTag('twitter:card', twitter_card, 'name')
  ensureMetaTag('twitter:title', title, 'name')
  ensureMetaTag('twitter:description', description, 'name')
  ensureMetaTag('og:title', title, 'property')
  ensureMetaTag('og:description', description, 'property')
  ensureMetaTag('og:type', 'article', 'property')
  ensureMetaTag('og:image', og_image, 'property')
  ensureMetaTag('og:url', canonical_url, 'property')
  ensureMetaTag('og:locale', language, 'property')
  ensureLinkTag('canonical', canonical_url)
}

export const buildJsonLd = ({
  type = 'WebSite',
  name,
  description,
  url,
  image,
  author,
  datePublished,
  dateModified,
  headline,
  breadcrumb,
  faq = [],
}) => {
  const base = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url,
  }

  if (image) base.image = image
  if (author) base.author = { '@type': 'Person', name: author }
  if (datePublished) base.datePublished = datePublished
  if (dateModified) base.dateModified = dateModified
  if (headline) base.headline = headline

  if (breadcrumb?.length) {
    base.itemListElement = breadcrumb.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    }))
  }

  if (faq.length > 0) {
    base.mainEntity = faq.map((faqItem) => ({
      '@type': 'Question',
      name: faqItem.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqItem.answer,
      },
    }))
  }

  return base
}
