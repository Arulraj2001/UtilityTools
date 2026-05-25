import { supabase } from './supabaseClient';

const slugify = (value = '') => {
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const generateSlug = (title = '') => {
  const normalized = slugify(title)
  return normalized || `job-${Date.now().toString().slice(-6)}`
}

const escapeRegExp = (value = '') => value.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const generateUniqueJobSlug = async (slug, excludeId = null) => {
  const normalized = slugify(slug || '')
  if (!normalized) return generateSlug('job')

  let query = supabase.from('jobs').select('slug').or(`slug.eq.${normalized},slug.like.${normalized}-%`)
  if (excludeId) query = query.neq('id', excludeId)

  const result = await query
  if (result.error) {
    logSupabaseError('generateUniqueJobSlug', result.error)
    return normalized
  }

  const existingSlugs = Array.isArray(result.data) ? result.data.map((row) => row.slug).filter(Boolean) : []
  if (!existingSlugs.includes(normalized)) return normalized

  const suffixes = new Set()
  const escapedBase = escapeRegExp(normalized)
  const pattern = new RegExp(`^${escapedBase}-(\\d+)$`)

  existingSlugs.forEach((existing) => {
    const match = pattern.exec(existing)
    if (match) suffixes.add(Number(match[1]))
  })

  let suffix = 2
  while (suffixes.has(suffix) || existingSlugs.includes(`${normalized}-${suffix}`)) {
    suffix += 1
  }

  return `${normalized}-${suffix}`
}

const formatJobError = (error, slug = '', payload = null) => {
  const formatted = new Error(error.message || 'Failed to save job.')
  formatted.details = error?.details
  formatted.hint = error?.hint
  formatted.code = error?.code
  formatted.slug = slug

  // 409 Conflict - could be slug or canonical_url duplicate
  if (error?.code === '23505' || error?.status === 409 || /duplicate|conflict/i.test(error?.message || '')) {
    // Try to determine which field caused the conflict
    if (error?.details && /slug/i.test(error.details)) {
      formatted.message = `Slug "${slug}" already exists. The system auto-generates unique slugs, but you can also edit and try again.`
      formatted.fieldErrors = { slug: `The slug "${slug}" is already taken.` }
    } else if (error?.details && /canonical_url/i.test(error.details)) {
      formatted.message = 'This canonical URL is already used by another job. Please use a unique URL or leave it empty.'
      formatted.fieldErrors = { canonical_url: 'This canonical URL is already in use.' }
    } else {
      formatted.message = 'A conflict occurred. This might be due to a duplicate slug, URL, or other unique field. Please try adjusting the title or URL.'
      formatted.fieldErrors = {
        slug: 'Possible duplicate slug',
        canonical_url: 'Possible duplicate URL',
      }
    }
    formatted.hint = formatted.hint || 'Edit the job details and save again to resolve.'
  }

  return formatted
}

const validateJobPayload = (job) => {
  const title = `${job.title ?? ''}`.trim()
  const slug = slugify(job.slug || job.title || '')
  const status = job.status === 'published' ? 'published' : job.status === 'draft' ? 'draft' : ''
  const errors = {}

  if (!title) errors.title = 'Title is required.'
  if (!slug) errors.slug = 'Slug is required.'
  if (!['draft', 'published'].includes(job.status)) errors.status = 'Status must be draft or published.'

  if (Object.keys(errors).length > 0) {
    const validationError = new Error('Job validation failed.')
    validationError.fieldErrors = errors
    validationError.message = Object.values(errors).join(' ')
    throw validationError
  }

  return { title, slug, status }
}

/**
 * Production-grade error logging for Supabase operations.
 * Logs full context including payload, error code, and hints.
 * @param {string} operation - Operation name (e.g., 'createJob', 'updateJob')
 * @param {any} error - The Supabase error object
 * @param {Record<string, any>} [payload] - Optional payload that was submitted
 * @param {Record<string, any>} [context] - Additional debugging context
 */
const logSupabaseError = (operation, error, payload = null, context = null) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    operation,
    payload,
    error: {
      message: error?.message || 'Unknown error',
      details: error?.details || null,
      hint: error?.hint || null,
      code: error?.code || null,
      status: error?.status || null,
    },
    context,
    fullError: error,
  };

  console.error('❌ SUPABASE ERROR', errorLog);
  
  // Log to browser console with styling for visibility
  console.group(`🔴 SUPABASE ERROR: ${operation}`);
  console.error('Message:', error?.message);
  console.error('Code:', error?.code);
  console.error('Details:', error?.details);
  console.error('Hint:', error?.hint);
  if (payload) console.error('Payload:', payload);
  console.error('Full error:', error);
  console.groupEnd();
};

