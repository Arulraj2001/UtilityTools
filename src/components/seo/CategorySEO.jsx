import React from 'react'
import { Helmet } from 'react-helmet-async'
import { DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '@/config/site'

export default function CategorySEO({ category, canonicalBase = SITE_URL }) {
  if (!category) return null

  const title = category.seo_title || category.name
  const description = category.seo_description || category.description || ''
  const canonical = category.canonical_url || `${canonicalBase}/category/${encodeURIComponent(category.slug)}`
  const image = category.featured_image || DEFAULT_IMAGE
  const keywords = category.seo_keywords || ''

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalBase },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: `${canonicalBase}/categories` },
      { '@type': 'ListItem', position: 3, name: category.name, item: canonical }
    ]
  }

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    image: image,
    ...(category.featured_image && { mainImage: { '@type': 'ImageObject', url: category.featured_image } })
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(collectionPageSchema)}</script>
    </Helmet>
  )
}
