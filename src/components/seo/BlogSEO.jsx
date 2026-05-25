import React from 'react'
import { Helmet } from 'react-helmet-async'

export default function BlogSEO({ post, canonicalBase = 'https://quickutils.page' }) {
  if (!post) return null

  const title = post.seo_title || post.title
  const description = post.seo_description || post.excerpt || ''
  const canonical = `${canonicalBase}/blog/${encodeURIComponent(post.slug)}`
  const image = post.featured_image || `${canonicalBase}/og-image.jpg`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalBase },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${canonicalBase}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical }
    ]
  }

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: [image],
    author: post.author_name || post.author || 'QuickUtils',
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical
  }

  const faqSchema = post.faq_items && post.faq_items.length > 0 ? {
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
  } : null

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {post.seo_keywords && <meta name="keywords" content={post.seo_keywords} />}
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="QuickUtils" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      <script type="application/ld+json">{JSON.stringify(blogPosting)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
    </Helmet>
  )
}
