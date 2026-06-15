const defaultFaq = (name) => [
  {
    question: `What can I do with ${name}?`,
    answer: `${name} helps you find focused QuickUtils tools, guides, and workflows for one task area instead of browsing the full utility library.`,
  },
  {
    question: `How should I choose between tools in ${name}?`,
    answer: 'Start with the tool that matches your exact input and output need, then use related guides or workflows when you need step-by-step context.',
  },
  {
    question: `Are ${name} free to use?`,
    answer: 'Yes. QuickUtils tools are free to use in the browser, with supporting guides and methodology pages for transparency.',
  },
]

const hubs = {
  education: {
    intro:
      'Education tools help students turn marks, grades, attendance, credits, and study timelines into clear numbers they can act on. This hub prioritizes exam preparation, semester planning, and result interpretation rather than generic calculator browsing.',
    highlights: ['Marks and percentage checks', 'SGPA, CGPA, and GPA planning', 'Attendance and study-time decisions'],
    blogKeywords: ['sgpa', 'cgpa', 'percentage', 'marks', 'grade', 'student'],
    workflowKeywords: ['exam', 'student', 'study', 'form'],
    relatedCategorySlugs: ['math-tools', 'government-exam-tools', 'pdf-tools'],
    faqs: [
      {
        question: 'Which education calculator should I use first?',
        answer: 'Use marks percentage for raw marks, SGPA for semester credit-grade calculations, CGPA for cumulative performance, and attendance calculators when minimum attendance is the main constraint.',
      },
      {
        question: 'Do education tools replace official results?',
        answer: 'No. They help with planning and checking calculations, but official marksheets, university rules, and exam authority instructions should always be treated as final.',
      },
      {
        question: 'How are education formulas reviewed?',
        answer: 'Formulas are documented in tool content and reviewed against common grading patterns. When rules vary by institution, the page explains assumptions and limitations.',
      },
    ],
  },
  'pdf-tools': {
    intro:
      'PDF tools focus on document preparation tasks such as merging, compressing, extracting, converting, and reducing file size for uploads. This hub is especially useful for exam forms, office submissions, and everyday document cleanup.',
    highlights: ['Merge and split documents', 'Compress PDFs for upload limits', 'Convert images and PDFs for forms'],
    blogKeywords: ['pdf', 'merge', 'compress', 'document', 'upload'],
    workflowKeywords: ['pdf', 'document', 'exam', 'upload'],
    relatedCategorySlugs: ['image-tools', 'government-exam-tools', 'developer-tools'],
    faqs: [
      {
        question: 'Which PDF tool should I use for upload size limits?',
        answer: 'Start with PDF Size Reducer or Compress PDF. If your document is image-heavy, resize or compress the images before creating the final PDF.',
      },
      {
        question: 'Can I combine PDF tools in one workflow?',
        answer: 'Yes. Common workflows include converting images to PDF, merging pages, then compressing the final document to meet a size limit.',
      },
      {
        question: 'Are uploaded PDF files stored?',
        answer: 'PDF tools are designed for browser-based processing where possible. Review the Privacy Policy and methodology notes for file-handling details.',
      },
    ],
  },
  'image-tools': {
    intro:
      'Image tools help resize, compress, crop, convert, inspect, and prepare images for forms, websites, social profiles, and document workflows. The hub is organized around practical output requirements like dimensions, file size, format, and visual clarity.',
    highlights: ['Resize by pixel dimensions', 'Compress without losing too much clarity', 'Prepare form and profile images'],
    blogKeywords: ['image', 'photo', 'compress', 'resize', 'kb', 'pixels'],
    workflowKeywords: ['image', 'photo', 'exam', 'passport', 'resize'],
    relatedCategorySlugs: ['pdf-tools', 'government-exam-tools', 'creator-tools'],
    faqs: [
      {
        question: 'Should I resize or compress an image first?',
        answer: 'Resize first when the required dimensions are fixed. Compress after resizing when the file still needs to fit under a KB or MB limit.',
      },
      {
        question: 'Which formats are best for forms?',
        answer: 'Most forms accept JPG or PNG. Use the required format in the form instructions, then check both dimensions and file size before uploading.',
      },
      {
        question: 'How do image tools support SEO?',
        answer: 'For website use, smaller correctly sized images improve loading behavior and make it easier to use descriptive filenames and alt text.',
      },
    ],
  },
  finance: {
    intro:
      'Finance calculators help estimate loans, savings, interest, salary, taxes, and business numbers with transparent assumptions. This hub is for quick planning and comparison, not financial advice.',
    highlights: ['EMI, SIP, and interest estimates', 'Salary and tax-related calculations', 'Business margin and ROI checks'],
    blogKeywords: ['emi', 'sip', 'interest', 'salary', 'finance', 'roi'],
    workflowKeywords: ['finance', 'calculator', 'planning'],
    relatedCategorySlugs: ['math-tools', 'ecommerce-seller-tools', 'daily-life'],
    faqs: [
      {
        question: 'Are finance calculator results exact?',
        answer: 'They are estimates based on the inputs and formulas shown. Banks, employers, tax rules, and fees can change the final real-world result.',
      },
      {
        question: 'Which calculator helps compare loans?',
        answer: 'Use EMI calculators for monthly payment planning and interest calculators to compare total interest across different rates or durations.',
      },
      {
        question: 'Can finance tools be used for business planning?',
        answer: 'Yes, margin, ROI, pricing, and seller calculators can support planning, but they should be verified with current costs and professional advice when money decisions matter.',
      },
    ],
  },
  'developer-tools': {
    intro:
      'Developer tools support everyday debugging, formatting, encoding, minifying, schema checks, and API-related tasks. This hub favors fast inspection and clean output for working with JSON, URLs, Base64, HTML, CSS, and JavaScript.',
    highlights: ['Format and validate structured data', 'Encode and decode common web values', 'Minify and clean front-end assets'],
    blogKeywords: ['json', 'base64', 'url', 'developer', 'schema', 'code'],
    workflowKeywords: ['developer', 'json', 'schema', 'seo'],
    relatedCategorySlugs: ['seo-tools', 'text-tools', 'pdf-tools'],
    faqs: [
      {
        question: 'Which developer tool is best for API debugging?',
        answer: 'Use JSON Formatter for API responses, URL Encoder/Decoder for query strings, and Base64 tools when payloads or tokens need encoding checks.',
      },
      {
        question: 'Do developer tools change my source data?',
        answer: 'Most tools transform the input you provide and show the result for copying. Always keep your original code or payload when debugging important work.',
      },
      {
        question: 'Can developer tools help SEO implementation?',
        answer: 'Yes. Schema, Open Graph, robots, sitemap, and metadata utilities support technical SEO checks and implementation workflows.',
      },
    ],
  },
  'government-exam-tools': {
    intro:
      'Government exam tools help prepare photos, signatures, PDFs, and document uploads for common application requirements. This hub focuses on dimensions, KB limits, format conversion, and final pre-submission checks.',
    highlights: ['Photo and signature resizing', 'PDF size and page preparation', 'Exam-form document cleanup'],
    blogKeywords: ['exam', 'photo', 'signature', 'ssc', 'railway', 'upload'],
    workflowKeywords: ['exam', 'photo', 'signature', 'pdf'],
    relatedCategorySlugs: ['image-tools', 'pdf-tools', 'education'],
  },
  'math-tools': {
    intro:
      'Math tools cover quick arithmetic, percentages, fractions, averages, matrices, probability, and number theory checks. This hub is useful for students, teachers, and anyone who needs a clear calculation without setting up a spreadsheet.',
    highlights: ['Percentages, fractions, and averages', 'HCF, LCM, primes, and numerals', 'Probability, matrices, and equations'],
    blogKeywords: ['fraction', 'percentage', 'math', 'calculator', 'hcf', 'lcm'],
    workflowKeywords: ['math', 'student', 'calculator'],
    relatedCategorySlugs: ['education', 'finance', 'daily-life'],
  },
  'seo-tools': {
    intro:
      'SEO tools help create, inspect, and troubleshoot metadata, sitemaps, robots.txt files, schema markup, keyword density, UTM links, and Open Graph previews. This hub is built around technical checks that affect crawlability and search presentation.',
    highlights: ['Metadata and Open Graph checks', 'Schema, robots, and sitemap helpers', 'Keyword and campaign utilities'],
    blogKeywords: ['seo', 'schema', 'robots', 'sitemap', 'metadata', 'open graph'],
    workflowKeywords: ['seo', 'schema', 'robots', 'sitemap'],
    relatedCategorySlugs: ['developer-tools', 'text-tools', 'creator-tools'],
  },
  'text-tools': {
    intro:
      'Text tools help count, clean, sort, convert, reverse, and inspect writing or copied lists. This hub is useful for editing, drafting, content QA, simple data cleanup, and preparing text before publishing.',
    highlights: ['Word and character counting', 'Case conversion and text cleanup', 'Sorting, deduplication, and formatting'],
    blogKeywords: ['word', 'text', 'writing', 'counter', 'editing'],
    workflowKeywords: ['writing', 'text', 'content'],
    relatedCategorySlugs: ['seo-tools', 'developer-tools', 'creator-tools'],
  },
  'date-time-tools': {
    intro:
      'Date and time tools help compare dates, calculate business days, convert time zones, check week numbers, and plan schedules. This hub is for quick timeline decisions without manual calendar counting.',
    highlights: ['Date differences and business days', 'World clock and time zones', 'Countdowns and scheduling support'],
    blogKeywords: ['date', 'time', 'timezone', 'schedule'],
    workflowKeywords: ['date', 'time', 'planning'],
    relatedCategorySlugs: ['daily-life', 'education', 'finance'],
  },
  'daily-life': {
    intro:
      'Daily life tools cover practical personal calculations such as age, tips, fuel cost, dates, sleep, water intake, and everyday unit conversions. This hub is built for quick answers to routine planning questions.',
    highlights: ['Age, date, and unit calculations', 'Fuel, tip, and expense planning', 'Sleep and daily wellness estimates'],
    blogKeywords: ['daily', 'fuel', 'sleep', 'date', 'unit'],
    workflowKeywords: ['daily', 'planning', 'calculator'],
    relatedCategorySlugs: ['health-fitness', 'date-time-tools', 'finance'],
  },
  'health-fitness': {
    intro:
      'Health and fitness calculators estimate BMI, BMR, calories, water intake, body fat, ideal weight, pregnancy dates, and cycle-related timelines. These tools are informational and should be checked with qualified guidance for health decisions.',
    highlights: ['BMI, BMR, and calorie estimates', 'Water intake and body composition checks', 'Pregnancy and cycle planning tools'],
    blogKeywords: ['health', 'fitness', 'bmi', 'calorie', 'water'],
    workflowKeywords: ['health', 'fitness', 'calculator'],
    relatedCategorySlugs: ['daily-life', 'math-tools', 'finance'],
  },
  'ecommerce-seller-tools': {
    intro:
      'Ecommerce seller tools help estimate marketplace fees, profit margins, GST invoices, product pricing, COD charges, inventory, and ROI. This hub supports marketplace sellers who need quick operational math before listing or shipping.',
    highlights: ['Marketplace fee and profit estimates', 'GST invoice and product pricing support', 'Inventory, COD, and ROI planning'],
    blogKeywords: ['seller', 'amazon', 'flipkart', 'pricing', 'profit', 'gst'],
    workflowKeywords: ['seller', 'ecommerce', 'shipping', 'pricing'],
    relatedCategorySlugs: ['finance', 'logistics-shipping', 'seo-tools'],
  },
  'seller-tools': {
    intro:
      'Seller tools help online sellers understand marketplace fees, profit, pricing, COD risk, GST invoices, stock planning, shipping labels, ROI, and business performance. This hub is built for practical seller decisions before listing products, running ads, buying inventory, or shipping orders.',
    highlights: ['Marketplace fee and profit analysis', 'Pricing, invoice, stock, and ROI planning', 'Seller dashboards for operational decisions'],
    blogKeywords: ['seller', 'amazon', 'flipkart', 'marketplace', 'profit', 'pricing'],
    workflowKeywords: ['seller', 'ecommerce', 'pricing', 'shipping'],
    relatedCategorySlugs: ['ecommerce-seller-tools', 'logistics-shipping', 'finance'],
    faqs: [
      {
        question: 'Which seller tool should I use first?',
        answer: 'Start with the marketplace fee or profit tool for the platform you sell on, then use pricing, GST invoice, inventory, and ROI tools to plan the next operational step.',
      },
      {
        question: 'Are seller tool results final business advice?',
        answer: 'No. They are planning estimates based on your inputs. Verify current marketplace fees, taxes, ad costs, shipping charges, and return rates before making business decisions.',
      },
      {
        question: 'How do seller tools connect with logistics tools?',
        answer: 'Seller profitability often depends on shipping cost and parcel weight. Use logistics tools with seller calculators when shipping, packaging, or courier charges affect margins.',
      },
    ],
  },
  'logistics-shipping': {
    intro:
      'Logistics and shipping tools help estimate courier charges, volumetric weight, CBM, delivery timelines, chargeable weight, parcel dimensions, and packaging costs. This hub focuses on shipment planning and cost clarity.',
    highlights: ['Courier and freight cost estimates', 'Volumetric and chargeable weight checks', 'Parcel dimensions and packaging planning'],
    blogKeywords: ['shipping', 'freight', 'volumetric', 'courier', 'cbm'],
    workflowKeywords: ['shipping', 'logistics', 'parcel', 'freight'],
    relatedCategorySlugs: ['ecommerce-seller-tools', 'finance', 'math-tools'],
  },
  'creator-tools': {
    intro:
      'Creator tools help plan content, estimate social media performance, prepare thumbnails, schedule uploads, and calculate creator-focused metrics. This hub connects creative workflows with practical measurement tools.',
    highlights: ['Social media and creator calculators', 'Thumbnail and image preparation', 'Content scheduling support'],
    blogKeywords: ['creator', 'youtube', 'instagram', 'thumbnail', 'social'],
    workflowKeywords: ['creator', 'social', 'image', 'content'],
    relatedCategorySlugs: ['image-tools', 'seo-tools', 'text-tools'],
  },
  'relationship-tools': {
    intro:
      'Relationship tools provide light, entertainment-focused calculators for names, compatibility, zodiac checks, and playful comparisons. This hub is separated from serious calculators so users understand the intended context.',
    highlights: ['Compatibility and name-based fun tools', 'Zodiac and numerology checks', 'Entertainment-first results'],
    blogKeywords: ['relationship', 'compatibility', 'zodiac', 'numerology'],
    workflowKeywords: ['relationship', 'fun', 'calculator'],
    relatedCategorySlugs: ['daily-life', 'math-tools', 'text-tools'],
  },
}

