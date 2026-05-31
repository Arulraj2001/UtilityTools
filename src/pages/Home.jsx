import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTools, getCategories, getTotalUsageCount, getFeaturedWorkflows, getCategoryCounts, getFeaturedJobs } from '@/api/supabaseApi'
import HeroSection from '../components/home/HeroSection'
import StatsBar from '../components/home/StatsBar'
const CategoriesGrid = lazy(() => import('../components/home/CategoriesGrid'))
const FeaturedTools = lazy(() => import('../components/home/FeaturedTools'))
const PopularWorkflows = lazy(() => import('../components/home/PopularWorkflows'))
import AdBanner from '../components/shared/AdBanner'
import StaticPageSEO, { SITE_URL } from '@/components/seo/StaticPageSEO'

const homepageDescription =
  'QuickUtils is a free online tools website for everyday PDF, image, calculator, text, developer, SEO, student, and business tasks.'

const categoryHighlights = [
  {
    title: 'PDF tools',
    description: 'Compress, merge, split, convert, and prepare PDF files for sharing, forms, and uploads.',
    to: '/category/pdf-tools',
  },
  {
    title: 'Image tools',
    description: 'Resize, compress, crop, convert, watermark, and inspect images from your browser.',
    to: '/category/image-tools',
  },
  {
    title: 'Calculators',
    description: 'Use finance, health, study, date, math, shipping, and everyday calculators for quick estimates.',
    to: '/tools?q=calculator',
  },
  {
    title: 'Government exam tools',
    description: 'Prepare photos, signatures, documents, and PDFs for common exam and application requirements.',
    to: '/category/government-exam-tools',
  },
  {
    title: 'Developer and SEO tools',
    description: 'Format JSON, encode URLs, generate meta tags, create sitemaps, and handle common web tasks.',
    to: '/category/developer-tools',
  },
  {
    title: 'Seller and logistics tools',
    description: 'Estimate fees, shipping costs, product pricing, parcel dimensions, and business margins.',
    to: '/category/ecommerce-seller-tools',
  },
]

const popularToolLinks = [
  {
    name: 'Compress PDF',
    description: 'Reduce PDF file size for forms, email, and document uploads.',
    to: '/tool/compress-pdf',
  },
  {
    name: 'Image Compressor',
    description: 'Make image files smaller while keeping them useful for web and upload needs.',
    to: '/tool/image-compressor',
  },
  {
    name: 'Photo KB Reducer',
    description: 'Adjust photo file size for exam portals and application forms.',
    to: '/tool/photo-kb-reducer',
  },
  {
    name: 'EMI Calculator',
    description: 'Estimate monthly loan payments from principal, interest rate, and tenure.',
    to: '/tool/emi-calculator',
  },
  {
    name: 'JSON Formatter',
    description: 'Format and read JSON data more easily while debugging or reviewing API responses.',
    to: '/tool/json-formatter',
  },
  {
    name: 'Volumetric Weight Calculator',
    description: 'Estimate chargeable shipment weight from parcel dimensions and carrier divisor.',
    to: '/tool/volumetric-weight-calculator',
  },
]

const whyUseQuickUtils = [
  'Tools are organized by practical task, so you can find the right utility without digging through unrelated pages.',
  'Many file-based tools are designed to run in the browser when supported, which can reduce unnecessary uploads.',
  'Tool pages and workflows are written for real use cases such as exam forms, document cleanup, selling online, and everyday calculations.',
  'The site avoids sign-up walls for common utility tasks and keeps the interface focused on getting the job done.',
]

const howItWorks = [
  {
    title: 'Choose a tool',
    text: 'Start from a category, search bar, popular tool link, or workflow page.',
  },
  {
    title: 'Enter details or add a file',
    text: 'Use the fields shown on the tool page. For file tools, check the visible instructions before processing anything sensitive.',
  },
  {
    title: 'Review the result',
    text: 'Download, copy, or compare the output where the tool provides those actions.',
  },
  {
    title: 'Verify important work',
    text: 'For forms, finances, health, or official documents, review the final result before submitting or relying on it.',
  },
]

