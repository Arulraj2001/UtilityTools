import { searchTools, searchWorkflowPages, searchBlogs, getTools } from '@/api/supabaseApi'
import { tokenize } from '@/lib/relevance'

const cache = new Map()
const TTL = 1000 * 60 * 5 // 5 minutes

const cacheSet = (key, value) => {
  cache.set(key, { ts: Date.now(), value })
}

const cacheGet = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) {
    cache.delete(key)
    return null
  }
  return entry.value
}

const buildQueries = (job) => {
  const tokens = new Set()
  ;[job.title, job.organization, job.category, ...(job.tags || [])].forEach(s => {
    tokenize(s).forEach(t => tokens.add(t))
  })
  const queries = Array.from(tokens).slice(0, 6)
  return queries
}

/**
 * Calculate semantic relevance score between job and content
 * Weighted scoring system:
 * - Exact category match: 100 points
 * - Tag overlap (per tag): 50 points
 * - Title word similarity: 10 points per match
 * - Organization match: 30 points
 */
const calculateRelevanceScore = (job, item) => {
  let score = 0

  // Category match (highest priority)
  if (job.category && item.category) {
    const jobCat = (job.category || '').toLowerCase().trim()
    const itemCat = (item.category || '').toLowerCase().trim()
    if (jobCat === itemCat) score += 100
    else if (jobCat && itemCat && jobCat.includes(itemCat)) score += 50
  }

  // Tag overlap
  if (job.tags && Array.isArray(job.tags) && item.tags && Array.isArray(item.tags)) {
    const jobTagSet = new Set(job.tags.map(t => (t || '').toLowerCase()))
    const itemTagSet = new Set(item.tags.map(t => (t || '').toLowerCase()))
    let overlap = 0
    itemTagSet.forEach(tag => {
      if (jobTagSet.has(tag)) overlap++
    })
    score += overlap * 50
  }

  // Title similarity (tokenized word overlap)
  const jobTitleTokens = tokenize(job.title || '')
  const itemTitleTokens = tokenize(item.title || item.name || '')
  let titleOverlap = 0
  itemTitleTokens.forEach(token => {
    if (jobTitleTokens.includes(token) && token.length > 2) titleOverlap++
  })
  score += titleOverlap * 10

  // Organization match
  if (job.organization && item.organization) {
    const jobOrg = (job.organization || '').toLowerCase().trim()
    const itemOrg = (item.organization || '').toLowerCase().trim()
    if (jobOrg === itemOrg) score += 30
  }

  return score
}

/**
 * Score and rank related items
 */
