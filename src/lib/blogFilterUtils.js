/**
 * Blog Filter Utilities
 * Provides filtering logic for Quick Filters in the blog list
 */

// Define keyword mappings for each filter type
const FILTER_KEYWORDS = {
  'ai-tools': {
    tags: ['ai', 'artificial intelligence', 'machine learning', 'automation', 'productivity ai', 'ai tools', 'gpt', 'llm'],
    categories: ['ai', 'artificial intelligence', 'automation'],
    titleKeywords: ['ai', 'artificial intelligence', 'automation', 'machine learning'],
    seoKeywords: ['ai', 'artificial intelligence', 'automation', 'machine learning'],
  },
  'tutorials': {
    tags: ['tutorial', 'guide', 'how-to', 'step-by-step', 'beginner', 'educational', 'learning', 'course'],
    categories: ['tutorial', 'guide', 'course'],
    titleKeywords: ['tutorial', 'guide', 'how to', 'step by step', 'learn'],
    seoKeywords: ['tutorial', 'guide', 'how-to', 'educational'],
  },
  'seo': {
    tags: ['seo', 'search engine optimization', 'image optimization', 'performance', 'core web vitals', 'metadata', 'sitemap', 'robots.txt'],
    categories: ['seo', 'optimization', 'performance'],
    titleKeywords: ['seo', 'optimization', 'performance', 'core web vitals', 'metadata'],
    seoKeywords: ['seo', 'search engine', 'optimization', 'image optimization', 'performance', 'core web vitals'],
  },
  'programming': {
    tags: ['javascript', 'coding', 'development', 'programming', 'frontend', 'backend', 'api', 'typescript', 'react', 'node', 'html', 'css'],
    categories: ['programming', 'development', 'coding', 'frontend', 'backend'],
    titleKeywords: ['javascript', 'coding', 'development', 'programming', 'api', 'frontend', 'backend'],
    seoKeywords: ['javascript', 'coding', 'development', 'programming', 'api'],
  },
}

/**
 * Check if a string contains any of the keywords
 */
const containsKeyword = (text, keywords) => {
  if (!text) return false
  const lowerText = String(text).toLowerCase()
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Check if post matches a specific filter
 */
const matchesFilterCriteria = (post, filterId) => {
  const keywords = FILTER_KEYWORDS[filterId]
  if (!keywords) return false

  // Check tags
  if (post.tags && Array.isArray(post.tags)) {
    if (post.tags.some(tag => containsKeyword(tag, keywords.tags))) {
      return true
    }
  }

  // Check category name
  const categoryName = post.blog_categories?.name || post.category
  if (categoryName && containsKeyword(categoryName, keywords.categories)) {
    return true
  }

  // Check title
  if (containsKeyword(post.title, keywords.titleKeywords)) {
    return true
  }

  // Check SEO keywords
  if (containsKeyword(post.seo_keywords, keywords.seoKeywords)) {
    return true
  }

  // Check excerpt
  if (containsKeyword(post.excerpt, keywords.titleKeywords)) {
    return true
  }

  return false
}

/**
 * Apply Quick Filter to posts
 * Returns filtered array based on filter type
 */
export const applyQuickFilter = (posts, filterId) => {
  if (!filterId || !posts.length) return posts

  switch (filterId) {
    case 'featured':
      return posts.filter(post => post.featured === true || post.is_featured === true)

    case 'trending':
      // Sort by views_count descending, then by creation date
      // This shows the most viewed posts recently
      return [...posts]
        .sort((a, b) => {
          const viewsDiff = (b.views_count || 0) - (a.views_count || 0)
          if (viewsDiff !== 0) return viewsDiff
          // If views are equal, sort by recency
          return new Date(b.created_at) - new Date(a.created_at)
        })
        .slice(0, 25) // Limit to top 25 trending posts

    case 'recent':
      // Sort by created_at descending (newest first)
      return [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    case 'ai-tools':
    case 'tutorials':
    case 'seo':
    case 'programming':
      // Filter by keyword matching
      return posts.filter(post => matchesFilterCriteria(post, filterId))

    default:
      return posts
  }
}

/**
 * Get count of posts that match a specific filter
 */
export const getFilterCount = (posts, filterId) => {
  return applyQuickFilter(posts, filterId).length
}

/**
 * Validate that filter ID is valid
 */
export const isValidFilter = (filterId) => {
  const validFilters = ['featured', 'trending', 'recent', 'ai-tools', 'tutorials', 'seo', 'programming']
  return validFilters.includes(filterId)
}
