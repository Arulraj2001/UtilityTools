import { supabase } from './supabaseClient';

const handleResponse = (result) => {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    if (result.error.details || result.error.hint) {
      console.error('Supabase policy error details:', {
        details: result.error.details,
        hint: result.error.hint,
      });
    }
    throw result.error;
  }
  return result.data || [];
};

const sortParams = (query, orderBy, ascending) => {
  if (!orderBy) return query;

  if (Array.isArray(orderBy)) {
    orderBy.forEach((order) => {
      const [column, direction] = order.trim().split(/\s+/);
      if (column) {
        query = query.order(column, { ascending: direction?.toLowerCase() !== 'desc' });
      }
    });
    return query;
  }

  if (typeof orderBy === 'string') {
    return orderBy
      .split(',')
      .map((spec) => spec.trim())
      .filter(Boolean)
      .reduce((q, spec) => {
        const [column, direction] = spec.split(/\s+/);
        return column ? q.order(column, { ascending: direction ? direction.toLowerCase() !== 'desc' : ascending }) : q;
      }, query);
  }

  return query.order(orderBy, { ascending });
};

export const getTools = async ({ published = true, orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  let query = supabase.from('tools').select('*');
  if (published) query = query.eq('status', 'published');
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getToolsAll = async ({ orderBy = 'created_at', ascending = false, limit = 200 } = {}) => {
  let query = supabase.from('tools').select('*');
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getToolsWithCategories = async ({ published = true, orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  let query = supabase.from('tools').select('*, categories(id,name,slug)');
  if (published) query = query.eq('status', 'published');
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getCategories = async ({ orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  let query = supabase.from('categories').select('*');
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

// Lightweight per-category counts without fetching whole tool records.
// Uses PostgREST head/count to request only counts per category.
export const getCategoryCounts = async ({ categoryIds = [], published = true } = {}) => {
  // If no category IDs provided, return empty map quickly
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return {};

  // Use a single RPC call to fetch grouped counts for published tools.
  // The RPC `get_published_tool_counts` is defined in `supabase_schema.sql` and
  // returns rows: { category_id, published_tool_count }.
  try {
    const params = { ids: categoryIds };
    const { data, error } = await supabase.rpc('get_published_tool_counts', params);
    if (error) {
      console.error('getCategoryCounts RPC error:', error);
      // fallback to per-category counting if RPC fails
    } else if (Array.isArray(data)) {
      const map = {};
      data.forEach((r) => {
        if (r && r.category_id) map[r.category_id] = Number(r.published_tool_count || 0);
      });
      return map;
    }
  } catch (err) {
    console.error('getCategoryCounts unexpected error:', err);
  }

  // RPC unavailable or errored: fall back to per-category head count requests
  const counts = {};
  await Promise.all(categoryIds.map(async (id) => {
    let q = supabase.from('tools').select('id', { count: 'exact', head: true }).eq('category_id', id);
    if (published) q = q.eq('status', 'published');
    const res = await q;
    counts[id] = (res && typeof res.count === 'number') ? res.count : 0;
  }));
  return counts;
};

export const getBlogPosts = async ({ published = true, orderBy = 'created_at', ascending = false, limit = 200, includeCategory = true } = {}) => {
  const selectFields = includeCategory
    ? '*, blog_categories(id,name,slug,description,icon,color,featured_image,seo_title,seo_description)'
    : '*'

  let query = supabase.from('blog_posts').select(selectFields)
  if (published) query = query.eq('status', 'published')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
};

export const getBlogCategories = async ({ orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  let query = supabase.from('blog_categories').select('*')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
};

export const getBlogCategoryBySlug = async (slug) => {
  const result = await supabase.from('blog_categories').select('*').eq('slug', slug).maybeSingle()
  if (result.error) {
    // Don't throw on missing categories — surface unexpected errors only
    console.error('getBlogCategoryBySlug error:', result.error)
    return null
  }
  return result.data || null
};

export const getBlogPostsByCategorySlug = async (slug, { published = true, orderBy = 'created_at', ascending = false, limit = 200 } = {}) => {
  const categoryResult = await supabase.from('blog_categories').select('id').eq('slug', slug).maybeSingle()
  if (categoryResult.error) {
    console.error('getBlogPostsByCategorySlug error fetching category:', categoryResult.error)
    return []
  }
  const category = categoryResult.data
  if (!category?.id) return []

  let query = supabase.from('blog_posts').select('*, blog_categories(id,name,slug)').eq('category_id', category.id)
  if (published) query = query.eq('status', 'published')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
};

export const getWorkflowPages = async ({ published = true, orderBy = 'updated_at', ascending = false, limit = 200 } = {}) => {
  let query = supabase.from('workflow_pages').select('*')
  if (published) query = query.eq('status', 'published')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
};

export const getWorkflowPageBySlug = async (slug) => {
  const result = await supabase.from('workflow_pages').select('*').eq('slug', slug).maybeSingle();
  if (result.error) {
    console.error('getWorkflowPageBySlug error:', result.error)
    return null
  }
  return result.data || null
};

export const createWorkflowPage = async (page) => {
  const result = await supabase.from('workflow_pages').insert([{ ...page }])
  return handleResponse(result)
};

export const updateWorkflowPage = async (id, page) => {
  const result = await supabase.from('workflow_pages').update({ ...page, updated_at: new Date() }).eq('id', id)
  return handleResponse(result)
};

export const deleteWorkflowPage = async (id) => {
  const result = await supabase.from('workflow_pages').delete().eq('id', id)
  return handleResponse(result)
};

export const getFeaturedWorkflows = async ({ limit = 6 } = {}) => {
  let query = supabase.from('workflow_pages').select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit)
  return handleResponse(await query)
};

export const searchWorkflowPages = async (query) => {
  if (!query || query.length < 2) return []
  const searchQuery = query.toLowerCase()
  let result = await supabase.from('workflow_pages').select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
    .limit(10)
  return handleResponse(result)
};

export const searchAll = async (query) => {
  if (!query || query.length < 2) return { tools: [], workflows: [] }
  
  const [toolsResult, workflowsResult] = await Promise.all([
    searchTools(query),
    searchWorkflowPages(query)
  ])
  
  return {
    tools: toolsResult || [],
    workflows: workflowsResult || []
  }
};

export const getRedirects = async ({ orderBy = 'created_at', ascending = false, limit = 200 } = {}) => {
  let query = supabase.from('redirects').select('*')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
};

/**
 * Fetch ad placements with optional active filter.
 * @param {{orderBy?: string, ascending?: boolean, limit?: number, isActive?: boolean, pageType?: string}} [options]
 */
export const getAdPlacements = async ({ orderBy = 'created_at', ascending = false, limit = 200, isActive, pageType } = {}) => {
  let query = supabase.from('ad_placements').select('*');
  if (isActive !== undefined) query = query.eq('is_active', isActive);
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getSiteSettings = async () => {
  const result = await supabase.from('site_settings').select('*');
  return handleResponse(result);
};

export const searchTools = async (searchQuery, { limit = 8 } = {}) => {
  if (!searchQuery) return [];
  const query = supabase
    .from('tools')
    .select('*')
    .eq('status', 'published')
    .or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
    )
    .limit(limit);
  return handleResponse(await query);
};

export const createTool = async (tool) => {
  const result = await supabase.from('tools').insert([{ ...tool }]);
  return handleResponse(result);
};

export const updateTool = async (id, tool) => {
  const result = await supabase.from('tools').update({ ...tool, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteTool = async (id) => {
  const result = await supabase.from('tools').delete().eq('id', id);
  return handleResponse(result);
};

export const createCategory = async (category) => {
  const result = await supabase.from('categories').insert([{ ...category }]);
  return handleResponse(result);
};

export const updateCategory = async (id, category) => {
  const result = await supabase.from('categories').update({ ...category, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteCategory = async (id) => {
  const result = await supabase.from('categories').delete().eq('id', id);
  return handleResponse(result);
};

export const createBlogCategory = async (category) => {
  const result = await supabase.from('blog_categories').insert([{ ...category }]);
  return handleResponse(result);
};

export const updateBlogCategory = async (id, category) => {
  const result = await supabase.from('blog_categories').update({ ...category, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteBlogCategory = async (id) => {
  const result = await supabase.from('blog_categories').delete().eq('id', id);
  return handleResponse(result);
};

export const createBlogPost = async (post) => {
  const result = await supabase.from('blog_posts').insert([{ ...post }]);
  return handleResponse(result);
};

export const updateBlogPost = async (id, post) => {
  const result = await supabase.from('blog_posts').update({ ...post, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteBlogPost = async (id) => {
  const result = await supabase.from('blog_posts').delete().eq('id', id);
  return handleResponse(result);
};

export const createAdPlacement = async (adPlacement) => {
  const result = await supabase.from('ad_placements').insert([{ ...adPlacement }]);
  return handleResponse(result);
};

export const updateAdPlacement = async (id, adPlacement) => {
  const result = await supabase.from('ad_placements').update({ ...adPlacement, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteAdPlacement = async (id) => {
  const result = await supabase.from('ad_placements').delete().eq('id', id);
  return handleResponse(result);
};

export const createRedirect = async (redirect) => {
  const result = await supabase.from('redirects').insert([{ ...redirect }]);
  return handleResponse(result);
};

export const deleteRedirect = async (id) => {
  const result = await supabase.from('redirects').delete().eq('id', id);
  return handleResponse(result);
};

export const createSiteSetting = async (setting) => {
  const result = await supabase.from('site_settings').insert([{ ...setting }]);
  if (result.error && /column.*\bgroup\b.*does not exist|missing column.*\bgroup\b/i.test(result.error.message)) {
    const fallback = { ...setting };
    delete fallback.group;
    const retry = await supabase.from('site_settings').insert([{ ...fallback }]);
    return handleResponse(retry);
  }
  return handleResponse(result);
};

export const updateSiteSetting = async (id, data) => {
  const result = await supabase.from('site_settings').update({ ...data, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const deleteSiteSetting = async (id) => {
  const result = await supabase.from('site_settings').delete().eq('id', id);
  return handleResponse(result);
};

export const getToolBySlug = async (slug) => {
  const result = await supabase.from('tools').select('*').eq('slug', slug).maybeSingle();
  if (result.error) {
    console.error('getToolBySlug error:', result.error)
    return null
  }
  return result.data || null
};

export const getBlogPostBySlug = async (slug) => {
  const result = await supabase.from('blog_posts')
    .select('*, blog_categories(id,name,slug,description,icon,color,featured_image)')
    .eq('slug', slug)
    .maybeSingle();
  if (result.error) {
    console.error('getBlogPostBySlug error:', result.error)
    return null
  }
  return result.data || null
};

export const updateToolUsage = async (id, usage_count) => {
  const result = await supabase.from('tools').update({ usage_count, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const getTotalUsageCount = async () => {
  const result = await supabase.from('tools').select('usage_count').eq('status', 'published');
  const data = handleResponse(result);
  return data.reduce((total, tool) => total + (tool.usage_count || 0), 0);
};

export const logAnalyticsEvent = async (eventType, eventData) => {
  if (!eventType) return [];

  const result = await supabase.from('analytics_events').insert([{
    event_type: eventType,
    event_data: eventData,
    page_url: eventData.page_url || eventData.path || '',
    session_id: eventData.session_id || null,
    user_agent: eventData.user_agent || null,
    device_type: eventData.deviceType || eventData.device_type || null,
    browser: eventData.browser || null,
  }]);

  if (result.error) {
    console.warn('Analytics event insert failed:', result.error.message);
    return [];
  }

  return result.data || [];
};

export const getAnalyticsEvents = async ({ limit = 1000, sinceDays = 90, eventType = null } = {}) => {
  const now = new Date();
  const fromDate = new Date(now.setDate(now.getDate() - sinceDays)).toISOString();
  let query = supabase.from('analytics_events').select('*').gte('created_at', fromDate).order('created_at', { ascending: false });

  if (eventType) query = query.eq('event_type', eventType);
  if (limit) query = query.limit(limit);

  const result = await query;

  if (result.error) {
    console.warn('Analytics query failed:', result.error.message);
    return [];
  }

  return handleResponse(result);
};
