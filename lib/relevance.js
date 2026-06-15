const STOP_WORDS = new Set([
  'how', 'to', 'the', 'in', 'a', 'of', 'and', 'for', 'with', 'on', 'at', 'by', 'an',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'in', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
  'will', 'just', 'don', 'should', 'now', 'tool', 'online', 'converter', 'generator',
  'free', 'calculator', 'maker', 'best', 'simple', 'guide', 'tutorial', 'easy', 'quick'
])

const IMAGE_TOOLS = [
  'image-compressor', 'image-resizer', 'image-converter', 'image-cropper',
  'image-to-pdf', 'image-watermark', 'image-color-picker', 'image-metadata-viewer',
  'background-remover', 'image-rotator', 'jpg-to-png', 'png-to-jpg'
]

const PDF_TOOLS = [
  'merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-jpg', 'jpg-to-pdf',
  'protect-pdf', 'remove-pages-pdf', 'word-to-pdf'
]

const GOV_TOOLS = [
  'ssc-photo-resizer', 'ssc-signature-resizer', 'railway-photo-resizer',
  'bank-exam-photo-tool', 'passport-size-photo-maker', 'photo-kb-reducer',
  'signature-maker', 'exam-photo-cropper', 'pdf-size-reducer',
  'exam-document-pdf-compressor', 'image-to-exam-pdf', 'pdf-page-extractor',
  'pdf-merger', 'pdf-to-image', 'document-scanner'
]

const LOGISTICS_TOOLS = [
  'smart-courier-analyzer', 'shipment-transit-intelligence', 'cargo-volume-planner',
  'freight-billing-optimizer', 'packaging-profit-analyzer', 'air-cargo-pricing-simulator',
  'container-optimization-system', 'parcel-dimension-intelligence', 'volumetric-freight-analyzer',
  'advanced-shipping-estimator', 'courier-charges-calculator', 'delivery-time-estimator',
  'cbm-calculator', 'chargeable-weight-calculator', 'packaging-cost-calculator',
  'air-freight-calculator', 'container-load-calculator', 'parcel-dimension-calculator',
  'volumetric-weight-calculator', 'shipping-cost-calculator'
]

const SELLER_TOOLS = [
  'amazon-seller-profit-intelligence', 'flipkart-seller-earnings-analyzer',
  'ecommerce-profit-optimizer', 'cod-risk-fee-analyzer', 'advanced-shipping-label-studio',
  'inventory-forecast-dashboard', 'smart-gst-invoice-builder', 'smart-product-pricing-engine',
  'business-roi-intelligence', 'seller-business-performance-dashboard', 'amazon-fee-calculator',
  'flipkart-fee-calculator', 'profit-margin-calculator', 'cod-charge-calculator',
  'shipping-label-generator', 'inventory-calculator', 'gst-invoice-generator',
  'product-pricing-calculator', 'roi-calculator', 'seller-profit-estimator'
]

const getToolGroup = (slug) => {
  if (IMAGE_TOOLS.includes(slug)) return 'image'
  if (PDF_TOOLS.includes(slug)) return 'pdf'
  if (GOV_TOOLS.includes(slug)) return 'gov'
  if (LOGISTICS_TOOLS.includes(slug)) return 'logistics'
  if (SELLER_TOOLS.includes(slug)) return 'seller'
  return 'other'
}

