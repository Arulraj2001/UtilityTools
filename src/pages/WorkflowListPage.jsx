import React, { useState, useMemo, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, ChevronRight, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getWorkflowPages, getCategories } from '@/api/supabaseApi'
import { trackWorkflowSearch } from '@/lib/analytics'
import AdBanner from '../components/shared/AdBanner'
import { Link, useSearchParams } from 'react-router-dom'
import { SITE_URL } from '@/components/seo/StaticPageSEO'
import { ORGANIZATION_NAME, SITE_NAME } from '@/config/site'
import { robotsForSearchParams } from '@/lib/indexation'
import { buildFaqSchema } from '@/lib/pageSchemas'

const workflowFaqs = [
  {
    question: 'What is a QuickUtils workflow?',
    answer: 'A workflow is a step-by-step guide that connects tools, checks, and related resources for a specific task such as compressing a PDF, preparing an exam image, or formatting structured data.',
  },
  {
    question: 'How are workflows different from tool pages?',
    answer: 'Tool pages provide the utility itself, while workflows explain the order of steps and related tools needed to complete a broader task reliably.',
  },
  {
    question: 'When should I use a workflow instead of searching tools?',
    answer: 'Use a workflow when the task has multiple steps, file requirements, or decisions that need context before opening a single tool.',
  },
]

export default function WorkflowListPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('featured')

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows-published'],
    queryFn: () => getWorkflowPages({ published: true, orderBy: 'updated_at', ascending: false, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
  })

  const filtered = useMemo(() => {
    let result = [...workflows]

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(w =>
        w.title?.toLowerCase().includes(q) ||
        w.excerpt?.toLowerCase().includes(q) ||
        w.content?.toLowerCase().includes(q) ||
        w.category?.toLowerCase().includes(q)
      )
    }

    // Filter by category
    if (categoryFilter) {
      result = result.filter(w => w.category?.toLowerCase() === categoryFilter.toLowerCase())
    }

    // Sort
    if (sortBy === 'featured') {
      result.sort((a, b) => {
        if ((b.is_featured ? 1 : 0) !== (a.is_featured ? 1 : 0)) {
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }

    return result
  }, [workflows, search, categoryFilter, sortBy])

  const featuredWorkflows = useMemo(() => {
    return filtered.filter(w => w.is_featured).slice(0, 3)
  }, [filtered])

  const otherWorkflows = useMemo(() => {
    return filtered.filter(w => !w.is_featured)
  }, [filtered])

  const workflowCategories = useMemo(() => {
    const categoryCount = workflows.reduce((acc, workflow) => {
      const category = workflow.category?.trim()
      if (!category) return acc
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    return categories
      .filter((category) => categoryCount[category.name])
      .map((category) => ({
        ...category,
        count: categoryCount[category.name],
      }))
      .slice(0, 8)
  }, [workflows, categories])

  const estimateReadingTime = (content) => {
    if (!content) return 3
    const words = content.split(/\s+/).length
    return Math.max(1, Math.ceil(words / 225))
  }

  useEffect(() => {
    if (!search.trim()) return
    const timer = setTimeout(() => {
      trackWorkflowSearch({
        query: search.trim(),
        resultCount: filtered.length,
        source: 'workflows_list',
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [search, filtered.length])

  const seoTitle = 'Workflow Solutions for PDFs, Images, and Online Tools | QuickUtils'
  const seoDescription = 'Discover guided workflow solutions for PDFs, images, exam forms, and online utilities. Step-by-step guides for common tasks.'
  const canonicalUrl = `${SITE_URL}/workflow`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Workflows',
        item: canonicalUrl,
      },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Workflow Solutions',
    description: seoDescription,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      alternateName: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: filtered.map((w, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: w.title,
        description: w.excerpt,
        url: `${SITE_URL}/workflow/${encodeURIComponent(w.slug)}`,
      })),
    },
  }

  const faqSchema = buildFaqSchema(workflowFaqs)

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="robots" content={robotsForSearchParams(searchParams)} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(collectionSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8 flex-wrap">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Workflows</span>
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">Workflow Solutions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Find guided workflows for PDFs, images, exam forms, SEO tools, and online utilities. Step-by-step solutions to help you work smarter.
          </p>
        </motion.div>

        {/* Search & Sort */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr] mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 h-11 rounded-xl border border-border bg-card text-sm hover:border-primary/50 transition-colors"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 h-11 rounded-xl border border-border bg-card text-sm hover:border-primary/50 transition-colors"
            >
              <option value="featured">Featured First</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </motion.div>

        {/* Featured Section */}
        {featuredWorkflows.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-semibold">Featured Workflows</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredWorkflows.map((workflow, i) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Link
                    to={`/workflow/${encodeURIComponent(workflow.slug)}`}
                    className="group block h-full"
                  >
                    <div className="h-full p-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/60 hover:shadow-lg transition-all duration-300 premium-card panel-highlight flex flex-col">
                      <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Featured
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {workflow.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                        {workflow.excerpt || workflow.content?.substring(0, 120)}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-primary/20">
                        <span className="text-xs text-muted-foreground">
                          {estimateReadingTime(workflow.content)} min read
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(9)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-sm text-muted-foreground">
                {filtered.length} workflow{filtered.length !== 1 ? 's' : ''} found
                {categoryFilter && ` • ${categoryFilter}`}
              </p>
              {(search || categoryFilter) && (
                <button
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('')
                  }}
                  className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Workflow Grid */}
            {otherWorkflows.length > 0 || !search ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {otherWorkflows.map((workflow, i) => (
                  <React.Fragment key={workflow.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (i % 9) * 0.03 }}
                    >
                      <Link
                        to={`/workflow/${encodeURIComponent(workflow.slug)}`}
                        className="group block h-full"
                      >
                        <div className="h-full p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 premium-card panel-highlight flex flex-col">
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {workflow.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
                            {workflow.excerpt || workflow.content?.substring(0, 100)}
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">
                              {estimateReadingTime(workflow.content)} min
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                    {(i + 1) % 9 === 0 && i + 1 < otherWorkflows.length && (
                      <div key={`ad-${i}`} className="col-span-full">
                        <AdBanner placement="in_content" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="mb-2">No workflows found for "{search}"</p>
                <button
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('')
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  View all workflows
                </button>
              </div>
            )}
          </>
        )}

        {workflowCategories.length > 0 && (
          <section className="mt-12 rounded-3xl border border-border/70 bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Related categories</h2>
                <p className="text-sm text-muted-foreground">Browse workflow collections by category</p>
              </div>
              {categoryFilter && (
                <button
                  onClick={() => setCategoryFilter('')}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {workflowCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${encodeURIComponent(category.slug)}`}
                  className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary/70 hover:text-primary transition"
                  onClick={() => setCategoryFilter(category.name)}
                >
                  {category.name} ({category.count})
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-3xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold">How workflow pages help</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-muted-foreground leading-relaxed">
            {workflowFaqs.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/tools" className="text-primary hover:underline">Browse all tools</Link>
            <Link to="/methodology" className="text-primary hover:underline">How tools are tested</Link>
            <Link to="/contact" className="text-primary hover:underline">Suggest a workflow</Link>
          </div>
        </section>
      </div>
    </>
  )
}
