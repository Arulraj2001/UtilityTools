import { DEFAULT_IMAGE, ORGANIZATION_NAME, SITE_NAME, SITE_URL } from '@/config/site'

export const buildItemList = (items = [], getItem) => ({
  '@type': 'ItemList',
  itemListElement: items.filter(Boolean).map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    ...getItem(item, index),
  })),
})

export const buildCollectionPageSchema = ({
  name,
  description,
  url,
  image = DEFAULT_IMAGE,
  items = [],
  getItem,
}) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  description,
  url,
  image,
  publisher: {
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
  },
  ...(items.length && getItem ? { mainEntity: buildItemList(items, getItem) } : {}),
})

export const buildFaqSchema = (items = []) => {
  const validItems = items.filter((item) => item?.question && item?.answer)
  if (!validItems.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * HowTo Schema - Use for tools with clear sequential steps (photo resize, PDF merge, document scan, etc.)
 * Pass an array of step objects: { name: string, text: string, url?: string (optional image or anchor) }
 */
export const buildHowToSchema = ({ name, description, url, steps = [], totalTime = null }) => {
  const validSteps = steps.filter((s) => s?.name && s?.text)
  if (!validSteps.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url,
    ...(totalTime && { totalTime }),
    step: validSteps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
    })),
  }
}

/**
 * Enhanced WebApplication / SoftwareApplication for tools.
 * Call this from ToolSEO or per-page for stronger structured data.
 */
export const buildWebApplicationSchema = ({
  name,
  description,
  url,
  applicationCategory = 'UtilitiesApplication',
  operatingSystem = 'Any',
  offersPrice = '0',
  offersCurrency = 'USD',
  features = [],
  aggregateRating = null,
}) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name,
  description,
  url,
  applicationCategory,
  operatingSystem,
  browserRequirements: 'Requires JavaScript. Works in modern Chrome, Firefox, Edge, Safari.',
  offers: {
    '@type': 'Offer',
    price: offersPrice,
    priceCurrency: offersCurrency,
  },
  ...(features?.length ? { featureList: features } : {}),
  ...(aggregateRating ? { aggregateRating } : {}),
})

/**
 * Simple ItemList for category / tools listing pages
 */
export const buildToolsListSchema = (tools = [], categoryName, baseUrl) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: categoryName ? `${categoryName} Tools` : 'QuickUtils Tools',
  itemListElement: tools.slice(0, 20).map((tool, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'SoftwareApplication',
      name: tool.name,
      url: `${baseUrl}/tool/${tool.slug}`,
      description: tool.description,
    },
  })),
})

