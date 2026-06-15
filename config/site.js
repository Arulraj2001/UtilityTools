const DEFAULT_SITE_URL = 'https://www.quickutils.page'

const envSiteUrl =
  (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || process.env.SITE_URL) : undefined) ||
  (typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_SITE_URL || import.meta.env?.PUBLIC_SITE_URL || import.meta.env?.SITE_URL) : undefined) ||
  DEFAULT_SITE_URL

export const SITE_URL = envSiteUrl.replace(/\/$/, '')
export const SITE_NAME = 'QuickUtils'
export const ORGANIZATION_NAME = 'Learnithm'
export const CONTACT_EMAIL = 'support@quickutils.page'
export const FOUNDER_NAME = 'Arulraj S'
export const FOUNDER_SLUG = 'arulraj-s'

export const buildAbsoluteUrl = (path = '/') => {
  if (!path) return SITE_URL
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export const DEFAULT_IMAGE = buildAbsoluteUrl('/preview.png')
export const LOGO_URL = buildAbsoluteUrl('/logo.png')

export const founderSchema = {
  '@type': 'Person',
  name: FOUNDER_NAME,
  url: buildAbsoluteUrl(`/author/${FOUNDER_SLUG}`),
  jobTitle: 'Founder',
  worksFor: {
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
  },
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: ORGANIZATION_NAME,
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: LOGO_URL,
  },
  email: `mailto:${CONTACT_EMAIL}`,
  founder: founderSchema,
  contactPoint: {
    '@type': 'ContactPoint',
    email: CONTACT_EMAIL,
    contactType: 'customer support',
    availableLanguage: ['en'],
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
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
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/tools?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}
