export const IMAGE_TOOL_FEATURED_IMAGES = {
  'image-compressor': '/tool-icons/image-tools/image-compressor.svg',
  'image-resizer': '/tool-icons/image-tools/image-resizer.svg',
  'image-converter': '/tool-icons/image-tools/image-converter.svg',
  'image-cropper': '/tool-icons/image-tools/image-cropper.svg',
  'image-rotator': '/tool-icons/image-tools/image-rotator.svg',
  'image-watermark': '/tool-icons/image-tools/image-watermark.svg',
  'image-to-pdf': '/tool-icons/image-tools/image-to-pdf.svg',
  'image-color-picker': '/tool-icons/image-tools/image-color-picker.svg',
  'image-metadata-viewer': '/tool-icons/image-tools/image-metadata-viewer.svg',
  'background-remover': '/tool-icons/image-tools/background-remover.svg',
}

export const PDF_TOOL_FEATURED_IMAGES = {
  'merge-pdf': '/tool-icons/pdf-tools/merge-pdf.svg',
  'split-pdf': '/tool-icons/pdf-tools/split-pdf.svg',
  'compress-pdf': '/tool-icons/pdf-tools/compress-pdf.svg',
  'pdf-to-jpg': '/tool-icons/pdf-tools/pdf-to-jpg.svg',
  'jpg-to-pdf': '/tool-icons/pdf-tools/jpg-to-pdf.svg',
  'protect-pdf': '/tool-icons/pdf-tools/protect-pdf.svg',
  'remove-pages-pdf': '/tool-icons/pdf-tools/remove-pages-pdf.svg',
  'word-to-pdf': '/tool-icons/pdf-tools/word-to-pdf.svg',
}

export const RELATIONSHIP_TOOL_FEATURED_IMAGES = {
  'love-percentage-calculator': '/tool-icons/relationship-tools/love-percentage-calculator.svg',
  'crush-compatibility-calculator': '/tool-icons/relationship-tools/crush-compatibility-calculator.svg',
  'friendship-calculator': '/tool-icons/relationship-tools/friendship-calculator.svg',
  'zodiac-compatibility': '/tool-icons/relationship-tools/zodiac-compatibility.svg',
  'baby-name-numerology': '/tool-icons/relationship-tools/baby-name-numerology.svg',
}

export const FINANCE_TOOL_FEATURED_IMAGES = {
  'emi-calculator': '/tool-icons/finance/emi-calculator.svg',
  'sip-calculator': '/tool-icons/finance/sip-calculator.svg',
  'gst-calculator': '/tool-icons/finance/gst-calculator.svg',
  'simple-interest': '/tool-icons/finance/simple-interest.svg',
  'compound-interest': '/tool-icons/finance/compound-interest.svg',
  'discount-calculator': '/tool-icons/finance/discount-calculator.svg',
  'tip-calculator': '/tool-icons/finance/tip-calculator.svg',
}

const DEFAULT_TOOL_FEATURED_IMAGES = {
  ...IMAGE_TOOL_FEATURED_IMAGES,
  ...PDF_TOOL_FEATURED_IMAGES,
  ...RELATIONSHIP_TOOL_FEATURED_IMAGES,
  ...FINANCE_TOOL_FEATURED_IMAGES,
}

export const getDefaultToolFeaturedImage = (tool = {}) => {
  const existing = String(tool.featured_image || '').trim()
  if (existing) return existing

  return DEFAULT_TOOL_FEATURED_IMAGES[tool.slug] || ''
}

export const withDefaultToolFeaturedImage = (tool) => {
  if (!tool) return tool

  const featuredImage = getDefaultToolFeaturedImage(tool)
  if (!featuredImage || featuredImage === tool.featured_image) return tool

  return {
    ...tool,
    featured_image: featuredImage,
  }
}

export const withDefaultToolFeaturedImages = (tools = []) => (
  tools.map(withDefaultToolFeaturedImage)
)