const homepageFaq = [
  {
    question: 'What is QuickUtils?',
    answer:
      'QuickUtils is a free online tools website for common file, image, PDF, calculator, text, SEO, developer, exam, and business tasks.',
  },
  {
    question: 'Who is QuickUtils for?',
    answer:
      'It is built for students, job applicants, creators, developers, freelancers, sellers, office workers, and anyone who needs a quick utility without installing a separate app.',
  },
  {
    question: 'Are QuickUtils tools free to use?',
    answer:
      'The public tools are designed to be free for everyday use. Some future features may change, but core utility access should remain simple and easy to reach.',
  },
  {
    question: 'Do files stay private?',
    answer:
      'Many tools process files in your browser when supported. Some features may need temporary server-side or third-party handling, so avoid uploading highly sensitive files unless you are comfortable with the tool flow.',
  },
  {
    question: 'Can I report a mistake or request a tool?',
    answer:
      'Yes. Use the Contact page to report errors, broken tools, unclear instructions, or ideas for new utilities.',
  },
]

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'QuickUtils',
  url: SITE_URL,
  description: homepageDescription,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/tools?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'QuickUtils',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: homepageDescription,
}

function HomeIntroSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-start">
        <div>
          <p className="text-sm font-semibold text-primary mb-3">What QuickUtils does</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Useful browser tools for everyday digital work
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils brings common utility tools into one place: PDF helpers, image tools,
              calculators, text utilities, SEO tools, developer helpers, exam document tools,
              seller calculators, and shipping estimators.
            </p>
            <p>
              The goal is simple. Pick a task, use the tool, check the result, and move on with
              your work. Pages are written to explain what each tool does, when it is useful,
              and what you should verify before using the output for something important.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/80 p-6">
          <h2 className="text-xl font-semibold mb-4">Who it helps</h2>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li>Students preparing assignments, marks, PDFs, images, and study calculations.</li>
            <li>Job and exam applicants resizing photos, signatures, and documents for uploads.</li>
            <li>Creators and small teams compressing images, checking metadata, and preparing content.</li>
            <li>Developers and SEO users formatting data, testing web snippets, and generating tags.</li>
            <li>Sellers and operations teams estimating pricing, shipping, fees, and parcel dimensions.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function CategoryHighlightsSection() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-8">
          <p className="text-sm font-semibold text-primary mb-3">Main tool categories</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Find tools by the kind of task you need to finish
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            These category links point to the most important parts of QuickUtils and help users
            move from the homepage to a useful tool quickly.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryHighlights.map((category) => (
            <Link
              key={category.to}
              to={category.to}
              className="block rounded-lg border border-border/60 bg-background p-5 transition-colors hover:border-primary/40"
            >
              <h3 className="font-semibold mb-2">{category.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function PopularToolsFoundationSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-primary mb-3">Popular tools</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Start with common QuickUtils tasks
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              These links cover frequent tasks across files, images, calculators, development,
              and logistics.
            </p>
          </div>
          <Link to="/tools" className="text-sm font-medium text-primary hover:text-primary/80">
            View all tools
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularToolLinks.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="block rounded-lg border border-border/60 bg-card/80 p-5 transition-colors hover:border-primary/40"
            >
              <h3 className="font-semibold mb-2">{tool.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyQuickUtilsSection() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-12 items-start">
        <div>
          <p className="text-sm font-semibold text-primary mb-3">Why use QuickUtils?</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Built for clear, practical utility work
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils focuses on everyday tasks where speed, clarity, and simple instructions
            matter more than complicated software.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {whyUseQuickUtils.map((item, index) => (
            <div key={index} className="rounded-lg border border-border/60 bg-background p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PrivacyFocusSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <p className="text-sm font-semibold text-primary mb-3">Privacy-focused by design</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Use file tools with a careful privacy mindset
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed max-w-4xl">
            <p>
              Many QuickUtils tools are built to process files inside your browser when the
              browser can support the task. That can help reduce unnecessary uploads and keep
              simple work fast.
            </p>
            <p>
              Some features may still need temporary server-side or third-party processing
              depending on the tool. For sensitive documents, private IDs, financial records,
              medical files, or confidential business data, review the tool behavior first and
              avoid uploading anything you are not comfortable processing online.
            </p>
          </div>
          <div className="mt-5">
            <Link to="/privacy" className="text-sm font-medium text-primary hover:text-primary/80">
              Read the Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-8">
          <p className="text-sm font-semibold text-primary mb-3">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            A simple flow for most tools
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Different tools have different inputs, but the basic pattern is easy to follow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-border/60 bg-background p-5">
              <div className="text-sm font-semibold text-primary mb-3">Step {index + 1}</div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HelpfulGuidesSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-primary mb-3">Helpful guides</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Learn the basics before using a tool
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              Short practical articles explain common calculator, image, PDF, writing, and
              developer tasks with examples and mistakes to avoid.
            </p>
          </div>
          <Link to="/blog" className="text-sm font-medium text-primary hover:text-primary/80">
            View all guides
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_STATIC_BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-lg border border-border/60 bg-card/80 p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-xs font-medium text-primary mb-2">{post.blog_categories?.name}</p>
              <h3 className="font-semibold mb-2 leading-snug">{post.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomeFAQSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-primary mb-3">FAQ</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Common questions about QuickUtils
          </h2>
        </div>
        <div className="space-y-4">
          {homepageFaq.map((item) => (
            <div key={item.question} className="rounded-lg border border-border/60 bg-card/80 p-5">
              <h3 className="font-semibold mb-2">{item.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeaderSkeleton({ titleWidth = 'w-48', subtitleWidth = 'w-64' }) {
  return (
    <div className="text-center mb-10">
      <div className={`mx-auto h-9 rounded-full bg-muted animate-pulse ${titleWidth}`} />
      <div className={`mx-auto mt-3 h-4 rounded-full bg-muted animate-pulse ${subtitleWidth}`} />
    </div>
  )
}

function CategoriesSectionSkeleton() {
  return (
    <section className="sm:py-20 rounded">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeaderSkeleton titleWidth="w-56 sm:w-64" subtitleWidth="w-72 sm:w-80" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-36 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}

function ToolsSectionSkeleton({ title = 'Loading', subtitle = 'Loading section…' }) {
  return (
    <section className="sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="h-9 w-56 rounded-full bg-muted animate-pulse mb-3" />
            <div className="h-4 w-72 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="hidden sm:block h-8 w-32 rounded-full bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>

        <div className="mt-6 sm:hidden text-center">
          <div className="h-9 w-32 mx-auto rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </section>
  )
}

function WorkflowsSectionSkeleton() {
  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <SectionHeaderSkeleton titleWidth="w-60 sm:w-72" subtitleWidth="w-80 sm:w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 rounded-3xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="mt-8 text-center">
        <div className="inline-flex h-12 w-44 rounded-full bg-muted animate-pulse" />
      </div>
    </section>
  )
}

export default function Home() {
  const [deferHomepageQueries, setDeferHomepageQueries] = useState(false)

  useEffect(() => {
    setDeferHomepageQueries(true)
  }, [])

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: categoryCounts = {},
    isLoading: isLoadingCategoryCounts,
  } = useQuery({
    queryKey: ['category-counts', categories.map(c => c.id)],
    enabled: categories.length > 0,
    queryFn: () => getCategoryCounts({ categoryIds: categories.map(c => c.id) }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: featuredTools = [],
    isLoading: isLoadingFeaturedTools,
    isFetching: isFetchingFeaturedTools,
    error: featuredToolsError,
  } = useQuery({
    queryKey: ['featured-tools'],
    queryFn: () => getTools({ published: true, filters: { is_featured: true }, orderBy: 'created_at desc', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: trendingTools = [],
    isLoading: isLoadingTrendingTools,
    isFetching: isFetchingTrendingTools,
    error: trendingToolsError,
  } = useQuery({
    queryKey: ['trending-tools'],
    queryFn: () => getTools({ published: true, filters: { is_trending: true }, orderBy: 'created_at desc', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: recentTools = [],
    isLoading: isLoadingRecentTools,
    isFetching: isFetchingRecentTools,
    error: recentToolsError,
  } = useQuery({
    queryKey: ['recent-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: totalUsage = 0,
    isLoading: isLoadingUsage,
    isFetching: isFetchingUsage,
  } = useQuery({
    queryKey: ['total-usage'],
    queryFn: getTotalUsageCount,
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: featuredWorkflows = [],
    isLoading: isLoadingWorkflows,
    isFetching: isFetchingWorkflows,
  } = useQuery({
    queryKey: ['workflows-featured'],
    queryFn: () => getFeaturedWorkflows({ limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: featuredJobs = [],
    isLoading: isLoadingFeaturedJobs
  } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: () => getFeaturedJobs({ limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const toolCount = useMemo(() => {
    const categoryTotal = categories.reduce((sum, category) => sum + (category.tool_count || categoryCounts[category.id] || 0), 0)
    return categoryTotal > 0 ? categoryTotal : 50
  }, [categories, categoryCounts])

  const hasError = categoriesError
  const showCategoriesSectionSkeleton = isLoadingCategories || isLoadingCategoryCounts
  const showFeaturedSectionSkeleton = !deferHomepageQueries || isLoadingFeaturedTools || isFetchingFeaturedTools || isLoadingRecentTools || isFetchingRecentTools
  const showTrendingSectionSkeleton = !deferHomepageQueries || isLoadingTrendingTools || isFetchingTrendingTools
  const showRecentSectionSkeleton = !deferHomepageQueries || isLoadingRecentTools || isFetchingRecentTools
  const showWorkflowsSectionSkeleton = !deferHomepageQueries || isLoadingWorkflows || isFetchingWorkflows

  if (hasError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4 text-center">
        <h2 className="text-2xl font-semibold mb-3">Unable to load homepage data</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          {categoriesError?.message || featuredToolsError?.message || trendingToolsError?.message || recentToolsError?.message || 'There was an issue loading site data. Please try refreshing the page.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <StaticPageSEO
        title="QuickUtils - Free Online Tools for PDFs, Images, Calculators and More"
        description={homepageDescription}
        path="/"
        ogTitle="QuickUtils - Free Online Utility Tools"
        ogDescription="Use practical online tools for PDFs, images, calculators, text, developer, SEO, student, seller, and shipping tasks."
        jsonLd={[websiteSchema, organizationSchema]}
      />
      <HeroSection toolCount={toolCount} />
      <StatsBar toolCount={toolCount} userCount={totalUsage} />
      <HomeIntroSection />
      <CategoryHighlightsSection />
      <PopularToolsFoundationSection />

      {showCategoriesSectionSkeleton ? (
        <CategoriesSectionSkeleton />
      ) : (
        <Suspense fallback={<CategoriesSectionSkeleton />}>
          <CategoriesGrid categories={categories} countByCategory={categoryCounts} />
        </Suspense>
      )}

      {showFeaturedSectionSkeleton ? (
        <ToolsSectionSkeleton title="Featured Tools" subtitle="Our most popular and highly rated tools" />
      ) : (
        featuredTools.length > 0 && (
          <Suspense fallback={<ToolsSectionSkeleton title="Featured Tools" subtitle="Our most popular and highly rated tools" />}>
            <FeaturedTools
              tools={featuredTools}
              categories={categories}
              title="Featured Tools"
              subtitle="Our most popular and highly rated tools"
            />
          </Suspense>
        )
      )}

      <AdBanner placement="in_content" pageType="home" className="py-6" />
      <WhyQuickUtilsSection />
      <PrivacyFocusSection />
      <HowItWorksSection />
      <HelpfulGuidesSection />

      {showWorkflowsSectionSkeleton ? (
        <WorkflowsSectionSkeleton />
      ) : (
        featuredWorkflows.length > 0 && (
          <Suspense fallback={<WorkflowsSectionSkeleton />}>
            <PopularWorkflows workflows={featuredWorkflows} />
          </Suspense>
        )
      )}

      {/* Featured Jobs (deferred) */}
      {deferHomepageQueries && featuredJobs && featuredJobs.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-semibold mb-4">Latest Government Jobs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map((j) => (
                <div key={j.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition">
                  <a href={`/jobs/${encodeURIComponent(j.slug)}`} className="no-underline">
                    <h3 className="font-semibold">{j.title}</h3>
                    <p className="text-sm text-muted-foreground">{j.organization} • {j.location}</p>
                    <p className="text-sm mt-2 line-clamp-2">{j.short_description}</p>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showTrendingSectionSkeleton ? (
        <ToolsSectionSkeleton title="Trending Now" subtitle="Tools gaining popularity this week" />
      ) : (
        trendingTools.length > 0 && (
          <Suspense fallback={<ToolsSectionSkeleton title="Trending Now" subtitle="Tools gaining popularity this week" />}>
            <FeaturedTools
              tools={trendingTools}
              categories={categories}
              title="Trending Now"
              subtitle="Tools gaining popularity this week"
            />
          </Suspense>
        )
      )}

      {showRecentSectionSkeleton ? (
        <ToolsSectionSkeleton title="Recently Added" subtitle="Fresh tools just added to the platform" />
      ) : (
        <Suspense fallback={<ToolsSectionSkeleton title="Recently Added" subtitle="Fresh tools just added to the platform" />}>
          <FeaturedTools
            tools={recentTools}
            categories={categories}
            title="Recently Added"
            subtitle="Fresh tools just added to the platform"
          />
        </Suspense>
      )}

      <HomeFAQSection />
    </div>
  )
}
