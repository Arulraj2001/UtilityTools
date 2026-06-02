import { STATIC_BLOG_POSTS } from '../src/lib/staticBlogPosts.js'
import { formatQualityIssues, validateContentQuality } from '../src/lib/contentQuality.js'

const checks = [
  ...STATIC_BLOG_POSTS.map((post) => ({
    type: 'blog',
    item: post,
    label: `/blog/${post.slug}`,
  })),
]

let blockerCount = 0

for (const check of checks) {
  const result = validateContentQuality(check.item, { type: check.type, existingItems: [] })
  if (!result.ok) {
    blockerCount += result.blockers.length
    console.error(`[content-quality] ${check.label}: ${formatQualityIssues(result)}`)
  } else if (result.warnings.length) {
    console.warn(`[content-quality] ${check.label}: ${formatQualityIssues({ ...result, blockers: [] })}`)
  }
}

if (blockerCount > 0) {
  console.error(`[content-quality] Failed with ${blockerCount} blocker(s).`)
  process.exit(1)
}

console.log(`[content-quality] Passed ${checks.length} static content check(s).`)

