import React from 'react'
import { Helmet } from 'react-helmet-async'
import { SITE_URL } from '@/components/seo/StaticPageSEO'

export const JobSEO = ({ job }) => {
  if (!job) return null
  const title = job.seo_title || job.title
  const description = job.seo_description || job.short_description || ''
  const url = job.canonical_url || `${SITE_URL}/jobs/${encodeURIComponent(job.slug)}`

  const jobPosting = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.short_description || job.full_description || '',
    datePosted: job.created_at,
    validThrough: job.last_date,
    employmentType: job.job_type,
    hiringOrganization: { name: job.organization },
    jobLocation: { name: job.location },
    applicantLocationRequirements: job.location || undefined,
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:url" content={url} />
      {job.seo_keywords && <meta name="keywords" content={job.seo_keywords} />}
      {job.og_image && <meta property="og:image" content={job.og_image} />}
      <script type="application/ld+json">{JSON.stringify(jobPosting)}</script>
    </Helmet>
  )
}

export default JobSEO
