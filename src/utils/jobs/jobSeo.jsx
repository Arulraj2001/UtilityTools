import React from 'react'
import { Helmet } from 'react-helmet-async'
import { SITE_URL } from '@/components/seo/StaticPageSEO'
import { DEFAULT_IMAGE, ORGANIZATION_NAME, SITE_NAME } from '@/config/site'

export const JobSEO = ({ job }) => {
  if (!job) return null
  const title = job.seo_title || job.title
  const description = job.seo_description || job.short_description || ''
  const url = job.canonical_url || `${SITE_URL}/jobs/${encodeURIComponent(job.slug)}`
  const image = job.og_image || DEFAULT_IMAGE

  const jobPosting = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.short_description || job.full_description || '',
    datePosted: job.created_at,
    validThrough: job.last_date,
    employmentType: job.job_type,
    url,
    mainEntityOfPage: url,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.organization || ORGANIZATION_NAME,
      ...(job.official_website ? { sameAs: job.official_website } : {}),
    },
    jobLocation: job.location ? {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
      },
    } : undefined,
    applicantLocationRequirements: job.location ? {
      '@type': 'Place',
      name: job.location,
    } : undefined,
    ...(job.apply_link ? { applicationContact: { '@type': 'ContactPoint', url: job.apply_link } } : {}),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE_URL}/jobs` },
      { '@type': 'ListItem', position: 3, name: job.title, item: url },
    ],
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:image" content={image} />
      {job.seo_keywords && <meta name="keywords" content={job.seo_keywords} />}
      <script type="application/ld+json">{JSON.stringify(jobPosting)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
    </Helmet>
  )
}

export default JobSEO
