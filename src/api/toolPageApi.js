import { supabase } from './supabaseClient'

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
    return null
  }
  return result.data || null
}

export const getToolPageRelatedTools = async ({ limit = 200 } = {}) => {
  let query = excludeRetiredTools(supabase
    .from('tools')
    .select('id,name,slug,description,icon,category_id,is_featured,is_trending,usage_count,sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true }))
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
}

export const getToolPageCategories = async () => {
  const result = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('sort_order', { ascending: true })
    .limit(200)
  return handleResponse(result)
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

export const updateToolPageUsage = async (id, usageCount) => {
  if (!id) return null
  const result = await supabase
    .from('tools')
    .update({ usage_count: usageCount, updated_at: new Date() })
    .eq('id', id)
  return handleResponse(result)
}
