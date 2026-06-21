import { cache } from 'react'
import {
  DEFAULT_IMAGE,
  LOGO_URL,
  ORGANIZATION_NAME,
  SITE_NAME,
  SITE_URL,
  buildAbsoluteUrl,
} from '@/config/site'
import { getAuthorForPost } from '@/lib/authors'
import { withDefaultToolFeaturedImages } from './toolFeaturedImages'

export const BLOG_POST_SELECT =
  '*, blog_categories(id,name,slug,description,icon,color,featured_image,seo_title,seo_description)'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''

const HTML_TAG_PATTERN = /<[^>]*>/g
const WHITESPACE_PATTERN = /\s+/g

async function fetchSupabaseRows(table, params = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('placeholder')) return []

  const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      console.error(`fetchSupabaseRows ${table} error:`, response.status, await response.text())
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`fetchSupabaseRows ${table} error:`, error)
    return []
  }
}

export function stripHtml(value = '') {
  return String(value || '').replace(HTML_TAG_PATTERN, ' ').replace(WHITESPACE_PATTERN, ' ').trim()
}

export function isEmptyBlogPost(post = {}) {
  return !post?.title?.trim() || !stripHtml(post.content).trim()
}

export function getBlogPostRobots(post = {}) {
  return String(post?.meta_robots || '').toLowerCase()
}

export function shouldNoIndexBlogPost(post = {}) {
  if (!post) return true
  if (post.status && post.status !== 'published') return true
  if (isEmptyBlogPost(post)) return true
  return getBlogPostRobots(post).includes('noindex')
}

export function isSitemapBlogPost(post = {}) {
  return Boolean(post?.slug) && post.status === 'published' && !isEmptyBlogPost(post) && !shouldNoIndexBlogPost(post)
}

export function getBlogPostDescription(post = {}) {
  return (
    post.seo_description ||
    post.excerpt ||
    stripHtml(post.content || '').slice(0, 160)
  ).trim()
}

export function getBlogPostCanonical(post = {}) {
  const canonical = post.canonical_url?.trim()
  if (canonical) return buildAbsoluteUrl(canonical)
  return buildAbsoluteUrl(`/blog/${encodeURIComponent(post.slug || '')}`)
}

export const getServerBlogPostBySlug = cache(async (slug) => {
  if (!slug) return null

  const rows = await fetchSupabaseRows('blog_posts', {
    select: BLOG_POST_SELECT,
    slug: `eq.${slug}`,
    limit: 1,
  })

  return rows[0] || null
})

export const getServerBlogStaticParams = cache(async () => {
  const rows = await fetchSupabaseRows('blog_posts', {
    select: 'slug,title,content,status,meta_robots',
    status: 'eq.published',
    order: 'updated_at.desc',
  })

  return rows
    .filter(isSitemapBlogPost)
    .map((post) => ({ slug: post.slug }))
})

export const getServerBlogShellData = cache(async () => {
  const [posts, categories, tools, toolCategories] = await Promise.all([
    fetchSupabaseRows('blog_posts', {
      select: BLOG_POST_SELECT,
      status: 'eq.published',
      order: 'created_at.desc',
      limit: 100,
    }),
    fetchSupabaseRows('blog_categories', {
      select: '*',
      order: 'sort_order.asc',
      limit: 100,
    }),
    fetchSupabaseRows('tools', {
      select: '*',
      status: 'eq.published',
      order: 'sort_order.asc',
      limit: 200,
    }),
    fetchSupabaseRows('categories', {
      select: '*',
      order: 'sort_order.asc',
      limit: 200,
    }),
  ])

  return {
    posts: posts.filter(isSitemapBlogPost),
    categories,
    tools: withDefaultToolFeaturedImages(tools),
    toolCategories,
  }
})

export function getBlogJsonLd(post = {}) {
  const canonical = getBlogPostCanonical(post)
  const description = getBlogPostDescription(post)
  const author = getAuthorForPost(post)
  const authorName = post.author_name || author.name
  const authorUrl = post.author_url || author.url
  const image = post.featured_image || post.og_image || DEFAULT_IMAGE
  const categoryName = post.blog_categories?.name || post.category

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image: [buildAbsoluteUrl(image)],
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
      ...(post.author_image || author.image ? { image: post.author_image || author.image } : {}),
      ...(post.author_bio || author.bio ? { description: post.author_bio || author.bio } : {}),
      ...(post.author_title || author.title ? { jobTitle: post.author_title || author.title } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      alternateName: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL,
      },
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    articleSection: categoryName,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: buildAbsoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  }

  const faq = post.faq_items?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq_items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null

  return { article, breadcrumb, faq }
}
