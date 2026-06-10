import * as XLSX from 'xlsx'
import { slugifyText, estimateReadingTime } from '@/lib/seoUtils'

// Flexible column → field mapping (case-insensitive, spaces/underscores/dashes all treated equally)
const FIELD_ALIASES = {
  'title': 'title',
  'slug': 'slug',
  'url slug': 'slug',
  'category': 'category_name',
  'category name': 'category_name',
  'excerpt': 'excerpt',
  'summary': 'excerpt',
  'description': 'excerpt',
  'author': 'author_name',
  'author name': 'author_name',
  'author title': 'author_title',
  'author role': 'author_title',
  'author job title': 'author_title',
  'author bio': 'author_bio',
  'author biography': 'author_bio',
  'author image': 'author_image',
  'author avatar': 'author_image',
  'author photo': 'author_image',
  'seo title': 'seo_title',
  'meta title': 'seo_title',
  'page title': 'seo_title',
  'seo description': 'seo_description',
  'meta description': 'seo_description',
  'seo keywords': 'seo_keywords',
  'keywords': 'seo_keywords',
  'meta keywords': 'seo_keywords',
  'og title': 'og_title',
  'open graph title': 'og_title',
  'opengraph title': 'og_title',
  'og description': 'og_description',
  'open graph description': 'og_description',
  'opengraph description': 'og_description',
  'og image': 'og_image',
  'open graph image': 'og_image',
  'social image': 'og_image',
  'twitter title': 'twitter_title',
  'twitter card title': 'twitter_title',
  'twitter description': 'twitter_description',
  'twitter card description': 'twitter_description',
  'canonical url': 'canonical_url',
  'canonical': 'canonical_url',
  'canonical link': 'canonical_url',
  'featured image': 'featured_image',
  'featured image url': 'featured_image',
  'image': 'featured_image',
  'image url': 'featured_image',
  'thumbnail': 'featured_image',
  'featured image prompt': '_image_prompt',
  'image prompt': '_image_prompt',
  'schema type': 'schema_type',
  'schema': 'schema_type',
  'meta robots': 'meta_robots',
  'robots': 'meta_robots',
  'noindex': 'meta_robots',
  'faq': 'faq_items',
  'faq json': 'faq_items',
  'faqs': 'faq_items',
  'faq data': 'faq_items',
  'content': 'content',
  'content html': 'content',
  'body': 'content',
  'body html': 'content',
  'html': 'content',
  'article': 'content',
  'status': 'status',
  'publish status': 'status',
  'featured': 'featured',
  'is featured': 'featured',
  'tags': 'tags',
  'tag': 'tags',
  'labels': 'tags',
}

const normalizeKey = (key) =>
  String(key ?? '').toLowerCase().trim().replace(/[\s_-]+/g, ' ')

const mapRow = (rawRow) => {
  const mapped = {}
  Object.entries(rawRow).forEach(([key, value]) => {
    const nk = normalizeKey(key)
    const field = FIELD_ALIASES[nk]
    if (field && field !== '_image_prompt' && value !== undefined && value !== null && String(value).trim() !== '') {
      mapped[field] = value
    }
  })
  return mapped
}

// ── Parsers ──────────────────────────────────────────────────────────────────

export const parseExcelFile = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  return rows.map(mapRow)
}

