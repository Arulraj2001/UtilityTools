export const QUERY_NOINDEX_ROBOTS = 'noindex, follow'
export const INDEX_ROBOTS = 'index, follow, max-image-preview:large'

const LOW_VALUE_QUERY_PARAMS = new Set([
  'q',
  'query',
  'search',
  'category',
  'tag',
  'sort',
  'featured',
  'recent',
  'freshers',
  'remote',
  'government',
  'private',
  'tech',
])

export const hasLowValueQueryParams = (searchParams) => {
  if (!searchParams) return false
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(searchParams)

  for (const key of params.keys()) {
    if (LOW_VALUE_QUERY_PARAMS.has(key)) return true
  }
  return false
}

export const robotsForSearchParams = (searchParams) => (
  hasLowValueQueryParams(searchParams) ? QUERY_NOINDEX_ROBOTS : INDEX_ROBOTS
)

