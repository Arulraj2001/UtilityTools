import { supabase } from './supabaseClient';

const RETIRED_TOOL_SLUGS = ['pdf-to-word'];

const excludeRetiredTools = (query) => (
  RETIRED_TOOL_SLUGS.reduce((nextQuery, slug) => nextQuery.neq('slug', slug), query)
);

const isRetiredToolSlug = (slug) => RETIRED_TOOL_SLUGS.includes(slug);

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

export const getTools = async ({ published = true, orderBy = 'sort_order', ascending = true, limit = 200, filters = {} } = {}) => {
  let query = excludeRetiredTools(supabase.from('tools').select('*'));
  if (published) query = query.eq('status', 'published');
  if (filters?.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
  if (filters?.is_trending !== undefined) query = query.eq('is_trending', filters.is_trending);
  if (filters?.category_id) query = query.eq('category_id', filters.category_id);
  if (Array.isArray(filters?.categoryIds) && filters.categoryIds.length > 0) query = query.in('category_id', filters.categoryIds);
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getToolsAll = async ({ orderBy = 'created_at', ascending = false, limit = 200 } = {}) => {
  let query = excludeRetiredTools(supabase.from('tools').select('*'));
  query = sortParams(query, orderBy, ascending);
  if (limit) query = query.limit(limit);
  return handleResponse(await query);
};

export const getToolsWithCategories = async ({ published = true, orderBy = 'sort_order', ascending = true, limit = 200, filters = {} } = {}) => {
  let query = excludeRetiredTools(supabase.from('tools').select('*, categories(id,name,slug)'));
  if (published) query = query.eq('status', 'published');
  if (filters?.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
  if (filters?.is_trending !== undefined) query = query.eq('is_trending', filters.is_trending);
  if (filters?.category_id) query = query.eq('category_id', filters.category_id);
  if (Array.isArray(filters?.categoryIds) && filters.categoryIds.length > 0) query = query.in('category_id', filters.categoryIds);
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
  const sanitizedCategoryIds = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [];
  if (sanitizedCategoryIds.length === 0) return {};

  const counts = {};
  await Promise.all(sanitizedCategoryIds.map(async (id) => {
    let q = excludeRetiredTools(supabase.from('tools').select('id', { count: 'exact', head: true })).eq('category_id', id);
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
  let query = supabase
    .from('tools')
    .select('*')
    .eq('status', 'published')
    .or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
    );
  query = excludeRetiredTools(query).limit(limit);
  return handleResponse(await query);
};

export const createTool = async (tool) => {
  if (isRetiredToolSlug(tool?.slug)) return [];
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
  if (isRetiredToolSlug(slug)) return null;
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
  if (!id) return null;
  const result = await supabase.from('tools').update({ usage_count, updated_at: new Date() }).eq('id', id);
  return handleResponse(result);
};

export const getTotalUsageCount = async () => {
  const result = await excludeRetiredTools(supabase.from('tools').select('usage_count')).eq('status', 'published');
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

/* ─────────────────────── Blog Bulk Import / Export ─────────────────────── */

/**
 * Check which slugs from the provided list already exist in blog_posts.
 * Batched in groups of 100 to stay under URL length limits.
 */
export const checkExistingBlogSlugs = async (slugs = []) => {
  if (!slugs.length) return [];
  const BATCH = 100;
  const found = [];
  for (let i = 0; i < slugs.length; i += BATCH) {
    const chunk = slugs.slice(i, i + BATCH);
    const res = await supabase.from('blog_posts').select('id, slug, title').in('slug', chunk);
    if (!res.error && res.data) found.push(...res.data);
  }
  return found;
};

/**
 * Batch-insert posts in chunks of 100.
 * Returns { inserted: [{id, title, slug}], errors: [{title, error}] }
 * onProgress(n) is called with the number of posts processed per batch.
 */
export const bulkCreateBlogPosts = async (posts, onProgress) => {
  const CHUNK = 100;
  const inserted = [];
  const errors = [];

  for (let i = 0; i < posts.length; i += CHUNK) {
    const chunk = posts.slice(i, i + CHUNK);
    const res = await supabase.from('blog_posts').insert(chunk).select('id, title, slug');

    if (res.error) {
      // Batch rejected — try one-by-one so we isolate the bad row
      for (const post of chunk) {
        const single = await supabase.from('blog_posts').insert([post]).select('id, title, slug').single();
        if (single.error) {
          errors.push({ title: post.title, slug: post.slug, error: single.error.message });
        } else if (single.data) {
          inserted.push(single.data);
        }
        onProgress?.(1);
      }
    } else {
      inserted.push(...(res.data ?? []));
      onProgress?.(chunk.length);
    }
  }

  return { inserted, errors };
};

/* ────────────── Import History (requires blog_import_history table) ──────── */

export const createImportHistory = async (record) => {
  const res = await supabase.from('blog_import_history').insert([{ ...record }]).select();
  if (res.error) {
    logSupabaseError('createImportHistory', res.error, record);
    throw res.error;
  }
  return res.data ?? [];
};

export const getImportHistory = async ({ limit = 50 } = {}) => {
  const res = await supabase
    .from('blog_import_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (res.error) {
    // Table may not exist yet — degrade gracefully
    console.warn('getImportHistory:', res.error.message);
    return [];
  }
  return res.data ?? [];
};

export const updateImportHistory = async (id, data) => {
  if (!id) return [];
  const res = await supabase
    .from('blog_import_history')
    .update({ ...data, updated_at: new Date() })
    .eq('id', id);
  if (res.error) logSupabaseError('updateImportHistory', res.error, { id, ...data });
  return res.data ?? [];
};

export const deleteImportHistory = async (id) => {
  const res = await supabase.from('blog_import_history').delete().eq('id', id);
  if (res.error) logSupabaseError('deleteImportHistory', res.error, { id });
  return res.data ?? [];
};

/**
 * Delete all posts that were created by a specific import and mark it rolled back.
 * importedIds must be the array stored in blog_import_history.imported_ids.
 */
export const rollbackImport = async (importId, importedIds = []) => {
  if (!importedIds.length) return { deleted: 0 };

  const BATCH = 200;
  let deleted = 0;
  for (let i = 0; i < importedIds.length; i += BATCH) {
    const chunk = importedIds.slice(i, i + BATCH);
    const res = await supabase.from('blog_posts').delete().in('id', chunk);
    if (res.error) {
      logSupabaseError('rollbackImport', res.error, { importId, chunk });
      throw res.error;
    }
    deleted += chunk.length;
  }

  await updateImportHistory(importId, { status: 'rolled_back' });
  return { deleted };
};

/* ─────────────────────── AI Job Intelligence ────────────────────────────── */

// ── AI Provider Settings ──────────────────────────────────────────────────────

export const getAiProviders = async () => {
  const res = await supabase.from('ai_provider_settings').select('*').order('priority');
  if (res.error) { console.warn('getAiProviders:', res.error.message); return []; }
  return res.data ?? [];
};

export const updateAiProvider = async (id, data) => {
  const res = await supabase.from('ai_provider_settings').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateAiProvider', res.error); throw res.error; }
  return res.data ?? [];
};

// ── AI Prompts ────────────────────────────────────────────────────────────────

export const getAiPrompts = async () => {
  const res = await supabase.from('ai_prompts').select('*').order('job_type');
  if (res.error) { console.warn('getAiPrompts:', res.error.message); return []; }
  return res.data ?? [];
};

export const updateAiPrompt = async (id, data) => {
  const res = await supabase.from('ai_prompts').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateAiPrompt', res.error); throw res.error; }
  return res.data ?? [];
};

// ── AI Job Sources ────────────────────────────────────────────────────────────

export const getAiSources = async ({ onlyActive = false } = {}) => {
  let q = supabase.from('ai_job_sources').select('*').order('tier').order('name');
  if (onlyActive) q = q.eq('is_active', true);
  const res = await q;
  if (res.error) { console.warn('getAiSources:', res.error.message); return []; }
  return res.data ?? [];
};

export const createAiSource = async (data) => {
  const res = await supabase.from('ai_job_sources').insert([{ ...data }]).select();
  if (res.error) { logSupabaseError('createAiSource', res.error); throw res.error; }
  return res.data ?? [];
};

export const updateAiSource = async (id, data) => {
  const res = await supabase.from('ai_job_sources').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateAiSource', res.error); throw res.error; }
  return res.data ?? [];
};

export const deleteAiSource = async (id) => {
  const res = await supabase.from('ai_job_sources').delete().eq('id', id);
  if (res.error) { logSupabaseError('deleteAiSource', res.error); throw res.error; }
  return res.data ?? [];
};

// ── Research Queue ────────────────────────────────────────────────────────────

export const getResearchQueue = async ({ status = null, limit = 100 } = {}) => {
  let q = supabase.from('ai_research_queue').select('*, ai_job_sources(name, tier)').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const res = await q;
  if (res.error) { console.warn('getResearchQueue:', res.error.message); return []; }
  return res.data ?? [];
};

export const createResearchItem = async (data) => {
  const res = await supabase.from('ai_research_queue').insert([{ ...data }]).select();
  if (res.error) { logSupabaseError('createResearchItem', res.error); throw res.error; }
  return res.data ?? [];
};

export const updateResearchItem = async (id, data) => {
  const res = await supabase.from('ai_research_queue').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateResearchItem', res.error); throw res.error; }
  return res.data ?? [];
};

export const deleteResearchItem = async (id) => {
  const res = await supabase.from('ai_research_queue').delete().eq('id', id);
  if (res.error) { logSupabaseError('deleteResearchItem', res.error); throw res.error; }
  return res.data ?? [];
};

// ── AI Job Drafts ─────────────────────────────────────────────────────────────

export const getAiDrafts = async ({ status = null, limit = 100 } = {}) => {
  let q = supabase.from('ai_job_drafts').select('*, ai_research_queue(title, organization, job_type)').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const res = await q;
  if (res.error) { console.warn('getAiDrafts:', res.error.message); return []; }
  return res.data ?? [];
};

export const createAiDraft = async (data) => {
  const res = await supabase.from('ai_job_drafts').insert([{ ...data }]).select();
  if (res.error) { logSupabaseError('createAiDraft', res.error); throw res.error; }
  return res.data?.[0] ?? null;
};

export const updateAiDraft = async (id, data) => {
  const res = await supabase.from('ai_job_drafts').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateAiDraft', res.error); throw res.error; }
  return res.data ?? [];
};

export const deleteAiDraft = async (id) => {
  const res = await supabase.from('ai_job_drafts').delete().eq('id', id);
  if (res.error) { logSupabaseError('deleteAiDraft', res.error); throw res.error; }
  return res.data ?? [];
};

// ── Duplicate Log ─────────────────────────────────────────────────────────────

export const getDuplicateLog = async ({ resolved = false, limit = 100 } = {}) => {
  const res = await supabase
    .from('ai_duplicate_log')
    .select('*, ai_research_queue(title, organization), ai_job_drafts(generated_data)')
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (res.error) { console.warn('getDuplicateLog:', res.error.message); return []; }
  return res.data ?? [];
};

export const resolveDuplicate = async (id, isActualDuplicate) => {
  const res = await supabase.from('ai_duplicate_log').update({ resolved: true, is_duplicate: isActualDuplicate }).eq('id', id);
  if (res.error) { logSupabaseError('resolveDuplicate', res.error); throw res.error; }
  return res.data ?? [];
};

// ── Monitoring Rules ──────────────────────────────────────────────────────────

export const getMonitoringRules = async ({ limit = 100 } = {}) => {
  const res = await supabase.from('ai_monitoring_rules').select('*').order('created_at', { ascending: false }).limit(limit);
  if (res.error) { console.warn('getMonitoringRules:', res.error.message); return []; }
  return res.data ?? [];
};

export const createMonitoringRule = async (data) => {
  const res = await supabase.from('ai_monitoring_rules').insert([{ ...data }]).select();
  if (res.error) { logSupabaseError('createMonitoringRule', res.error); throw res.error; }
  return res.data ?? [];
};

export const updateMonitoringRule = async (id, data) => {
  const res = await supabase.from('ai_monitoring_rules').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateMonitoringRule', res.error); throw res.error; }
  return res.data ?? [];
};

export const deleteMonitoringRule = async (id) => {
  const res = await supabase.from('ai_monitoring_rules').delete().eq('id', id);
  if (res.error) { logSupabaseError('deleteMonitoringRule', res.error); throw res.error; }
  return res.data ?? [];
};

// ── Update Queue ──────────────────────────────────────────────────────────────

export const getUpdateQueue = async ({ status = null, limit = 100 } = {}) => {
  let q = supabase.from('ai_update_queue').select('*, ai_monitoring_rules(title, organization)').order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const res = await q;
  if (res.error) { console.warn('getUpdateQueue:', res.error.message); return []; }
  return res.data ?? [];
};

export const createUpdateQueueItem = async (data) => {
  const res = await supabase.from('ai_update_queue').insert([{ ...data }]).select();
  if (res.error) { logSupabaseError('createUpdateQueueItem', res.error); throw res.error; }
  return res.data ?? [];
};

export const updateUpdateQueueItem = async (id, data) => {
  const res = await supabase.from('ai_update_queue').update({ ...data, updated_at: new Date() }).eq('id', id).select();
  if (res.error) { logSupabaseError('updateUpdateQueueItem', res.error); throw res.error; }
  return res.data ?? [];
};

/* ─────────────────────── AI Provider — Extended API (v2) ───────────────────── */

/**
 * Insert a provider row if it doesn't exist yet.
 * Used to seed DeepSeek / Cerebras from the UI if the SQL migration hasn't been run.
 */
export const upsertAiProvider = async (providerName, defaults = {}) => {
  const existing = await supabase
    .from('ai_provider_settings')
    .select('id')
    .eq('provider_name', providerName)
    .maybeSingle();
  if (existing.data) return existing.data; // already exists

  const res = await supabase.from('ai_provider_settings').insert([{
    provider_name: providerName,
    api_key: '',
    model: defaults.model || '',
    priority: defaults.priority || 99,
    is_active: false,
    base_url: defaults.base_url || null,
  }]).select();
  if (res.error) { logSupabaseError('upsertAiProvider', res.error); return null; }
  return res.data?.[0] ?? null;
};

/**
 * Update the stats JSONB column for a provider after a test or generation call.
 * Increments request/success/failure counters and updates avg latency.
 */
export const recordProviderCall = async (id, { success, latencyMs, error = null }) => {
  // Read current stats first
  const cur = await supabase.from('ai_provider_settings').select('stats, last_latency_ms').eq('id', id).maybeSingle();
  if (cur.error || !cur.data) return;

  const prev = cur.data.stats || { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0, last_error: null };
  const requests   = (prev.requests   || 0) + 1;
  const successes  = (prev.successes  || 0) + (success ? 1 : 0);
  const failures   = (prev.failures   || 0) + (success ? 0 : 1);
  const totalMs    = ((prev.avg_latency_ms || 0) * (requests - 1) + (latencyMs || 0));
  const avg_latency_ms = requests > 0 ? Math.round(totalMs / requests) : 0;

  const patch = {
    stats: { requests, successes, failures, avg_latency_ms, last_error: success ? null : (error || null) },
    last_latency_ms: latencyMs || null,
    last_tested: new Date().toISOString(),
    health_status: success ? 'healthy' : (failures >= 3 ? 'down' : 'degraded'),
    updated_at: new Date(),
  };

  await supabase.from('ai_provider_settings').update(patch).eq('id', id);
};

/**
 * Store the list of dynamically discovered models back into the DB.
 * models: [{ value, label }]
 */
export const saveProviderModels = async (id, models) => {
  const res = await supabase.from('ai_provider_settings').update({
    available_models: models,
    updated_at: new Date(),
  }).eq('id', id);
  if (res.error) logSupabaseError('saveProviderModels', res.error);
  return res.data ?? [];
};

// ── Provider analytics / failures helpers ───────────────────────────────────

/**
 * Get aggregated analytics for AI providers from the `ai_provider_settings.stats` JSONB.
 * Returns array of { provider_name, stats, health_status, last_tested, last_latency_ms }
 */
export const getProviderAnalytics = async () => {
  const res = await supabase.from('ai_provider_settings').select('provider_name, stats, health_status, last_tested, last_latency_ms, priority, is_active').order('priority');
  if (res.error) { console.warn('getProviderAnalytics:', res.error.message); return []; }
  return res.data ?? [];
};

/**
 * Fetch recent provider failure logs if the `ai_provider_failures` table exists.
 * Falls back to reading analytics_events with event_type = 'provider_failure' if table absent.
 */
export const getProviderFailures = async ({ limit = 100 } = {}) => {
  // Try provider failures table first
  let res = await supabase.from('ai_provider_failures').select('*').order('created_at', { ascending: false }).limit(limit);
  if (res.error) {
    // Fallback to analytics_events
    const fallback = await supabase.from('analytics_events').select('*').eq('event_type', 'provider_failure').order('created_at', { ascending: false }).limit(limit);
    if (fallback.error) {
      console.warn('getProviderFailures fallback error:', fallback.error.message);
      return [];
    }
    return fallback.data ?? [];
  }
  return res.data ?? [];
};

/**
 * Ingest a provider failure record (best-effort). Tries to insert into `ai_provider_failures`.
 * If table missing, writes an `analytics_events` fallback record.
 */
export const logProviderFailure = async (payload) => {
  const res = await supabase.from('ai_provider_failures').insert([{ ...payload }]).select();
  if (res.error) {
    // fallback
    const fallback = await supabase.from('analytics_events').insert([{
      event_type: 'provider_failure',
      event_data: payload,
      page_url: '',
    }]);
    if (fallback.error) logSupabaseError('logProviderFailure', fallback.error, payload);
    return fallback.data ?? [];
  }
  return res.data ?? [];
};
