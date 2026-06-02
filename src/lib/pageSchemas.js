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

