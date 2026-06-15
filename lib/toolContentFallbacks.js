const stripHtml = (value = '') => String(value || '').replace(/<[^>]*>/g, ' ')

export const countWords = (value = '') => (
  stripHtml(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
)

const categoryUseCases = {
  'PDF Tools': [
    'preparing documents for forms, email, and uploads',
    'checking page order, file size, and final readability before sharing',
    'cleaning up document workflows without opening a heavy desktop editor',
  ],
  'Image Tools': [
    'resizing, compressing, converting, or checking images before upload',
    'preparing profile photos, web images, thumbnails, and documents',
    'balancing file size with enough visual clarity for the final use',
  ],
  'Government Exam Tools': [
    'preparing photos, signatures, and PDF documents for application portals',
    'matching common upload limits for exams, jobs, and official forms',
    'checking dimensions, file size, and format before final submission',
  ],
  Finance: [
    'estimating payments, returns, fees, or margins before comparing options',
    'testing multiple scenarios by changing only one input at a time',
    'using the result as planning support rather than final financial advice',
  ],
  Education: [
    'checking marks, grades, attendance, credits, or study planning numbers',
    'understanding the formula before comparing results with official rules',
    'saving time on routine student calculations',
  ],
  'Developer Tools': [
    'formatting, validating, encoding, decoding, or cleaning technical input',
    'debugging API payloads, URLs, snippets, or structured data',
    'copying clean output back into your editor, CMS, or documentation',
  ],
  'SEO Tools': [
    'checking crawl, metadata, schema, keyword, or preview-related details',
    'preparing implementation snippets for websites and content workflows',
    'reviewing generated output before publishing it to production',
  ],
  'Text Tools': [
    'cleaning, counting, sorting, converting, or restructuring text',
    'preparing copied content before publishing or pasting into another app',
    'spot-checking output for formatting changes that matter',
  ],
  'Logistics Shipping': [
    'estimating shipment weight, cost, packaging, or delivery planning details',
    'comparing parcel scenarios before booking or quoting shipping',
    'checking carrier assumptions before using the estimate commercially',
  ],
  'Ecommerce Seller Tools': [
    'estimating fees, margins, GST, pricing, COD risk, and inventory decisions',
    'testing seller scenarios before listing, shipping, or scaling products',
    'treating the output as planning guidance that should be verified with live costs',
  ],
}

const normalizeCategoryName = (categoryName = '') => {
  if (categoryName === 'Logistics & Shipping') return 'Logistics Shipping'
  if (categoryName === 'E-commerce Seller Tools') return 'Ecommerce Seller Tools'
  return categoryName || 'QuickUtils Tools'
}

export const getToolUseCases = (categoryName) => {
  const normalized = normalizeCategoryName(categoryName)
  return categoryUseCases[normalized] || [
    'finishing a focused online task without installing another app',
    'checking inputs and outputs in a simple browser interface',
    'saving time on repeated utility work while keeping the result easy to review',
  ]
}

export const buildToolFaqItems = (tool, categoryName) => {
  const name = tool?.name || 'this tool'
  const category = categoryName || 'QuickUtils'
  const fieldLabels = (tool?.input_fields || [])
    .map((field) => field?.label || field?.name)
    .filter(Boolean)
    .slice(0, 4)
  const needsFiles = /pdf|image|photo|file|document|jpg|png|scanner|compress|resize|convert/i.test(
    `${tool?.name || ''} ${tool?.slug || ''} ${tool?.description || ''}`
  )

  return [
    {
      question: `Is ${name} free to use?`,
      answer: `Yes. ${name} is available as a free QuickUtils tool for common ${category.toLowerCase()} tasks.`,
    },
    {
      question: `What do I need before using ${name}?`,
      answer: fieldLabels.length
        ? `Keep these inputs ready: ${fieldLabels.join(', ')}. Review the result before using it for official, financial, health, or business decisions.`
        : `Open the tool, add the required values or files shown on the page, and review the output before relying on it.`,
    },
    {
      question: needsFiles ? 'Are my files uploaded permanently?' : 'Are the results final?',
      answer: needsFiles
        ? 'Many QuickUtils file tools are designed for browser-side processing where supported. Avoid using highly sensitive files unless you are comfortable with the tool flow and have reviewed the Privacy Policy.'
        : 'Results are calculated from the values you enter and should be treated as practical guidance. Verify important outputs against official rules, statements, or source documents.',
    },
    {
      question: `How can I get better results from ${name}?`,
      answer: 'Start with clean inputs, change one setting at a time, compare the output, and repeat if the result does not match your required format or target.',
    },
  ]
}

export const getToolHowToSteps = (tool) => {
  const name = tool?.name || 'the tool'
  const fields = (tool?.input_fields || [])
    .map((field) => field?.label || field?.name)
    .filter(Boolean)
    .slice(0, 5)

  return [
    `Open ${name} and read the visible input labels before adding data.`,
    fields.length
      ? `Enter the required values for ${fields.join(', ')}.`
      : 'Add the values, text, image, PDF, or document requested by the tool.',
    'Run the tool and wait for the result panel or preview to update.',
    'Review the output carefully, especially if it will be used for a form, business task, or official submission.',
    'Adjust settings or input values and run it again if the output needs a different format, size, or calculation scenario.',
  ]
}

export const shouldAddToolFallbackContent = (tool) => (
  !tool?.seo_content || countWords(tool.seo_content) < 120
)