export const getCategoryHub = (slug, category = {}) => {
  const name = category?.name || 'this category'
  const hub = hubs[slug] || {}

  return {
    intro: hub.intro || `${name} collects focused tools, guides, and workflows for related user tasks on QuickUtils.`,
    highlights: hub.highlights || ['Focused tools', 'Related guides', 'Practical workflows'],
    blogKeywords: hub.blogKeywords || [name.toLowerCase()],
    workflowKeywords: hub.workflowKeywords || [name.toLowerCase()],
    relatedCategorySlugs: hub.relatedCategorySlugs || [],
    faqs: hub.faqs || defaultFaq(name),
  }
}

const textFor = (item) => [
  item?.name,
  item?.title,
  item?.description,
  item?.excerpt,
  item?.seo_keywords,
  Array.isArray(item?.tags) ? item.tags.join(' ') : item?.tags,
  item?.category,
].filter(Boolean).join(' ').toLowerCase()

const scoreByKeywords = (item, keywords = []) => {
  const haystack = textFor(item)
  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword.toLowerCase()) ? 1 : 0), 0)
}

export const getCategoryRelatedBlogs = (posts = [], hub, limit = 6) => (
  posts
    .map((post) => ({ post, score: scoreByKeywords(post, hub.blogKeywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post)
)

export const getCategoryRelatedWorkflows = (workflows = [], hub, limit = 6) => (
  workflows
    .map((workflow) => ({ workflow, score: scoreByKeywords(workflow, hub.workflowKeywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ workflow }) => workflow)
)

export const getCategoryRelatedCategories = (categories = [], currentCategory, hub, limit = 4) => {
  const preferred = hub.relatedCategorySlugs
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter(Boolean)
    .filter((category) => category.id !== currentCategory?.id)

  if (preferred.length >= limit) return preferred.slice(0, limit)

  const currentWords = new Set((currentCategory?.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  const fallback = categories
    .filter((category) => category.id !== currentCategory?.id && !preferred.some((item) => item.id === category.id))
    .map((category) => ({
      category,
      score: (category.name || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => currentWords.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ category }) => category)

  return [...preferred, ...fallback].slice(0, limit)
}