export const tokenize = (text = '') => {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

const getCategorySlug = (item) => {
  if (!item) return ''
  return (
    item.category_slug ||
    item.blog_categories?.slug ||
    item.category ||
    (typeof item.category_id === 'string' ? item.category_id : '')
  ).toLowerCase().trim()
}

const getCategoryId = (item) => {
  if (!item) return null
  return item.category_id || item.blog_categories?.id || null
}

const getTagsList = (item) => {
  if (!item) return []
  if (Array.isArray(item.tags)) return item.tags
  if (typeof item.tags === 'string') return item.tags.split(',').map(t => t.trim()).filter(Boolean)
  return []
}

/**
 * Ranks blog posts in order of semantic relevance to a target item
 */
export const rankBlogPosts = (target, posts = [], limit = 6) => {
  if (!target || !posts.length) return []

  const targetTitleTokens = tokenize(target.title || target.name || '')
  const targetKeywords = tokenize(target.seo_keywords || '')
  const targetTags = getTagsList(target).map(t => t.toLowerCase())
  const targetCategorySlug = getCategorySlug(target)
  const targetCategoryId = getCategoryId(target)

  const scored = posts
    .filter(p => p && p.slug !== target.slug && p.id !== target.id)
    .map(p => {
      let score = 0

      // Category match
      const pCatSlug = getCategorySlug(p)
      const pCatId = getCategoryId(p)
      if ((targetCategoryId && pCatId && targetCategoryId === pCatId) || 
          (targetCategorySlug && pCatSlug && targetCategorySlug === pCatSlug)) {
        score += 100
      }

      // Tags match
      const pTags = getTagsList(p).map(t => t.toLowerCase())
      const matchingTags = pTags.filter(t => targetTags.includes(t)).length
      score += matchingTags * 50

      // Title Similarity
      const pTitleTokens = tokenize(p.title || '')
      const titleMatches = pTitleTokens.filter(t => targetTitleTokens.includes(t)).length
      score += titleMatches * 20

      // Keyword Overlap
      const pKeywords = tokenize(p.seo_keywords || '')
      const keywordMatches = pKeywords.filter(k => targetKeywords.includes(k)).length
      score += keywordMatches * 10

      return { post: p, score }
    })

  // Sort by score (relevant items first)
  const ranked = scored.sort((a, b) => b.score - a.score)

  // Deduplicate and collect
  const result = []
  const seenSlugs = new Set()

  // 1. Add ranked posts with score > 0
  ranked.forEach(r => {
    if (r.score > 0) {
      result.push(r.post)
      seenSlugs.add(r.post.slug)
    }
  })

  // 2. Fallback: same category posts
  if (result.length < limit) {
    const sameCatPosts = posts
      .filter(p => p && p.slug !== target.slug && p.id !== target.id && !seenSlugs.has(p.slug))
      .filter(p => {
        const pCatSlug = getCategorySlug(p)
        const pCatId = getCategoryId(p)
        return (targetCategoryId && pCatId && targetCategoryId === pCatId) ||
               (targetCategorySlug && pCatSlug && targetCategorySlug === pCatSlug)
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    sameCatPosts.forEach(p => {
      if (result.length < limit) {
        result.push(p)
        seenSlugs.add(p.slug)
      }
    })
  }

  // 3. Fallback: newest posts overall
  if (result.length < limit) {
    const newestPosts = posts
      .filter(p => p && p.slug !== target.slug && p.id !== target.id && !seenSlugs.has(p.slug))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    newestPosts.forEach(p => {
      if (result.length < limit) {
        result.push(p)
        seenSlugs.add(p.slug)
      }
    })
  }

  return result.slice(0, limit)
}

/**
 * Ranks tools in order of semantic relevance to a target item
 */
export const rankTools = (target, tools = [], limit = 6) => {
  if (!target || !tools.length) return []

  const targetSlug = target.slug || ''
  const targetGroup = getToolGroup(targetSlug)
  const targetTitleTokens = tokenize(target.title || target.name || '')
  const targetKeywords = tokenize(target.seo_keywords || target.description || '')
  const targetTags = getTagsList(target).map(t => t.toLowerCase())
  const targetCategorySlug = getCategorySlug(target)
  const targetCategoryId = getCategoryId(target)

  const scored = tools
    .filter(t => t && t.slug !== targetSlug && t.id !== target.id)
    .map(t => {
      let score = 0

      // Tool Group Match (e.g. both image tools, both pdf tools)
      const tGroup = getToolGroup(t.slug)
      if (targetGroup !== 'other' && tGroup === targetGroup) {
        score += 150
      }

      // Category match
      const tCatSlug = getCategorySlug(t)
      const tCatId = getCategoryId(t)
      if ((targetCategoryId && tCatId && targetCategoryId === tCatId) || 
          (targetCategorySlug && tCatSlug && targetCategorySlug === tCatSlug)) {
        score += 100
      }

      // Tags/Keywords match
      const tKeywords = tokenize(t.seo_keywords || t.description || '')
      const keywordMatches = tKeywords.filter(k => targetKeywords.includes(k) || targetTags.includes(k)).length
      score += keywordMatches * 30

      // Title/Name Similarity
      const tNameTokens = tokenize(t.name || '')
      const nameMatches = tNameTokens.filter(n => targetTitleTokens.includes(n)).length
      score += nameMatches * 20

      // Slug substring match
      if (targetSlug && t.slug && (targetSlug.includes(t.slug) || t.slug.includes(targetSlug))) {
        score += 50
      }

      return { tool: t, score }
    })

  // Sort by score
  const ranked = scored.sort((a, b) => b.score - a.score)

  // Deduplicate and collect
  const result = []
  const seenSlugs = new Set()

  // 1. Add ranked tools with score > 0
  ranked.forEach(r => {
    if (r.score > 0) {
      result.push(r.tool)
      seenSlugs.add(r.tool.slug)
    }
  })

  // 2. Fallback: same group tools
  if (result.length < limit && targetGroup !== 'other') {
    const sameGroupTools = tools
      .filter(t => t && t.slug !== targetSlug && t.id !== target.id && !seenSlugs.has(t.slug))
      .filter(t => getToolGroup(t.slug) === targetGroup)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))

    sameGroupTools.forEach(t => {
      if (result.length < limit) {
        result.push(t)
        seenSlugs.add(t.slug)
      }
    })
  }

  // 3. Fallback: same category tools
  if (result.length < limit) {
    const sameCatTools = tools
      .filter(t => t && t.slug !== targetSlug && t.id !== target.id && !seenSlugs.has(t.slug))
      .filter(t => {
        const tCatSlug = getCategorySlug(t)
        const tCatId = getCategoryId(t)
        return (targetCategoryId && tCatId && targetCategoryId === tCatId) ||
               (targetCategorySlug && tCatSlug && targetCategorySlug === tCatSlug)
      })
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))

    sameCatTools.forEach(t => {
      if (result.length < limit) {
        result.push(t)
        seenSlugs.add(t.slug)
      }
    })
  }

  // 4. Fallback: featured or trending tools overall
  if (result.length < limit) {
    const popularTools = tools
      .filter(t => t && t.slug !== targetSlug && t.id !== target.id && !seenSlugs.has(t.slug))
      .sort((a, b) => {
        // featured/trending first, then usage count
        const aVal = (a.is_featured ? 2 : 0) + (a.is_trending ? 1 : 0)
        const bVal = (b.is_featured ? 2 : 0) + (b.is_trending ? 1 : 0)
        if (aVal !== bVal) return bVal - aVal
        return (b.usage_count || 0) - (a.usage_count || 0)
      })

    popularTools.forEach(t => {
      if (result.length < limit) {
        result.push(t)
        seenSlugs.add(t.slug)
      }
    })
  }

  return result.slice(0, limit)
}
