import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { ICON_MAP } from '@/lib/iconMap'

const FIELD_ALIASES = {
  'tool name': 'name',
  'name': 'name',
  'title': 'name',
  'slug': 'slug',
  'url slug': 'slug',
  'icon': 'icon',
  'icon name': 'icon',
  'short description': 'description',
  'description': 'description',
  'long description': 'long_description',
  'long description html': 'long_description',
  'category': 'category_name',
  'category name': 'category_name',
  'status': 'status',
  'sort order': 'sort_order',
  'featured': 'is_featured',
  'is featured': 'is_featured',
  'trending': 'is_trending',
  'is trending': 'is_trending',
  'seo title': 'seo_title',
  'seo description': 'seo_description',
  'seo keywords': 'seo_keywords',
  'primary keywords': 'primary_keywords',
  'secondary keywords': 'secondary_keywords',
  'featured image': 'featured_image',
  'featured image url': 'featured_image',
  'image url': 'featured_image',
  'seo content': 'seo_content',
  'seo content html': 'seo_content',
  'content html': 'seo_content',
  'faq': 'faq',
  'faq json': 'faq',
}

export const IMPORTABLE_TOOL_FIELDS = [
  'name',
  'slug',
  'icon',
  'description',
  'long_description',
  'category_id',
  'status',
  'sort_order',
  'is_featured',
  'is_trending',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'primary_keywords',
  'secondary_keywords',
  'featured_image',
  'seo_content',
  'faq',
]

export const TOOL_SEO_ONLY_FIELDS = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'primary_keywords',
  'secondary_keywords',
  'featured_image',
  'seo_content',
  'faq',
]

export const TOOL_CONTENT_ONLY_FIELDS = [
  'description',
  'long_description',
  'seo_content',
  'faq',
  'featured_image',
]

const normalizeKey = (key) =>
  String(key ?? '').toLowerCase().trim().replace(/[\s_-]+/g, ' ')

const normalizeSlug = (value) =>
  String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const normalizeLookup = (value) => String(value ?? '').trim().toLowerCase()

const hasValue = (value) => {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return String(value).trim() !== ''
}

const isValidUrl = (value) => {
  if (!hasValue(value)) return true
  try {
    new URL(String(value))
    return true
  } catch {
    return false
  }
}

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value
  return ['true', '1', 'yes', 'y', 'on'].includes(String(value ?? '').toLowerCase().trim())
}

const parseNumber = (value) => {
  if (!hasValue(value)) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseFaq = (value) => {
  if (!hasValue(value)) return { ok: true, value: undefined }
  if (Array.isArray(value)) return validateFaqArray(value)
  try {
    const parsed = JSON.parse(String(value))
    const list = Array.isArray(parsed) ? parsed : parsed.faq ?? parsed.faq_items ?? parsed.faqs
    return validateFaqArray(list)
  } catch (error) {
    return { ok: false, error: `FAQ JSON is invalid: ${error.message}` }
  }
}

const validateFaqArray = (value) => {
  if (!Array.isArray(value)) return { ok: false, error: 'FAQ JSON must be an array of {question, answer} objects' }
  const cleaned = value
    .map((item) => ({
      question: String(item?.question ?? '').trim(),
      answer: String(item?.answer ?? '').trim(),
    }))
    .filter((item) => item.question && item.answer)

  if (cleaned.length !== value.length) {
    return { ok: false, error: 'Every FAQ item must include question and answer strings' }
  }

  return { ok: true, value: cleaned }
}

const hasUnsafeHtml = (html) => /<\s*(script|iframe|object|embed)\b/i.test(String(html ?? '')) || /\son[a-z]+\s*=/i.test(String(html ?? ''))

const mapRow = (rawRow) => {
  const mapped = {}
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    const field = FIELD_ALIASES[normalizeKey(key)]
    if (field && hasValue(value)) mapped[field] = value
  })
  return mapped
}

const getFileType = (name) => {
  const ext = String(name).split('.').pop().toLowerCase()
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx'
  if (ext === 'csv') return 'csv'
  if (ext === 'json') return 'json'
  if (['html', 'htm'].includes(ext)) return 'html'
  if (ext === 'zip') return 'zip'
  return null
}

export const getToolSeoImportFileType = getFileType

export const parseToolSeoExcelFile = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' }).map(mapRow)
}

