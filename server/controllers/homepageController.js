import { createAnonClient } from '../lib/supabase.js';
import { sendJson } from '../lib/response.js';

const RETIRED_TOOL_SLUGS = ['pdf-to-word'];

const excludeRetiredTools = (query) => (
  RETIRED_TOOL_SLUGS.reduce((nextQuery, slug) => nextQuery.neq('slug', slug), query)
);

const dataOrThrow = (result) => {
  if (result.error) throw result.error;
  return result.data || [];
};

export const getHomepageSummary = async (req, res) => {
  try {
    const supabase = createAnonClient();
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
    ]);

    const tools = dataOrThrow(toolsResult);
    const usageRows = dataOrThrow(usageResult);

    sendJson(res, 200, {
      categories: dataOrThrow(categoriesResult),
      tools,
      totalUsage: usageRows.reduce((total, tool) => total + (tool.usage_count || 0), 0),
      featuredWorkflows: dataOrThrow(workflowsResult),
      featuredJobs: dataOrThrow(jobsResult),
      generatedAt: new Date().toISOString(),
    }, {
      'Cache-Control': 'public,max-age=300,s-maxage=300',
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || 'Unable to load homepage summary',
    });
  }
};
