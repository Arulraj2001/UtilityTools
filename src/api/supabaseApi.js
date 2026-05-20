import { supabase } from './supabaseClient';

const handleResponse = (result) => {
  if (result.error) {
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

  if (typeof orderBy === 'string' && orderBy.includes(',')) {
    return orderBy.split(',').reduce((q, spec) => {
      const [column, direction] = spec.trim().split(/\s+/);
      return column ? q.order(column, { ascending: direction?.toLowerCase() !== 'desc' }) : q;
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
  const result = await supabase.from('blog_categories').select('*').eq('slug', slug).single()
  return handleResponse(result)
};

export const getBlogPostsByCategorySlug = async (slug, { published = true, orderBy = 'created_at', ascending = false, limit = 200 } = {}) => {
  const categoryResult = await supabase.from('blog_categories').select('id').eq('slug', slug).single()
  const category = handleResponse(categoryResult)
  if (!category?.id) return []

  let query = supabase.from('blog_posts').select('*, blog_categories(id,name,slug)').eq('category_id', category.id)
  if (published) query = query.eq('status', 'published')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
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
  const result = await supabase.from('tools').select('*').eq('slug', slug).single();
  return handleResponse(result);
};

export const getBlogPostBySlug = async (slug) => {
  const result = await supabase.from('blog_posts')
    .select('*, blog_categories(id,name,slug,description,icon,color,featured_image)')
    .eq('slug', slug)
    .single();
  return handleResponse(result);
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