/**
 * Safe JSON field validation.
 * Validates JSONB fields (tags, eligibility, selection_process, important_dates).
 * @param {any} value - The field value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {{valid: boolean, parsed: any, error?: string}}
 */
const validateJsonField = (value, fieldName) => {
  if (!value) {
    return { valid: true, parsed: null };
  }

  // If already a valid object/array, return as-is
  if (typeof value === 'object' && value !== null) {
    try {
      JSON.stringify(value); // Ensure it's stringifiable
      return { valid: true, parsed: value };
    } catch (err) {
      return {
        valid: false,
        parsed: null,
        error: `${fieldName} contains non-serializable data: ${err.message}`,
      };
    }
  }

  // If it's a string, try to parse it
  if (typeof value === 'string') {
    if (value.trim() === '') {
      return { valid: true, parsed: null };
    }
    try {
      const parsed = JSON.parse(value);
      return { valid: true, parsed };
    } catch (err) {
      return {
        valid: false,
        parsed: null,
        error: `${fieldName} contains invalid JSON: ${err.message}`,
      };
    }
  }

  return {
    valid: false,
    parsed: null,
    error: `${fieldName} must be an object, array, or valid JSON string`,
  };
};

/**
 * Validate all JSON fields in the job payload.
 * @param {Record<string, any>} job
 * @returns {{valid: boolean, errors?: Record<string, string>}}
 */
