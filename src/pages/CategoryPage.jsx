import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { getCategories, getTools, getBlogPosts, getWorkflowPages, getJobs } from '@/api/supabaseApi'
import ToolCard from '../components/shared/ToolCard'
import CategorySEO from '@/components/seo/CategorySEO'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import PageNotFound from '@/lib/PageNotFound'
import { mergeBlogPosts } from '@/lib/staticBlogPosts'
import {
  getCategoryHub,
  getCategoryRelatedBlogs,
  getCategoryRelatedCategories,
  getCategoryRelatedWorkflows,
} from '@/lib/categoryHubContent'

export default function CategoryPage() {
  const { slug } = useParams()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: tools = [] } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: remotePosts = [] } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
    retry: false,
  })

  const { data: workflowPages = [] } = useQuery({
    queryKey: ['workflow-pages-public'],
    queryFn: () => getWorkflowPages({ published: true, orderBy: 'updated_at', ascending: false, limit: 100 }),
    staleTime: 10 * 60 * 1000,
  })

  const category = useMemo(() => categories.find(c => c.slug === slug), [categories, slug])
  const categoryTools = useMemo(() => tools.filter(t => t.category_id === category?.id), [tools, category])
  const categoryHub = useMemo(() => getCategoryHub(slug, category), [slug, category])
  const posts = useMemo(() => mergeBlogPosts(remotePosts), [remotePosts])

  // Featured tools: prefer manual featured flag, then usage_count, then sort_order
  const featuredTools = useMemo(() => {
    const list = categoryTools.slice()
    list.sort((a, b) => {
      // featured first
      if ((b.is_featured ? 1 : 0) !== (a.is_featured ? 1 : 0)) return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
      // usage_count desc
      const au = a.usage_count || 0
      const bu = b.usage_count || 0
      if (bu !== au) return bu - au
      // sort_order asc
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
    return list.slice(0, 6)
  }, [categoryTools])

  // Featured articles: prefer is_featured then recency
  const featuredArticles = useMemo(
    () => getCategoryRelatedBlogs(posts, categoryHub, 6),
    [posts, categoryHub]
  )

  const relatedWorkflows = useMemo(
    () => getCategoryRelatedWorkflows(workflowPages, categoryHub, 6),
    [workflowPages, categoryHub]
  )

    const { data: jobsForCategory = [] } = useQuery({
      queryKey: ['jobs-by-category', category?.name],
      queryFn: () => getJobs({ published: true, category: category?.name, limit: 6 }),
      enabled: !!category,
      staleTime: 1000 * 60 * 5,
    })

  const relatedCategories = useMemo(() => {
    if (!category) return []
    return getCategoryRelatedCategories(categories, category, categoryHub, 4)
  }, [categories, category, categoryHub])

  if (categories.length > 0 && !category) return (
    <PageNotFound
      title="Category not found"
      message="The category you requested does not exist or is not available."
      primaryHref="/categories"
      primaryLabel="Browse all categories"
    />
  )

  if (!category) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {category && (
        <CategorySEO
          category={category}
          tools={categoryTools}
          faqs={categoryHub.faqs}
          relatedBlogs={featuredArticles}
          relatedWorkflows={relatedWorkflows}
        />
      )}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/categories" className="hover:text-foreground transition-colors">Categories</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          <p className="text-muted-foreground mb-4">{category.description || `Browse all ${category.name} tools`}</p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{(category.tool_count || categoryTools.length)} tools</span>
            <span>{featuredTools.length} featured tools</span>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-border/70 bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">About {category.name}</h2>
          <p className="text-muted-foreground leading-relaxed max-w-4xl">{categoryHub.intro}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {categoryHub.highlights.map((item) => (
              <div key={item} className="rounded-xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link to="/blog" className="text-primary hover:underline">Related guides</Link>
            <Link to="/workflow" className="text-primary hover:underline">Workflows</Link>
          </div>
        </section>

        {/* Featured Tools */}
        {featuredTools.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-semibold">Featured tools</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredTools.map(t => (
                  <Link key={t.id} to={`/tool/${encodeURIComponent(t.slug)}`} className="group block rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all premium-card panel-highlight glow-border">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      {t.featured_image ? (
                        <img src={t.featured_image} alt={t.name} loading="lazy" className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="text-xl">{t.icon || '🔧'}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary">{t.name}</h3>
                        <span className="text-xs text-muted-foreground">{category.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SEO Content */}
        <section className="mb-8">
          {category.seo_content ? (
            <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.seo_content) }} />
          ) : (
            <div className="prose max-w-none dark:prose-invert">
              <h2>How to use {category.name}</h2>
              <p>{categoryHub.intro}</p>

              <h3>Recommended approach</h3>
              <ul>
                {categoryHub.highlights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-semibold">Featured articles</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredArticles.map(a => (
                <Link key={a.id} to={`/blog/${encodeURIComponent(a.slug)}`} className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all premium-card panel-highlight glow-border">
                  <div className="flex gap-3 p-3">
                    {a.featured_image && (
                      <img src={a.featured_image} alt={a.title} loading="lazy" className="w-24 h-20 object-cover rounded-md flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1 group-hover:text-primary line-clamp-2">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
                      <div className="text-xs text-muted-foreground mt-2">{a.reading_time || 3} min read</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Jobs for this category */}
        {jobsForCategory.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-semibold">Jobs in {category.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobsForCategory.map(j => (
                <Link key={j.id} to={`/jobs/${encodeURIComponent(j.slug)}`} className="group block rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all">
                  <h3 className="font-semibold">{j.title}</h3>
                  <p className="text-sm text-muted-foreground">{j.organization} • {j.location}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Existing tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryTools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} categoryName={category.name} />
          ))}
        </div>

        {categoryTools.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No tools in this category yet.</div>
        )}

        {/* Featured Workflows */}
        {relatedWorkflows.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-accent rounded-full"></div>
              <h2 className="text-xl font-semibold">Popular Workflows</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedWorkflows.slice(0, 6).map(workflow => (
                <Link key={workflow.id} to={`/workflow/${encodeURIComponent(workflow.slug)}`} className="group block rounded-xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all premium-card panel-highlight p-4">
                  <p className="text-sm font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">{workflow.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{workflow.excerpt || 'Step-by-step workflow guide'}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {categoryHub.faqs.length > 0 && (
          <section className="mt-10 rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-xl font-semibold mb-5">{category.name} FAQs</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {categoryHub.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-medium mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related categories */}
        {relatedCategories.length > 0 && (
          <section className="mt-10">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Related categories</h3>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map(rc => (
                <Link key={rc.id} to={`/category/${encodeURIComponent(rc.slug)}`} className="text-sm px-3 py-1 rounded-full bg-secondary hover:bg-primary/10">{rc.name}</Link>
              ))}
            </div>
          </section>
        )}
      </motion.div>
    </div>
  )
}