export const parseCsvFile = (text) => {
  const workbook = XLSX.read(text, { type: 'string' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  return rows.map(mapRow)
}

export const parseJsonFile = (text) => {
  const raw = JSON.parse(text)
  const rows = Array.isArray(raw) ? raw : raw.posts ?? raw.data ?? raw.items ?? [raw]
  return rows.map(mapRow)
}

export const parseHtmlFile = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Try structured article elements first
  const articles = doc.querySelectorAll('article, .post, .blog-post, [data-post]')
  if (articles.length > 0) {
    return Array.from(articles).map((article) => {
      const title =
        article.querySelector('h1, h2, .title, .post-title')?.textContent?.trim() ?? ''
      const content =
        article.querySelector('.content, .post-content, .entry-content')?.innerHTML ??
        article.innerHTML
      const excerpt = article.querySelector('.excerpt, .summary')?.textContent?.trim() ?? ''
      return mapRow({ title, content, excerpt })
    })
  }

  // Fallback: single post from the whole page
  const title =
    doc.querySelector('title')?.textContent?.trim() ??
    doc.querySelector('h1')?.textContent?.trim() ??
    ''
  const content =
    doc.querySelector('article, main, .content')?.innerHTML ?? doc.body?.innerHTML ?? html
  const excerpt =
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''

  return [mapRow({ title, content, excerpt })]
}

// ── Field generators ─────────────────────────────────────────────────────────

const stripHtml = (html) =>
  String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const isValidUrl = (str) => {
  try { new URL(str); return true } catch { return false }
}

const generateFields = (row, categories) => {
  const r = { ...row }

  // Slug
  if (!r.slug && r.title) {
    r.slug = slugifyText(String(r.title))
  }

  // Excerpt from content
  if (!r.excerpt && r.content) {
    const text = stripHtml(r.content)
    r.excerpt = text.length > 160 ? text.slice(0, 157) + '...' : text
  }

  // Reading time
  if (r.content) {
    r.reading_time = estimateReadingTime(r.content)
  }

  // OG/Twitter inherit from SEO if missing
  if (!r.og_title && r.seo_title) r.og_title = r.seo_title
  if (!r.og_description && r.seo_description) r.og_description = r.seo_description
  if (!r.twitter_title && r.seo_title) r.twitter_title = r.seo_title
  if (!r.twitter_description && r.seo_description) r.twitter_description = r.seo_description

  // Defaults
  if (!r.schema_type) r.schema_type = 'BlogPosting'
  if (!r.meta_robots) r.meta_robots = 'index,follow'

  // Normalize status
  const rawStatus = String(r.status ?? '').toLowerCase().trim()
  r.status = ['published', 'draft'].includes(rawStatus) ? rawStatus : 'draft'

  // Normalize featured
  const rawFeatured = String(r.featured ?? '').toLowerCase().trim()
  r.featured = ['true', '1', 'yes', 'y'].includes(rawFeatured)

  // Normalize tags
  if (r.tags) {
    if (typeof r.tags === 'string') {
      r.tags = r.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    } else if (!Array.isArray(r.tags)) {
      r.tags = []
    }
  } else {
    r.tags = []
  }

  // Parse FAQ JSON
  if (r.faq_items && typeof r.faq_items === 'string') {
    try { r.faq_items = JSON.parse(r.faq_items) } catch { r.faq_items = [] }
  }
  if (!Array.isArray(r.faq_items)) r.faq_items = []

  // Resolve category name → category_id
  if (r.category_name && categories?.length) {
    const search = String(r.category_name).toLowerCase().trim()
    const found = categories.find(
      (c) => c.name?.toLowerCase() === search || c.slug?.toLowerCase() === search
    )
    if (found) r.category_id = found.id
  }

  return r
}

// ── Validation ───────────────────────────────────────────────────────────────

const normalizeDescription = (value) => String(value ?? '').trim().toLowerCase()

const validateRow = (row, existingSlugsSet, batchSlugsSet, existingSeoDescriptionsSet, existingExcerptsSet, batchSeoDescriptionsSet, batchExcerptsSet) => {
  const errors = []
  const warnings = []

  if (!String(row.title ?? '').trim()) errors.push('Title is required')
  if (!String(row.content ?? '').trim()) warnings.push('Content is empty')
  if (!row.slug) errors.push('Could not generate a slug (title missing)')

  if (row.slug) {
    if (batchSlugsSet.has(row.slug)) errors.push(`Duplicate slug in file: "${row.slug}"`)
  }

  // Check SEO description duplicates (exact match against other SEO descriptions only)
  if (row.seo_description?.trim()) {
    const normalizedSeoDesc = normalizeDescription(row.seo_description)
    if (batchSeoDescriptionsSet.has(normalizedSeoDesc)) {
      warnings.push('Duplicate SEO description found in file.')
    }
    if (existingSeoDescriptionsSet.has(normalizedSeoDesc)) {
      warnings.push('SEO description duplicates an existing post.')
    }
    batchSeoDescriptionsSet.add(normalizedSeoDesc)
  } else {
    // Check excerpt duplicates against other excerpts only when no seo_description
    const excerpt = row.excerpt || row.description || ''
    if (excerpt.trim()) {
      const normalizedExcerpt = normalizeDescription(excerpt)
      if (batchExcerptsSet.has(normalizedExcerpt)) {
        warnings.push('Duplicate excerpt found in file.')
      }
      if (existingExcerptsSet.has(normalizedExcerpt)) {
        warnings.push('Excerpt duplicates an existing post.')
      }
      batchExcerptsSet.add(normalizedExcerpt)
    }
  }

  ;['featured_image', 'og_image', 'canonical_url'].forEach((field) => {
    if (row[field] && !isValidUrl(row[field])) {
      warnings.push(`"${field}" is not a valid URL`)
    }
  })

  if (row.category_name && !row.category_id) {
    warnings.push(`Category "${row.category_name}" not found — post will be uncategorized`)
  }

  return { errors, warnings, isValid: errors.length === 0 }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export const processImportData = (rawRows, categories, existingSlugsList = [], existingItems = []) => {
  const existingSlugsSet = new Set(existingSlugsList)
  // Separate sets for SEO descriptions and excerpts to avoid false cross-matching
  const existingSeoDescriptionsSet = new Set(
    existingItems
      .map((item) => normalizeDescription(item.seo_description))
      .filter(Boolean)
  )
  const existingExcerptsSet = new Set(
    existingItems
      .map((item) => normalizeDescription(item.excerpt))
      .filter(Boolean)
  )
  const batchSlugsSet = new Set()
  const batchSeoDescriptionsSet = new Set()
  const batchExcerptsSet = new Set()

  const rows = rawRows.map((raw, idx) => {
    const row = generateFields(raw, categories)
    const { errors, warnings, isValid } = validateRow(
      row,
      existingSlugsSet,
      batchSlugsSet,
      existingSeoDescriptionsSet,
      existingExcerptsSet,
      batchSeoDescriptionsSet,
      batchExcerptsSet
    )

    if (row.slug) batchSlugsSet.add(row.slug)

    return {
      _rowIndex: idx + 2, // 1-based row number (header = row 1)
      _errors: errors,
      _warnings: warnings,
      _isValid: isValid,
      _isDuplicate: existingSlugsSet.has(row.slug),
      ...row,
    }
  })

  return {
    rows,
    totalRows: rows.length,
    totalValid: rows.filter((r) => r._isValid).length,
    totalInvalid: rows.filter((r) => !r._isValid).length,
    totalDuplicates: rows.filter((r) => r._isDuplicate).length,
    totalWarnings: rows.filter((r) => r._warnings.length > 0).length,
  }
}

// Strip internal tracking fields before DB insertion
export const prepareForInsert = (row) => {
  const {
    _rowIndex, _errors, _warnings, _isValid, _isDuplicate,
    category_name, // resolved → category_id, don't send raw name
    ...dbRow
  } = row
  return dbRow
}
