import { cache } from 'react'
import { DEFAULT_IMAGE, LOGO_URL, ORGANIZATION_NAME, SITE_NAME, SITE_URL, buildAbsoluteUrl } from '@/config/site'
import { fetchSupabaseRows } from '@/lib/serverSupabaseData'

export const JOB_SELECT = '*'

export function getJobCanonical(job = {}) {
  return buildAbsoluteUrl(job.canonical_url || `/jobs/${encodeURIComponent(job.slug || '')}`)
}

export function getJobDescription(job = {}) {
  return (
    job.seo_description ||
    job.short_description ||
    String(job.full_description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    'Review this QuickUtils job listing and verify official dates, eligibility, fees, and application details before applying.'
  )
}

export function isJobExpired(job = {}, now = new Date()) {
  if (!job?.last_date) return false
  const deadline = new Date(job.last_date)
  if (Number.isNaN(deadline.getTime())) return false
  deadline.setHours(23, 59, 59, 999)
  return deadline < now
}

export function isStaleExpiredJob(job = {}, days = 60, now = new Date()) {
  if (!isJobExpired(job, now) || !job?.last_date) return false
  const deadline = new Date(job.last_date)
  return (now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24) > days
}

export function hasOfficialJobSource(job = {}) {
  return Boolean(job.official_website || job.apply_link || job.notification_pdf)
}

export function isUsefulJob(job = {}) {
  return Boolean(job?.slug && job?.title && job?.organization && job?.status === 'published' && hasOfficialJobSource(job))
}

export function isSitemapJob(job = {}) {
  return isUsefulJob(job) && !isStaleExpiredJob(job, 60)
}

export const getServerJobs = cache(async ({ limit = 20, category = null } = {}) => {
  const params = {
    select: JOB_SELECT,
    status: 'eq.published',
    order: 'last_date.desc.nullslast,updated_at.desc',
    limit,
  }

  if (category) params.category = `eq.${category}`

  const rows = await fetchSupabaseRows('jobs', params)
  return rows.filter((job) => job?.status === 'published')
})

export const getServerFeaturedJobs = cache(async ({ limit = 6 } = {}) => {
  const rows = await fetchSupabaseRows('jobs', {
    select: JOB_SELECT,
    status: 'eq.published',
    featured: 'eq.true',
    order: 'last_date.desc.nullslast,updated_at.desc',
    limit,
  })

  return rows.filter((job) => job?.status === 'published')
})

export const getServerJobCategories = cache(async ({ limit = 200 } = {}) => {
  return fetchSupabaseRows('job_categories', {
    select: '*',
    order: 'sort_order.asc',
    limit,
  })
})

export const getServerJobBySlug = cache(async (slug) => {
  if (!slug) return null
  const rows = await fetchSupabaseRows('jobs', {
    select: JOB_SELECT,
    slug: `eq.${slug}`,
    limit: 1,
  })

  return rows[0] || null
})

export const getServerJobsShellData = cache(async () => {
  const [jobs, featured, categories] = await Promise.all([
    getServerJobs({ limit: 100 }),
    getServerFeaturedJobs({ limit: 6 }),
    getServerJobCategories({ limit: 200 }),
  ])

  return { jobs, featured, categories }
})

export function buildJobJsonLd(job = {}) {
  const canonical = getJobCanonical(job)
  const description = getJobDescription(job)
  const expired = isJobExpired(job)

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: buildAbsoluteUrl('/jobs') },
      { '@type': 'ListItem', position: 3, name: job.title, item: canonical },
    ],
  }

  const schemas = [breadcrumb]

  if (!expired && isUsefulJob(job)) {
    schemas.unshift({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description,
      datePosted: job.created_at || job.updated_at,
      ...(job.last_date ? { validThrough: job.last_date } : {}),
      ...(job.job_type ? { employmentType: job.job_type } : {}),
      url: canonical,
      hiringOrganization: {
        '@type': 'Organization',
        name: job.organization || ORGANIZATION_NAME,
        ...(job.official_website ? { sameAs: job.official_website } : {}),
        logo: LOGO_URL,
      },
      ...(job.location
        ? {
            jobLocation: {
              '@type': 'Place',
              address: {
                '@type': 'PostalAddress',
                addressLocality: job.location,
                addressCountry: 'IN',
              },
            },
          }
        : {}),
      ...(job.apply_link ? { directApply: true } : {}),
      ...(job.updated_at ? { dateModified: job.updated_at } : {}),
    })
  }

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: job.title,
    description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      alternateName: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL || DEFAULT_IMAGE,
      },
    },
  })

  return schemas
}

