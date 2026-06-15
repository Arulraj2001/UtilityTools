/**
 * staticBlogPosts.js — Static blog posts have been removed.
 * All blog content is now 100% database-driven via Supabase.
 *
 * The API surface is preserved so callers don't need to change.
 */

export const STATIC_BLOG_CATEGORIES = []

export const STATIC_BLOG_POSTS = []

export function getStaticBlogPostBySlug(_slug) {
  return null
}

// No deleted slugs needed since there are no static posts
export const DELETED_STATIC_BLOG_SLUGS = new Set()

/**
 * Returns remote posts only (static posts removed).
 * Remote posts from the database are the only source of truth.
 */
export function mergeBlogPosts(remotePosts = []) {
  const seen = new Set()
  const merged = []

  for (const post of remotePosts || []) {
    if (!post?.slug || seen.has(post.slug)) continue
    seen.add(post.slug)
    merged.push(post)
  }

  return merged.sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0)
  )
}

/**
 * Returns remote categories only (static categories removed).
 */
export function mergeBlogCategories(remoteCategories = []) {
  const seen = new Set()
  const merged = []

  for (const category of remoteCategories || []) {
    if (!category?.slug || seen.has(category.slug)) continue
    seen.add(category.slug)
    merged.push(category)
  }

  return merged.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

export const FEATURED_STATIC_BLOG_POSTS = []
