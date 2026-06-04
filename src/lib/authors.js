import {
  buildAbsoluteUrl,
  FOUNDER_NAME,
  FOUNDER_SLUG,
  ORGANIZATION_NAME,
} from '../config/site.js'

export const AUTHORS = [
  {
    slug: FOUNDER_SLUG,
    name: FOUNDER_NAME,
    title: `Founder, ${ORGANIZATION_NAME}`,
    organization: ORGANIZATION_NAME,
    url: buildAbsoluteUrl(`/author/${FOUNDER_SLUG}`),
    expertise: [
      'educational tools',
      'software development',
      'AI tools',
      'web applications',
      'utility workflows',
    ],
    bio:
      'Arulraj S is the founder of Learnithm and leads QuickUtils content, tool direction, and review standards. His work focuses on practical educational tools, browser-based utilities, AI-assisted workflows, and web applications that help users complete everyday digital tasks with clarity.',
  },
]

export const DEFAULT_AUTHOR = AUTHORS[0]

export const getAuthorBySlug = (slug) => {
  if (!slug) return null
  return AUTHORS.find((author) => author.slug === slug) || null
}

export const getAuthorForPost = (post = {}) => {
  if (post.author_slug) {
    return getAuthorBySlug(post.author_slug) || DEFAULT_AUTHOR
  }

  if (!post.author_name || post.author_name === 'QuickUtils Editorial Team') {
    return DEFAULT_AUTHOR
  }

  return {
    name: post.author_name,
    title: post.author_title,
    bio: post.author_bio,
    image: post.author_image,
    url: post.author_url,
  }
}
