const RETIRED_TOOL_SLUGS = new Set(['pdf-to-word'])

const CATEGORY_META = {
  finance: { name: 'Finance', description: 'Finance tools for calculations and money management.', icon: 'IndianRupee', color: '#0f766e', sort_order: 10 },
  education: { name: 'Education', description: 'Education and learning tools for students and teachers.', icon: 'GraduationCap', color: '#2563eb', sort_order: 20 },
  'text-tools': { name: 'Text Tools', description: 'Text processing tools for formatting, counting, and converting text.', icon: 'TextCursorInput', color: '#9333ea', sort_order: 30 },
  'developer-tools': { name: 'Developer Tools', description: 'Developer utilities for code and web development.', icon: 'Terminal', color: '#047857', sort_order: 40 },
  'daily-life': { name: 'Daily Life', description: 'Everyday tools for schedules, utilities, and small tasks.', icon: 'Sparkles', color: '#ea580c', sort_order: 50 },
  'image-tools': { name: 'Image Tools', description: 'Tools for resizing, converting, analyzing and optimizing images.', icon: 'Image', color: '#2563eb', sort_order: 55 },
  'pdf-tools': { name: 'PDF Tools', description: 'PDF manipulation tools for merging, splitting, converting, and editing PDFs.', icon: 'FileText', color: '#dc2626', sort_order: 60 },
  'government-exam-tools': { name: 'Government Exam Tools', description: 'Tools for government exam photo, document, and PDF preparation.', icon: 'FileBadge', color: '#0f766e', sort_order: 65 },
  'health-fitness': { name: 'Health & Fitness Tools', description: 'Health and fitness calculators for body measurements, calories, wellness, and planning.', icon: 'HeartPulse', color: '#ef4444', sort_order: 70 },
  'relationship-tools': { name: 'Relationship & Lifestyle Tools', description: 'Entertainment-focused relationship, compatibility, and lifestyle calculators.', icon: 'Heart', color: '#ec4899', sort_order: 75 },
  'creator-tools': { name: 'Creator & Social Media Tools', description: 'Creator tools for social media planning, thumbnails, analytics, and content workflows.', icon: 'Youtube', color: '#ff0000', sort_order: 76 },
  'ecommerce-seller-tools': { name: 'E-commerce Seller Tools', description: 'E-commerce calculators for marketplace fees, pricing, inventory, invoices, ROI, and profit planning.', icon: 'ShoppingBag', color: '#0ea5e9', sort_order: 79 },
  'date-time-tools': { name: 'Date & Time Tools', description: 'Date and time calculators for schedules, timestamps, business days, and timezone planning.', icon: 'Clock3', color: '#0d9488', sort_order: 80 },
  'seo-tools': { name: 'SEO Tools', description: 'SEO utilities for metadata, schema, sitemaps, robots files, keywords, and technical checks.', icon: 'SearchCode', color: '#059669', sort_order: 90 },
  'logistics-shipping': { name: 'Logistics & Shipping Tools', description: 'Shipping calculators for courier charges, volumetric weight, CBM, parcel dimensions, and freight planning.', icon: 'Package', color: '#0f766e', sort_order: 95 },
  'math-tools': { name: 'Math Tools', description: 'Math calculators for percentages, ratios, averages, fractions, and everyday numerical checks.', icon: 'Calculator', color: '#0ea5e9', sort_order: 100 },
  'seller-tools': { name: 'Seller Tools', description: 'Seller business tools for pricing, marketplace profit, invoices, GST, stock, ROI, and operations.', icon: 'ShoppingBag', color: '#0ea5e9', sort_order: 105 },
}

let prebuiltToolsPromise

const loadPrebuiltTools = async () => {
  if (!prebuiltToolsPromise) {
    prebuiltToolsPromise = import('@/lib/toolsData').then((module) => module.PREBUILT_TOOLS || [])
  }
  return prebuiltToolsPromise
}

const titleFromSlug = (slug = '') => (
  slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
)