const rankByRelevance = (job, items = []) => {
  return items
    .filter(item => item && item.id)
    .map(item => ({
      item,
      score: calculateRelevanceScore(job, item),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}


export const matchRelatedTools = async (job, { limit = 6 } = {}) => {
  const key = `tools:${job.id}`
  const cached = cacheGet(key)
  if (cached) return cached

  const queries = buildQueries(job)
  const allResults = []

  // Fetch from search queries
  for (const q of queries) {
    try {
      const items = await searchTools(q, { limit: 12 })
      ;(items || []).forEach(i => allResults.push(i))
    } catch (e) {
      // continue
    }
  }

  // Fallback 1: category match
  if (allResults.length < limit && job.category) {
    try {
      const catTools = await getTools({ published: true, limit: 100 })
      const jobCategory = (job.category || '').toLowerCase().trim()
      catTools.forEach(t => {
        const tCatName = (t.category_name || '').toLowerCase().trim()
        const tCatSlug = (t.category_slug || '').toLowerCase().trim()
        const tCatId = (t.category_id || '').toLowerCase().trim()
        if (tCatSlug === jobCategory || tCatName === jobCategory || tCatId === jobCategory) {
          allResults.push(t)
        }
      })
    } catch (e) {}
  }

  // Deduplicate
  const seen = new Set()
  const unique = []
  for (const item of allResults) {
    if (!item || !item.id) continue
    if (item.id === job.id) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
  }

  // Rank by relevance
  const ranked = rankByRelevance(job, unique)

  // Fallback 2: featured/trending tools overall if needed
  if (ranked.length < limit) {
    try {
      const featuredTools = await getTools({ published: true, limit: 30 })
      const extraTools = featuredTools
        .filter(t => !seen.has(t.id))
        .sort((a, b) => {
          const aVal = (a.is_featured ? 2 : 0) + (a.is_trending ? 1 : 0)
          const bVal = (b.is_featured ? 2 : 0) + (b.is_trending ? 1 : 0)
          if (aVal !== bVal) return bVal - aVal
          return (b.usage_count || 0) - (a.usage_count || 0)
        })
      
      extraTools.forEach(t => {
        if (ranked.length < limit) {
          ranked.push(t)
          seen.add(t.id)
        }
      })
    } catch (e) {}
  }

  const finalResult = ranked.slice(0, limit)
  cacheSet(key, finalResult)
  return finalResult
}

export const matchRelatedWorkflows = async (job, { limit = 4 } = {}) => {
  const key = `workflows:${job.id}`
  const cached = cacheGet(key)
  if (cached) return cached

  const queries = buildQueries(job)
  const allResults = []

  for (const q of queries) {
    try {
      const items = await searchWorkflowPages(q, { limit: 12 })
      ;(items || []).forEach(i => allResults.push(i))
    } catch (e) {}
  }

  // Deduplicate and rank
  const seen = new Set()
  const unique = []
  for (const item of allResults) {
    if (!item || !item.id) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
  }

  const ranked = rankByRelevance(job, unique)

  // Fallback: newest workflows overall
  if (ranked.length < limit) {
    try {
      const { getWorkflowPages } = await import('@/api/supabaseApi')
      const allWorkflows = await getWorkflowPages({ published: true, limit: 30 })
      const overallMatches = allWorkflows
        .filter(w => !seen.has(w.id))
        .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      
      overallMatches.forEach(w => {
        if (ranked.length < limit) {
          ranked.push(w)
          seen.add(w.id)
        }
      })
    } catch (e) {}
  }

  const finalResult = ranked.slice(0, limit)
  cacheSet(key, finalResult)
  return finalResult
}

export const matchRelatedBlogs = async (job, { limit = 4 } = {}) => {
  const key = `blogs:${job.id}`
  const cached = cacheGet(key)
  if (cached) return cached

  const queries = buildQueries(job)
  const allResults = []

  for (const q of queries) {
    try {
      const items = await searchBlogs(q, { limit: 12 })
      ;(items || []).forEach(i => allResults.push(i))
    } catch (e) {}
  }

  // Deduplicate and rank
  const seen = new Set()
  const unique = []
  for (const item of allResults) {
    if (!item || !item.id) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
  }

  const ranked = rankByRelevance(job, unique)

  // Fallback 1: same category blog posts
  if (ranked.length < limit && job.category) {
    try {
      const { getBlogPosts } = await import('@/api/supabaseApi')
      const allBlogs = await getBlogPosts({ published: true, limit: 100 })
      const jobCategory = (job.category || '').toLowerCase().trim()
      
      const categoryMatches = allBlogs
        .filter(b => {
          const bCatName = (b.blog_categories?.name || '').toLowerCase().trim()
          const bCatSlug = (b.blog_categories?.slug || b.category || '').toLowerCase().trim()
          return bCatSlug === jobCategory || bCatName === jobCategory
        })
        .filter(b => !seen.has(b.id))
      
      const rankedMatches = rankByRelevance(job, categoryMatches)
      rankedMatches.forEach(b => {
        if (ranked.length < limit) {
          ranked.push(b)
          seen.add(b.id)
        }
      })
    } catch (e) {}
  }

  // Fallback 2: newest blog posts overall
  if (ranked.length < limit) {
    try {
      const { getBlogPosts } = await import('@/api/supabaseApi')
      const allBlogs = await getBlogPosts({ published: true, limit: 50 })
      const overallMatches = allBlogs
        .filter(b => !seen.has(b.id))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      
      overallMatches.forEach(b => {
        if (ranked.length < limit) {
          ranked.push(b)
          seen.add(b.id)
        }
      })
    } catch (e) {}
  }

  const finalResult = ranked.slice(0, limit)
  cacheSet(key, finalResult)
  return finalResult
}

/**
 * Match related jobs (used for "Related Jobs" section)
 */
export const matchRelatedJobs = async (job, { limit = 6 } = {}) => {
  const key = `jobs:${job.id}`
  const cached = cacheGet(key)
  if (cached) return cached

  // Get all jobs from first query to Supabase
  const { getJobs } = await import('@/api/supabaseApi')
  try {
    const allJobs = await getJobs({ limit: 50 })
    
    // Filter out current job and rank by relevance
    const candidates = (allJobs || []).filter(j => j.id !== job.id)
    const ranked = rankByRelevance(job, candidates).slice(0, limit)

    cacheSet(key, ranked)
    return ranked
  } catch (e) {
    console.error('Failed to fetch related jobs:', e)
    return []
  }
}

export default {
  matchRelatedTools,
  matchRelatedWorkflows,
  matchRelatedBlogs,
  matchRelatedJobs,
}

