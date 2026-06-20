import { supabase } from './supabaseClient'
import { getLocalCategories, getLocalToolBySlug, getLocalTools } from '@/lib/localCatalogFallback'
import { withDefaultToolFeaturedImage, withDefaultToolFeaturedImages } from '@/lib/toolFeaturedImages'

const RETIRED_TOOL_SLUGS = ['pdf-to-word']

const excludeRetiredTools = (query) => (
  RETIRED_TOOL_SLUGS.reduce((nextQuery, slug) => nextQuery.neq('slug', slug), query)
)

const isRetiredToolSlug = (slug) => RETIRED_TOOL_SLUGS.includes(slug)

const handleResponse = (result) => {
  if (result.error) throw result.error
  return result.data || []
}

const TOOL_PAGE_FIELDS = [
  'id',
  'name',
  'slug',
  'description',
  'long_description',
  'category_id',
  'icon',
  'status',
  'is_featured',
  'is_trending',
  'usage_count',
  'input_fields',
  'formula_type',
  'formula_config',
  'output_type',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'primary_keywords',
  'secondary_keywords',
  'featured_image',
  'faq',
  'seo_content',
  'created_at',
  'updated_at',
].join(',')

export const getToolPageBySlug = async (slug, { published = true } = {}) => {
  if (isRetiredToolSlug(slug)) return null

  let query = supabase.from('tools').select(TOOL_PAGE_FIELDS).eq('slug', slug)
  if (published) query = query.eq('status', 'published')

  const result = await query.maybeSingle()
  if (result.error) {
    console.error('getToolPageBySlug error:', result.error)
    return getLocalToolBySlug(slug, { published })
  }
  if (result.data) return withDefaultToolFeaturedImage(result.data)
  return getLocalToolBySlug(slug, { published })
}

export const getToolPageRelatedTools = async ({ limit = 20, categoryId = null } = {}) => {
  let query = excludeRetiredTools(supabase
    .from('tools')
    .select('id,name,slug,description,icon,category_id,featured_image,is_featured,is_trending,usage_count,sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true }))
  // When a categoryId is provided, scope to that category for related tools (much more efficient)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (limit) query = query.limit(Math.min(limit, 50))
  const result = await query
  if (result.error) {
    console.error('getToolPageRelatedTools error:', result.error)
    return getLocalTools({ limit, filters: categoryId ? { category_id: categoryId } : {} })
  }

  const rows = result.data || []
  if (rows.length === 0) {
    return getLocalTools({ limit, filters: categoryId ? { category_id: categoryId } : {} })
  }

  return withDefaultToolFeaturedImages(rows)
}

export const getToolPageCategories = async () => {
  const result = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('sort_order', { ascending: true })
    .limit(200)

  if (result.error) {
    console.error('getToolPageCategories error:', result.error)
    return getLocalCategories({ limit: 200 })
  }

  const rows = result.data || []
  if (rows.length === 0) {
    return getLocalCategories({ limit: 200 })
  }

  return rows
}

export const getToolPageBlogPosts = async ({ limit = 50 } = {}) => {
  const result = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,featured_image,created_at,seo_keywords,tags,category_id,blog_categories(id)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
  return handleResponse(result)
}

export const getToolPageWorkflows = async ({ limit = 12 } = {}) => {
  const result = await supabase
    .from('workflow_pages')
    .select('id,title,slug,excerpt,updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit)
  return handleResponse(result)
}

/**
 * Atomically increments the usage_count for a tool using a Postgres RPC.
 * This eliminates the read-then-write race condition at concurrent load.
 *
 * Required Postgres function (run once in Supabase SQL editor):
 *   CREATE OR REPLACE FUNCTION increment_tool_usage(tool_id uuid)
 *   RETURNS void LANGUAGE sql AS $$
 *     UPDATE tools SET usage_count = COALESCE(usage_count, 0) + 1
 *     WHERE id = tool_id;
 *   $$;
 */
export const incrementToolPageUsage = async (id) => {
  if (!id) return null
  try {
    const result = await supabase.rpc('increment_tool_usage', { tool_id: id })
    if (result.error) {
      // Graceful fallback: if the RPC doesn't exist yet, silently skip
      // (does not throw — usage count is non-critical)
      const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true);
      if (isDev) {
        console.warn('increment_tool_usage RPC not found; usage count not updated:', result.error.message)
      }
    }
  } catch {
    // Non-critical — never let usage tracking break the tool page
  }
  return null
}

/**
 * @deprecated Use incrementToolPageUsage instead (avoids race condition).
 * Kept only for backward compatibility with older callers.
 */
export const updateToolPageUsage = incrementToolPageUsage
