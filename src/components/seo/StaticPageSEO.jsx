import React from 'react'
import { Helmet } from 'react-helmet-async'

export const SITE_URL = 'https://quickutils.page'
const DEFAULT_IMAGE = `${SITE_URL}/preview.png`

export function buildBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export default function StaticPageSEO({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  ogTitle = title,
  ogDescription = description,
  robots = 'index, follow, max-image-preview:large',
  jsonLd = [],
}) {
  const canonical = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
  const schemas = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd].filter(Boolean)

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="QuickUtils" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