export const parseToolSeoCsvFile = (text) => {
  const workbook = XLSX.read(text, { type: 'string' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' }).map(mapRow)
}

export const parseToolSeoJsonFile = (text) => {
  const raw = JSON.parse(text)
  const rows = Array.isArray(raw) ? raw : raw.tools ?? raw.data ?? raw.items ?? [raw]
  return rows.map(mapRow)
}

export const parseToolSeoHtmlFile = (html, filename = '') => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const article = doc.querySelector('article, main, .seo-content, .content') || doc.body
  const slug =
    doc.querySelector('[data-slug]')?.getAttribute('data-slug') ||
    doc.querySelector('meta[name="slug"]')?.getAttribute('content') ||
    filename.replace(/\.(html|htm)$/i, '')
  const name =
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.trim() ||
    ''

  return [mapRow({
    slug,
    name,
    'seo title': doc.querySelector('title')?.textContent?.trim() || '',
    'seo description': doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    'seo content': article?.innerHTML || html,
  })]
}

export const parseToolSeoZipFile = async (arrayBuffer) => {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const rows = []
  const files = Object.values(zip.files).filter((file) => !file.dir && /\.(html|htm)$/i.test(file.name))

  for (const file of files) {
    const html = await file.async('string')
    rows.push(...parseToolSeoHtmlFile(html, file.name.split('/').pop()))
  }

  return rows
}

const normalizeRow = (rawRow, categories) => {
  const row = { ...rawRow }

  if (hasValue(row.slug)) row.slug = normalizeSlug(row.slug)
  if (hasValue(row.name)) row.name = String(row.name).trim()
  if (hasValue(row.status)) row.status = String(row.status).toLowerCase().trim()
  if (row.sort_order !== undefined) row.sort_order = parseNumber(row.sort_order)
  if (row.is_featured !== undefined) row.is_featured = parseBoolean(row.is_featured)
  if (row.is_trending !== undefined) row.is_trending = parseBoolean(row.is_trending)

  ;['long_description', 'seo_content'].forEach((field) => {
    if (hasValue(row[field])) row[field] = sanitizeHtml(row[field])
  })

  const faq = parseFaq(row.faq)
  if (faq.ok && faq.value !== undefined) row.faq = faq.value
  row._faqError = faq.ok ? null : faq.error

  if (hasValue(row.category_name)) {
    const search = normalizeLookup(row.category_name)
    const found = categories.find((c) => normalizeLookup(c.name) === search || normalizeLookup(c.slug) === search)
    if (found) row.category_id = found.id
  }

  return row
}

const findToolMatch = (row, tools) => {
  if (row.slug) {
    const bySlug = tools.find((tool) => normalizeLookup(tool.slug) === normalizeLookup(row.slug))
    if (bySlug) return { tool: bySlug, matchedBy: 'slug' }
  }

  if (row.name) {
    const byName = tools.find((tool) => normalizeLookup(tool.name) === normalizeLookup(row.name))
    if (byName) return { tool: byName, matchedBy: 'name' }
  }

  return { tool: null, matchedBy: null }
}

const buildPatch = (row, currentTool, options = {}) => {
  const requestedFields = IMPORTABLE_TOOL_FIELDS.filter((field) => row[field] !== undefined)
  let allowedFields = requestedFields

  if (options.updateSeoOnly) allowedFields = allowedFields.filter((field) => TOOL_SEO_ONLY_FIELDS.includes(field))
  if (options.updateContentOnly) allowedFields = allowedFields.filter((field) => TOOL_CONTENT_ONLY_FIELDS.includes(field))
  if (options.skipExistingSeo) {
    allowedFields = allowedFields.filter((field) => !TOOL_SEO_ONLY_FIELDS.includes(field) || !hasValue(currentTool[field]))
  }

  const patch = {}
  const changes = []

  allowedFields.forEach((field) => {
    if (['slug', 'name'].includes(field)) return
    const nextValue = row[field]
    if (nextValue === undefined) return
    if (options.updateOnlyEmpty && hasValue(currentTool[field])) return

    const currentSerialized = JSON.stringify(currentTool[field] ?? null)
    const nextSerialized = JSON.stringify(nextValue ?? null)
    if (currentSerialized !== nextSerialized) {
      patch[field] = nextValue
      changes.push({ field, current: currentTool[field] ?? '', next: nextValue ?? '' })
    }
  })

  return { patch, changes }
}

export const processToolSeoImportData = (rawRows, tools, categories, options = {}) => {
  const batchKeys = new Set()

  const rows = rawRows.map((raw, idx) => {
    const row = normalizeRow(raw, categories)
    const errors = []
    const warnings = []

    if (!row.slug && !row.name) errors.push('Slug or Tool Name is required')

    const duplicateKey = row.slug ? `slug:${row.slug}` : `name:${normalizeLookup(row.name)}`
    if (batchKeys.has(duplicateKey)) errors.push(`Duplicate row in file for ${row.slug || row.name}`)
    batchKeys.add(duplicateKey)

    const { tool, matchedBy } = findToolMatch(row, tools)
    if (!tool) errors.push('No existing tool matched by slug or tool name')

    if (row.category_name && !row.category_id) errors.push(`Category "${row.category_name}" was not found`)
    if (row.status && !['draft', 'published', 'archived'].includes(row.status)) errors.push('Status must be draft, published, or archived')
    if (row.icon && !ICON_MAP[row.icon]) errors.push(`Icon "${row.icon}" is not available in the current icon map`)
    if (row.sort_order === undefined && raw.sort_order !== undefined) errors.push('Sort Order must be a number')
    if (row.featured_image && !isValidUrl(row.featured_image)) errors.push('Featured Image URL is invalid')
    if (row._faqError) errors.push(row._faqError)
    ;['long_description', 'seo_content'].forEach((field) => {
      if (hasUnsafeHtml(raw[field])) warnings.push(`${field} contained unsafe HTML and was sanitized`)
    })

    const preview = tool ? buildPatch(row, tool, options) : { patch: {}, changes: [] }
    if (tool && preview.changes.length === 0) warnings.push('No field changes after applying import options')

    return {
      _rowIndex: idx + 2,
      _errors: errors,
      _warnings: warnings,
      _isValid: errors.length === 0,
      _matchedTool: tool,
      _matchedBy: matchedBy,
      _patch: preview.patch,
      _changes: preview.changes,
      ...row,
    }
  })

  return {
    rows,
    totalRows: rows.length,
    totalValid: rows.filter((row) => row._isValid).length,
    totalInvalid: rows.filter((row) => !row._isValid).length,
    totalMatched: rows.filter((row) => row._matchedTool).length,
    totalChanged: rows.filter((row) => row._changes.length > 0).length,
    totalWarnings: rows.filter((row) => row._warnings.length > 0).length,
  }
}

export const prepareToolSeoUpdate = (row) => ({ ...row._patch })

export const buildToolSeoRollbackData = (row) => {
  const rollback = {}
  row._changes.forEach(({ field, current }) => {
    rollback[field] = current === '' ? null : current
  })
  return {
    id: row._matchedTool.id,
    slug: row._matchedTool.slug,
    name: row._matchedTool.name,
    previous: rollback,
  }
}
