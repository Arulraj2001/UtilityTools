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
      'government exam document preparation (SSC, IBPS, RRB, UPSC, TNPSC)',
      'browser-based PDF & image processing',
      'calculator formula implementation & validation',
      'technical SEO and content systems for utility sites',
      'AI-assisted tool development',
      'web applications for Indian competitive exam aspirants',
    ],
    bio:
      'Arulraj S is the founder of Learnithm and leads QuickUtils. He built the platform to solve a real pain point he saw repeatedly: students and job applicants struggling with exact photo dimensions, signature specs, certificate PDF size limits (often 50-300 KB), and form-filling calculations for SSC CGL/CHSL, IBPS, RRB NTPC, TNPSC, UPSC, and state PSC applications. His focus is on accurate, private, browser-first tools plus clear educational content that explains the "why" behind every requirement, formula, and limitation.',
    credentials: 'Practical expertise in exam portal specifications, client-side file processing (pdf-lib, PDF.js, Canvas), formula accuracy for EMI/SIP/GST/PF/education calculators, and building sustainable free utility platforms that pass quality and trust reviews.',
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
