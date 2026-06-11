import { supabase } from './supabaseClient'
import { buildApiUrl } from './apiBase.js'

const RETIRED_TOOL_SLUGS = ['pdf-to-word']

const excludeRetiredTools = (query) => (
  RETIRED_TOOL_SLUGS.reduce((nextQuery, slug) => nextQuery.neq('slug', slug), query)
)

const handleResponse = (result) => {
  if (result.error) throw result.error
  return result.data || []
}

export const getHomepageCategories = async () => {
  const result = await supabase
    .from('categories')
    .select('id,name,slug,description,icon,color,status,is_featured,tool_count,sort_order')
    .order('sort_order', { ascending: true })
    .limit(50)
  return handleResponse(result)
}

export const getHomepageTools = async ({ limit = 200 } = {}) => {
  let query = excludeRetiredTools(supabase
    .from('tools')
    .select('id,name,slug,description,icon,category_id,status,is_featured,is_trending,usage_count,sort_order,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false }))

  if (limit) query = query.limit(limit)
  return handleResponse(await query)
}

export const getHomepageTotalUsageCount = async () => {
  const result = await excludeRetiredTools(
    supabase.from('tools').select('usage_count').eq('status', 'published')
  )
  const data = handleResponse(result)
  return data.reduce((total, tool) => total + (tool.usage_count || 0), 0)
}

export const getHomepageFeaturedWorkflows = async ({ limit = 6 } = {}) => {
  const result = await supabase
    .from('workflow_pages')
    .select('id,title,slug,excerpt,status,is_featured,updated_at')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit)
  return handleResponse(result)
}

export const getHomepageFeaturedJobs = async ({ limit = 6 } = {}) => {
  const result = await supabase
    .from('jobs')
    .select('id,title,slug,organization,location,short_description,status,featured,last_date')
    .eq('status', 'published')
    .eq('featured', true)
    .order('last_date', { ascending: false })
    .limit(limit)
  return handleResponse(result)
}

const fetchCachedHomepageSummary = async () => {
  if (typeof window === 'undefined') return null
  const response = await fetch(buildApiUrl('/api/homepage'), {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  })
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error('Homepage cache endpoint unavailable')
  }
  return response.json()
}

export const getHomepageSummary = async () => {
  try {
    const cached = await fetchCachedHomepageSummary()
    if (cached) return cached
  } catch {
    // Local Vite/dev environments do not have the Vercel function.
  }

  const [categories, tools, totalUsage, featuredWorkflows, featuredJobs] = await Promise.all([
    getHomepageCategories(),
    getHomepageTools({ limit: 200 }),
    getHomepageTotalUsageCount(),
    getHomepageFeaturedWorkflows({ limit: 6 }),
    getHomepageFeaturedJobs({ limit: 6 }),
  ])

  return {
    categories,
    tools,
    totalUsage,
    featuredWorkflows,
    featuredJobs,
    generatedAt: new Date().toISOString(),
  }
}
