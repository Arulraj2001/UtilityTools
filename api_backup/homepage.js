import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const RETIRED_TOOL_SLUGS = ['pdf-to-word']

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, detectSessionInUrl: false },
    })
  : null

const excludeRetiredTools = (query) => (
  RETIRED_TOOL_SLUGS.reduce((nextQuery, slug) => nextQuery.neq('slug', slug), query)
)

const dataOrThrow = (result) => {
  if (result.error) throw result.error
  return result.data || []
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!supabase) {
    res.status(500).json({ error: 'Supabase environment is not configured' })
    return
  }

  try {
    const [categoriesResult, toolsResult, usageResult, workflowsResult, jobsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id,name,slug,description,icon,color,status,is_featured,tool_count,sort_order')
        .order('sort_order', { ascending: true })
        .limit(50),
      excludeRetiredTools(supabase
        .from('tools')
        .select('id,name,slug,description,icon,category_id,status,is_featured,is_trending,usage_count,sort_order,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(200)),
      excludeRetiredTools(supabase
        .from('tools')
        .select('usage_count')
        .eq('status', 'published')),
      supabase
        .from('workflow_pages')
        .select('id,title,slug,excerpt,status,is_featured,updated_at')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('jobs')
        .select('id,title,slug,organization,location,short_description,status,featured,last_date')
        .eq('status', 'published')
        .eq('featured', true)
        .order('last_date', { ascending: false })
        .limit(6),
    ])

    const tools = dataOrThrow(toolsResult)
    const usageRows = dataOrThrow(usageResult)

    res.setHeader('Cache-Control', 'public,max-age=300,s-maxage=300')
    res.status(200).json({
      categories: dataOrThrow(categoriesResult),
      tools,
      totalUsage: usageRows.reduce((total, tool) => total + (tool.usage_count || 0), 0),
      featuredWorkflows: dataOrThrow(workflowsResult),
      featuredJobs: dataOrThrow(jobsResult),
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to load homepage summary' })
  }
}
