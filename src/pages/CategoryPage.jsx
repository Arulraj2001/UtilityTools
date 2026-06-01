import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { getCategories, getTools, getBlogPostsByCategorySlug, getFeaturedWorkflows, getJobs } from '@/api/supabaseApi'
import ToolCard from '../components/shared/ToolCard'
import CategorySEO from '@/components/seo/CategorySEO'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

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

  const { data: postsForCategory = [] } = useQuery({
    queryKey: ['blog-by-category', slug],
    queryFn: () => getBlogPostsByCategorySlug(slug, { published: true, orderBy: 'created_at', ascending: false, limit: 50 }),
    enabled: !!slug,
  })

  const { data: featuredWorkflows = [] } = useQuery({
    queryKey: ['workflows-featured'],
    queryFn: () => getFeaturedWorkflows({ limit: 6 }),
    staleTime: 10 * 60 * 1000,
  })

  const category = useMemo(() => categories.find(c => c.slug === slug), [categories, slug])
  const categoryTools = useMemo(() => tools.filter(t => t.category_id === category?.id), [tools, category])

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
  const featuredArticles = useMemo(() => {
    if (!postsForCategory) return []
    const list = postsForCategory.slice().filter(p => p)
    list.sort((a, b) => {
      if ((b.is_featured ? 1 : 0) !== (a.is_featured ? 1 : 0)) return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return list.slice(0, 6)
  }, [postsForCategory])

    const { data: jobsForCategory = [] } = useQuery({
      queryKey: ['jobs-by-category', category?.name],
      queryFn: () => getJobs({ published: true, category: category?.name, limit: 6 }),
      enabled: !!category,
      staleTime: 1000 * 60 * 5,
    })

  // Related categories: simple name-token overlap (excluding current)
  const relatedCategories = useMemo(() => {
    if (!category) return []
    const nameTokens = (category.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    return categories
      .filter(c => c.id !== category.id)
      .map(c => ({
        category: c,
        score: (c.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).reduce((s, t) => s + (nameTokens.includes(t) ? 1 : 0), 0)
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.category)
  }, [categories, category])

  if (categories.length > 0 && !category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-2xl font-bold mb-2">Category not found</p>
        <p className="text-muted-foreground mb-6">This category doesn't exist.</p>
        <Link to="/categories" className="text-primary hover:underline">Browse all categories</Link>
      </div>
    )
  }

  if (!category) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {category && <CategorySEO category={category} />}
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
              <h2>About {category.name}</h2>
              <p>{category.description || `Explore ${category.name} tools and workflows to accelerate your work.`}</p>

              <h3>Creator workflows</h3>
              <p>Common workflows for {category.name} include optimizing assets, batch processing, and preparing images for social media or web.</p>

              <h3>SEO & best practices</h3>
              <ul>
                <li>Optimize images for fast loading and correct aspect ratios.</li>
                <li>Use descriptive filenames and alt text for accessibility and SEO.</li>
                <li>Compress assets while preserving visual quality.</li>
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
        {featuredWorkflows.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-accent rounded-full"></div>
              <h2 className="text-xl font-semibold">Popular Workflows</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredWorkflows.slice(0, 3).map(workflow => (
                <Link key={workflow.id} to={`/workflow/${encodeURIComponent(workflow.slug)}`} className="group block rounded-xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all premium-card panel-highlight p-4">
                  <p className="text-sm font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">{workflow.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{workflow.excerpt || 'Step-by-step workflow guide'}</p>
                </Link>
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
