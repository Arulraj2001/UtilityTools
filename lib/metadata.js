import { DEFAULT_IMAGE, SITE_NAME, SITE_URL, buildAbsoluteUrl } from '@/config/site'

export function buildPageMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  noindex = false,
  follow = true,
  type = 'website',
}) {
  const canonical = buildAbsoluteUrl(path)

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: !noindex,
      follow,
      googleBot: {
        index: !noindex,
        follow,
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: image ? [image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  }
}