const validateJobJsonFields = (job) => {
  const jsonFields = ['tags', 'eligibility', 'selection_process', 'important_dates'];
  const errors = {};

  jsonFields.forEach((field) => {
    const validation = validateJsonField(job[field], field);
    if (!validation.valid) {
      errors[field] = validation.error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
};

/**
 * Clean and normalize a canonical URL.
 * Ensures valid URL format or returns null.
 * @param {string} url
 * @returns {string | null}
 */
const cleanCanonicalUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Validate URL structure
    new URL(trimmed);
    return trimmed;
  } catch (err) {
    console.warn('Invalid canonical URL:', trimmed, err.message);
    return null;
  }
};

/**
 * Defensive payload cleaning before submission.
 * - Converts undefined → null
 * - Converts empty strings to null for optional fields
 * - Validates and normalizes JSON fields
 * - Cleans URLs
 * @param {Record<string, any>} payload
 * @returns {{cleaned: Record<string, any>, errors: Record<string, string> | null}}
 */
const cleanJobPayload = (payload) => {
  const errors = {};
  const cleaned = {};

  // Validate JSON fields first
  const jsonValidation = validateJobJsonFields(payload);
  if (!jsonValidation.valid) {
    return { cleaned: null, errors: jsonValidation.errors };
  }

  // Required fields
  const requiredFields = ['title', 'slug', 'status'];
  
  requiredFields.forEach((field) => {
    const value = payload[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = `${field} is required`;
    } else {
      cleaned[field] = value;
    }
  });

  if (Object.keys(errors).length > 0) {
    return { cleaned: null, errors };
  }

  // Optional string fields - convert empty to null
  const optionalStringFields = [
    'organization',
    'category',
    'job_type',
    'location',
    'qualification',
    'experience',
    'salary',
    'official_website',
    'apply_link',
    'notification_pdf',
    'short_description',
    'full_description',
    'application_fee',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'og_image',
  ];

  optionalStringFields.forEach((field) => {
    const value = payload[field];
    if (value === undefined || value === '' || value === null) {
      cleaned[field] = null;
    } else {
      cleaned[field] = String(value).trim() || null;
    }
  });

  // Date fields
  ['application_start_date', 'last_date'].forEach((field) => {
    cleaned[field] = payload[field] || null;
  });

  // Boolean fields
  cleaned.featured = !!payload.featured;

  // Clean canonical_url
  cleaned.canonical_url = cleanCanonicalUrl(payload.canonical_url);

  // Handle tags - accept comma-separated string or array, return null when empty
  if (Array.isArray(payload.tags)) {
    cleaned.tags = payload.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof payload.tags === 'string') {
    cleaned.tags = payload.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    cleaned.tags = null;
  }

  // Handle JSON fields - parse if string
  ['eligibility', 'selection_process', 'important_dates'].forEach((field) => {
    if (payload[field]) {
      const validation = validateJsonField(payload[field], field);
      cleaned[field] = validation.parsed || null;
    } else {
      cleaned[field] = null;
    }
  });

  return { cleaned, errors: null };
};

const handleResponse = (result) => {
  if (result.error) {
    logSupabaseError('handleResponse', result.error);
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

export const getJobCategories = async ({ orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  let query = supabase.from('job_categories').select('*')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
}

export const getJobCategoryBySlug = async (slug) => {
  const result = await supabase.from('job_categories').select('*').eq('slug', slug).maybeSingle()
  if (result.error) {
    console.error('getJobCategoryBySlug error:', result.error)
    return null
  }
  return result.data || null
}

export const createJobCategory = async (category) => {
  const result = await supabase.from('job_categories').insert([{ ...category }])
  return handleResponse(result)
}

export const updateJobCategory = async (id, category) => {
  const result = await supabase.from('job_categories').update({ ...category, updated_at: new Date() }).eq('id', id)
  return handleResponse(result)
}

export const deleteJobCategory = async (id) => {
  const result = await supabase.from('job_categories').delete().eq('id', id)
  return handleResponse(result)
}

export const getJobsByCategorySlug = async (slug, { published = true, orderBy = 'last_date', ascending = false, limit = 50 } = {}) => {
  // Jobs currently store `category` as a slug string. Query by that field.
  let query = supabase.from('jobs').select('*').eq('category', slug)
  if (published) query = query.eq('status', 'published')
  query = sortParams(query, orderBy, ascending)
  if (limit) query = query.limit(limit)
  return handleResponse(await query)
}

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

/* ------------------------------ Jobs API ------------------------------ */

export const getJobs = async ({ published = true, orderBy = 'last_date', ascending = false, limit = 50, category = null, search = null, page = 0, pageSize = 20 } = {}) => {
  let query = supabase.from('jobs').select('*');
  if (published) query = query.eq('status', 'published');
  if (category) query = query.eq('category', category);
  if (search && search.length > 1) {
    const q = search.toLowerCase();
    query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,short_description.ilike.%${q}%`);
  }
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getJobBySlug = async (slug) => {
  const result = await supabase.from('jobs').select('*').eq('slug', slug).maybeSingle();
  if (result.error) {
    console.error('getJobBySlug error:', result.error);
    return null;
  }
  return result.data || null;
};

export const createJob = async (job) => {
  // Step 1: Validate basic job structure
  validateJobPayload(job);
  
  // Step 2: Clean and validate payload
  const { cleaned: cleanedPayload, errors: cleaningErrors } = cleanJobPayload(job);
  if (cleaningErrors) {
    const error = new Error('Payload validation failed');
    error.fieldErrors = cleaningErrors;
    logSupabaseError('createJob', error, job, { phase: 'payload-cleaning' });
    throw error;
  }

  // Step 3: Generate unique slug
  const rawSlug = slugify(job.slug || job.title);
  const slug = rawSlug || generateSlug(job.title);
  const uniqueSlug = await generateUniqueJobSlug(slug);
  
  // Step 4: Prepare final payload with cleaned data
  const payload = { ...cleanedPayload, slug: uniqueSlug };

  // Step 5: Attempt insert
  let result = await supabase.from('jobs').insert([payload]);
  
  if (result.error) {
    // Check if it's a slug conflict and retry with next suffix
    if (result.error.code === '23505' || /duplicate|conflict/i.test(result.error.message || '')) {
      logSupabaseError('createJob', result.error, payload, { phase: 'initial-insert', slug: uniqueSlug });
      
      const retrySlug = await generateUniqueJobSlug(uniqueSlug);
      if (retrySlug !== uniqueSlug) {
        // Try with incremented slug
        result = await supabase.from('jobs').insert([{ ...payload, slug: retrySlug }]);
        if (!result.error) {
          return handleResponse(result);
        }
      }
    }
    
    // If still failing, throw detailed error
    const detailedError = formatJobError(result.error, uniqueSlug, payload);
    logSupabaseError('createJob', result.error, payload, { phase: 'insert-failed', slug: uniqueSlug });
    throw detailedError;
  }

  return handleResponse(result);
};

export const updateJob = async (id, job) => {
  // Step 1: Validate basic job structure
  validateJobPayload(job);
  
  // Step 2: Clean and validate payload
  const { cleaned: cleanedPayload, errors: cleaningErrors } = cleanJobPayload(job);
  if (cleaningErrors) {
    const error = new Error('Payload validation failed');
    error.fieldErrors = cleaningErrors;
    logSupabaseError('updateJob', error, job, { phase: 'payload-cleaning', jobId: id });
    throw error;
  }

  // Step 3: Generate unique slug (excluding current job)
  const rawSlug = slugify(job.slug || job.title);
  const slug = rawSlug || generateSlug(job.title);
  const uniqueSlug = await generateUniqueJobSlug(slug, id);
  
  // Step 4: Prepare final payload with cleaned data and timestamp
  const payload = { ...cleanedPayload, slug: uniqueSlug, updated_at: new Date() };

  // Step 5: Attempt update
  let result = await supabase.from('jobs').update(payload).eq('id', id);
  
  if (result.error) {
    // Check if it's a slug conflict and retry with next suffix
    if (result.error.code === '23505' || /duplicate|conflict/i.test(result.error.message || '')) {
      logSupabaseError('updateJob', result.error, payload, { phase: 'initial-update', jobId: id, slug: uniqueSlug });
      
      const retrySlug = await generateUniqueJobSlug(uniqueSlug, id);
      if (retrySlug !== uniqueSlug) {
        // Try with incremented slug
        result = await supabase.from('jobs').update({ ...payload, slug: retrySlug }).eq('id', id);
        if (!result.error) {
          return handleResponse(result);
        }
      }
    }
    
    // If still failing, throw detailed error
    const detailedError = formatJobError(result.error, uniqueSlug, payload);
    logSupabaseError('updateJob', result.error, payload, { phase: 'update-failed', jobId: id, slug: uniqueSlug });
    throw detailedError;
  }

  return handleResponse(result);
};

export const deleteJob = async (id) => {
  const result = await supabase.from('jobs').delete().eq('id', id);
  if (result.error) {
    logSupabaseError('deleteJob', result.error);
  }
  return handleResponse(result);
};

export const getFeaturedJobs = async ({ limit = 6 } = {}) => {
  let query = supabase.from('jobs').select('*').eq('status', 'published').eq('featured', true).order('last_date', { ascending: false }).limit(limit);
  return handleResponse(await query);
};

export const searchJobs = async (term, { limit = 12 } = {}) => {
  if (!term || term.length < 2) return [];
  const q = term.toLowerCase();
  const result = await supabase.from('jobs').select('*').eq('status', 'published').or(`title.ilike.%${q}%,organization.ilike.%${q}%,short_description.ilike.%${q}%`).limit(limit);
  return handleResponse(result);
};

export const searchBlogs = async (term, { limit = 8 } = {}) => {
  if (!term || term.length < 2) return [];
  const q = term.toLowerCase();
  const result = await supabase.from('blog_posts').select('*').eq('status', 'published').or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`).limit(limit);
  return handleResponse(result);
};
