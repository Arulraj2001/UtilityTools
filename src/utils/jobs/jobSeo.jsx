import React from 'react'
import { Helmet } from 'react-helmet-async'
import { SITE_URL } from '@/components/seo/StaticPageSEO'
import { DEFAULT_IMAGE, ORGANIZATION_NAME, SITE_NAME } from '@/config/site'

/**
 * Returns true if the job's last_date is more than `days` days in the past.
 */
const isExpired = (lastDate, days = 60) => {
  if (!lastDate) return false
  const deadline = new Date(lastDate)
  if (Number.isNaN(deadline.getTime())) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return deadline < cutoff
}

export const JobSEO = ({ job }) => {
  if (!job) return null
  const title = job.seo_title || job.title
  const description = job.seo_description || job.short_description || ''
  const url = job.canonical_url || `${SITE_URL}/jobs/${encodeURIComponent(job.slug)}`
  const image = job.og_image || DEFAULT_IMAGE

  // Determine robots directive — noindex expired jobs to prevent thin/stale content
  const expired = isExpired(job.last_date, 60)
  const robotsContent = expired
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large'

  // ── JobPosting structured data ────────────────────────────────────────────
  const jobPosting = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.short_description || job.full_description || '',
    datePosted: job.created_at,
    // Only include validThrough if last_date actually has a value
    ...(job.last_date ? { validThrough: job.last_date } : {}),
    employmentType: job.job_type,
    url,
    mainEntityOfPage: url,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.organization || ORGANIZATION_NAME,
      ...(job.official_website ? { sameAs: job.official_website } : {}),
    },
    // jobLocation — only include if location is present
    ...(job.location ? {
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: job.location,
          addressCountry: 'IN',
        },
      },
    } : {}),
    // applicantLocationRequirements
    ...(job.location ? {
      applicantLocationRequirements: {
        '@type': 'Country',
        name: 'India',
      },
    } : {}),
    // baseSalary — required for Google for Jobs salary display
    ...(job.salary ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          value: job.salary,
          unitText: 'MONTH',
        },
      },
    } : {}),
    // applyAction — proper schema.org pattern (replaces invalid applicationContact)
    ...(job.apply_link ? {
      directApply: true,
    } : {}),
    // dateModified for freshness signal
    ...(job.updated_at ? { dateModified: job.updated_at } : {}),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE_URL}/jobs` },
      ...(job.category ? [
        { '@type': 'ListItem', position: 3, name: job.category, item: `${SITE_URL}/jobs?category=${encodeURIComponent(job.category)}` },
        { '@type': 'ListItem', position: 4, name: job.title, item: url },
      ] : [
        { '@type': 'ListItem', position: 3, name: job.title, item: url },
      ]),
    ],
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={robotsContent} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:image" content={image} />
      {/* meta keywords removed — ignored by Google since 2009 and treated as spam signal */}
      <script type="application/ld+json">{JSON.stringify(jobPosting)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: description,
        url,
        mainEntityOfPage: url,
        datePublished: job.created_at,
        ...(job.updated_at ? { dateModified: job.updated_at } : {}),
        author: {
          '@type': 'Organization',
          name: ORGANIZATION_NAME,
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: ORGANIZATION_NAME,
          url: SITE_URL,
          ...(image ? { logo: { '@type': 'ImageObject', url: image } } : {}),
        },
        ...(image ? { image } : {}),
      })}</script>
    </Helmet>
  )
}

export default JobSEO

/**
 * Utility: check if a job is expired (for use in other components)
 */
export { isExpired }