const normalizeTool = (tool, index = 0) => ({
  ...tool,
  id: tool.id || tool.slug,
  category_id: tool.category_id || tool.category_slug,
  category_slug: tool.category_slug || tool.category_id,
  status: tool.status || 'published',
  usage_count: tool.usage_count || 0,
  sort_order: tool.sort_order || index + 1,
  created_at: tool.created_at || tool.created_date || '2026-06-01T00:00:00.000Z',
  updated_at: tool.updated_at || tool.created_at || tool.created_date || '2026-06-01T00:00:00.000Z',
})

const normalizeCategory = (slug, toolCount = 0, index = 0) => {
  const meta = CATEGORY_META[slug] || {}
  const name = meta.name || titleFromSlug(slug)

  return {
    id: slug,
    slug,
    name,
    description: meta.description || `Useful ${name.toLowerCase()} on QuickUtils.`,
    icon: meta.icon || 'Folder',
    color: meta.color || '#64748b',
    status: 'published',
    is_featured: true,
    tool_count: toolCount,
    sort_order: meta.sort_order || (index + 1) * 10,
  }
}

const compareValues = (a, b, column, ascending) => {
  const av = a?.[column]
  const bv = b?.[column]

  if (av === bv) return 0
  if (av === undefined || av === null) return 1
  if (bv === undefined || bv === null) return -1

  if (column.includes('created') || column.includes('updated')) {
    const at = new Date(av).getTime()
    const bt = new Date(bv).getTime()
    return ascending ? at - bt : bt - at
  }

  if (typeof av === 'number' && typeof bv === 'number') {
    return ascending ? av - bv : bv - av
  }

  return ascending
    ? String(av).localeCompare(String(bv))
    : String(bv).localeCompare(String(av))
}

const applyToolFilters = (tools, { published = true, filters = {} } = {}) => (
  tools.filter((tool) => {
    if (!tool?.slug || RETIRED_TOOL_SLUGS.has(tool.slug)) return false
    if (published && tool.status !== 'published') return false
    if (filters?.is_featured !== undefined && Boolean(tool.is_featured) !== filters.is_featured) return false
    if (filters?.is_trending !== undefined && Boolean(tool.is_trending) !== filters.is_trending) return false
    if (filters?.category_id && tool.category_id !== filters.category_id && tool.category_slug !== filters.category_id) return false
    if (Array.isArray(filters?.categoryIds) && filters.categoryIds.length > 0) {
      return filters.categoryIds.includes(tool.category_id) || filters.categoryIds.includes(tool.category_slug)
    }
    return true
  })
)

export const getLocalTools = async ({
  published = true,
  orderBy = 'sort_order',
  ascending = true,
  limit = 200,
  filters = {},
} = {}) => {
  const prebuilt = await loadPrebuiltTools()
  const column = Array.isArray(orderBy)
    ? orderBy[0]?.split(/\s+/)?.[0] || 'sort_order'
    : String(orderBy || 'sort_order').split(',')[0].trim().split(/\s+/)[0]
  const rows = applyToolFilters(prebuilt.map(normalizeTool), { published, filters })
    .sort((a, b) => compareValues(a, b, column, ascending))

  return limit ? rows.slice(0, limit) : rows
}

export const getLocalCategories = async ({ orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  const tools = await getLocalTools({ limit: 0 })
  const counts = new Map()

  for (const tool of tools) {
    const slug = tool.category_slug || tool.category_id
    if (!slug) continue
    counts.set(slug, (counts.get(slug) || 0) + 1)
  }

  const column = String(orderBy || 'sort_order').split(',')[0].trim().split(/\s+/)[0]
  const rows = [...counts.entries()]
    .map(([slug, count], index) => normalizeCategory(slug, count, index))
    .sort((a, b) => compareValues(a, b, column, ascending))

  return limit ? rows.slice(0, limit) : rows
}

export const getLocalToolBySlug = async (slug, { published = true } = {}) => {
  if (!slug || RETIRED_TOOL_SLUGS.has(slug)) return null
  const tools = await getLocalTools({ published, limit: 0 })
  return tools.find((tool) => tool.slug === slug) || null
}
