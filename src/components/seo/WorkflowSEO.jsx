import React from 'react'
import { Helmet } from 'react-helmet-async'

export default function WorkflowSEO({ page, canonicalBase = 'https://quickutils.page', steps = [] }) {
  if (!page) return null

  const title = page.seo_title || page.title
  const description = page.seo_description || page.excerpt || ''
  const canonical = page.canonical_url || `${canonicalBase}/workflow/${encodeURIComponent(page.slug)}`
  const image = page.featured_image || `${canonicalBase}/og-image.jpg`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalBase },
      { '@type': 'ListItem', position: 2, name: title, item: canonical },
    ],
  }

  const faqSchema = page.faq_items && page.faq_items.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq_items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null

  const howToSchema = steps.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    image: [image],
    totalTime: `PT${Math.max(5, steps.length * 3)}M`,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  } : null

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {page.seo_keywords && <meta name="keywords" content={page.seo_keywords} />}
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
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

      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
    </Helmet>
  )
}
