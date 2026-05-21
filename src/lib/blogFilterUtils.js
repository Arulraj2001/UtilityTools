/**
 * Blog Filter Utilities
 * Provides category and tag filtering logic for blog posts.
 */

export const filterPosts = (posts, { category = '', tags = [] } = {}) => {
  if (!posts?.length) return []
  let result = posts

  if (category) {
    result = result.filter(post => post.blog_categories?.slug === category)
  }

  if (tags?.length) {
    result = result.filter(post => post.tags && tags.every(tag => post.tags.includes(tag)))
  }

  return result
}
