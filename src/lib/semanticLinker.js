export function suggestLinksFromText(text = '', items = [], { keywordField = 'seo_keywords', titleField = 'name', slugField = 'slug', maxResults = 5 } = {}) {
  if (!text || items.length === 0) return []
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const tokenSet = new Set(tokens)

  const scored = items.map(item => {
    const kwStr = (item[keywordField] || '').toLowerCase()
    const kw = kwStr.split(/[^a-z0-9]+/).filter(Boolean)
    let score = 0
    kw.forEach(k => { if (tokenSet.has(k)) score += 2 })

    const title = (item[titleField] || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    title.forEach(t => { if (tokenSet.has(t)) score += 1 })

    return { item, score }
  })

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, maxResults).map(s => s.item)
}
