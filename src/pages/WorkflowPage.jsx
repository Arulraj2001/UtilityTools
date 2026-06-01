import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Sparkles, BookOpen, Globe } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getWorkflowPageBySlug, getTools, getBlogPosts, getWorkflowPages } from '@/api/supabaseApi'
import WorkflowSEO from '@/components/seo/WorkflowSEO'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

const getTextFromHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const buildQuickGuide = (page) => {
  const rawText = getTextFromHtml(page.content || page.excerpt || '')
  const sentences = rawText.split(/[.?!]\s+/).filter(Boolean)
  const steps = sentences.slice(0, 3).map((sentence, index) => ({
    title: `Step ${index + 1}`,
    description: sentence.endsWith('.') ? sentence : `${sentence}.`,
  }))

  if (steps.length >= 3) return steps

  const fallback = [
    { title: 'Open the workflow', description: `Begin with the ${page.title} landing page and follow the guidance for an intent-driven solution.` },
    { title: 'Choose the right tool', description: 'Select the recommended tool or action that matches your task and goal.' },
    { title: 'Complete the step', description: 'Follow the instructions, verify the result, and download or save the output.' },
  ]

  return [...steps, ...fallback].slice(0, 3)
}

export default function WorkflowPage() {
  const { slug } = useParams()

  const { data: page, isLoading: isLoadingPage, isError: isPageError } = useQuery({
    queryKey: ['workflow-page', slug],
    queryFn: () => getWorkflowPageBySlug(slug),
    enabled: !!slug,
    retry: false,
  })

  const { data: tools = [] } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: blogs = [] } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
  })

  const { data: workflowPages = [] } = useQuery({
    queryKey: ['workflow-pages-public'],
    queryFn: () => getWorkflowPages({ published: true, orderBy: 'updated_at', ascending: false, limit: 200 }),
  })

  const quickSteps = useMemo(() => {
    if (!page) return []
    return buildQuickGuide(page)
  }, [page])

  const relatedTools = useMemo(() => {
    if (!page || !tools.length) return []
    const selected = Array.isArray(page.related_tools) ? page.related_tools : []
    const matched = tools.filter((tool) => selected.includes(tool.id))
    if (matched.length) return matched

    const tags = (page.tags || []).map((tag) => tag.toLowerCase())
    return tools
      .map((tool) => {
        const toolTags = (tool.seo_keywords || '').toLowerCase().split(/[\s,]+/).filter(Boolean)
        const score = toolTags.filter((tag) => tags.includes(tag)).length
        return { tool, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ tool }) => tool)
  }, [page, tools])

  const relatedBlogs = useMemo(() => {
    if (!page || !blogs.length) return []
    const selected = Array.isArray(page.related_blogs) ? page.related_blogs : []
    const matched = blogs.filter((blog) => selected.includes(blog.id))
    if (matched.length) return matched.slice(0, 3)

    const tags = (page.tags || []).map((tag) => tag.toLowerCase())
    return blogs
      .map((blog) => {
        const blogTags = (blog.seo_keywords || '').toLowerCase().split(/[\s,]+/).filter(Boolean)
        const score = blogTags.filter((tag) => tags.includes(tag)).length
        return { blog, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ blog }) => blog)
  }, [page, blogs])

  const relatedWorkflows = useMemo(() => {
    if (!page || !workflowPages.length) return []
    const currentTags = (page.tags || []).map((tag) => tag.toLowerCase())
    return workflowPages
      .filter((other) => other.id !== page.id)
      .map((other) => {
        const tags = (other.tags || []).map((tag) => tag.toLowerCase())
        const score = currentTags.filter((tag) => tags.includes(tag)).length + (other.category === page.category ? 1 : 0)
        return { workflow: other, score }
      })
      .sort((a, b) => b.score - a.score)
      .filter(({ score }) => score > 0)
      .slice(0, 3)
      .map(({ workflow }) => workflow)
  }, [page, workflowPages])

  const primaryTool = relatedTools[0]

  if (isLoadingPage) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading workflow page...</p>
      </div>
    )
  }

  if (!page || isPageError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="rounded-3xl border border-border/70 bg-muted p-8">
          <p className="text-2xl font-bold">Workflow not found</p>
          <p className="mt-3 text-muted-foreground">The workflow page you requested is unavailable or has been removed.</p>
          <div className="mt-6">
            <Link to="/">
              <Button className="rounded-xl">Return home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20 min-h-screen">
      <WorkflowSEO page={page} steps={quickSteps} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-muted-foreground">Workflows</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate">{page.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-border/70 bg-card/70 p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {page.is_featured && <Badge variant="secondary">Featured</Badge>}
                {page.category && <Badge variant="outline">{page.category}</Badge>}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{page.excerpt}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button asChild>
                  <Link to={primaryTool ? `/tool/${primaryTool.slug}` : '/tools'} className="rounded-xl">
                    Use Related Tool
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/blog" className="rounded-xl">View Blog Resources</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Quick guide</span>
                  <h2 className="mt-3 text-2xl font-semibold">Complete the workflow in three steps</h2>
                </div>
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {quickSteps.map((step, index) => (
                  <div key={index} className="rounded-3xl border border-border/70 bg-muted p-5">
                    <p className="text-sm font-semibold text-primary">{step.title}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {primaryTool && (
              <div className="rounded-3xl border border-border/70 bg-card/70 p-8">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <Badge variant="secondary">Recommended tool</Badge>
                </div>
                <h2 className="text-2xl font-semibold">{primaryTool.name}</h2>
                <p className="mt-3 text-muted-foreground">{primaryTool.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={`/tool/${primaryTool.slug}`} className="rounded-xl">Open tool</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/tools" className="rounded-xl">Browse tools</Link>
                  </Button>
                </div>
              </div>
            )}

            <article className="rounded-3xl border border-border/70 bg-white p-8 prose prose-slate max-w-none">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
            </article>

            {page.faq_items?.length > 0 && (
              <div className="rounded-3xl border border-border/70 bg-background p-8">
                <h2 className="text-2xl font-semibold mb-4">Frequently asked questions</h2>
                <div className="space-y-4">
                  {page.faq_items.map((faq, index) => (
                    <div key={index} className="rounded-3xl border border-border/70 bg-card p-5">
                      <p className="font-semibold">{faq.question}</p>
                      <p className="mt-2 text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-border/70 bg-muted p-8">
              <h2 className="text-2xl font-semibold">Still need help?</h2>
              <p className="mt-3 text-muted-foreground">Explore related workflows, tools, and blog content to solve the problem faster with proven steps and internal linking.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/tools" className="rounded-xl">Browse tools</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/blog" className="rounded-xl">Read related articles</Link>
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border/70 bg-card/70 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Stats</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Published</span>
                  <span>{page.status === 'published' ? 'Yes' : 'Draft'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Views</span>
                  <span>{page.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Updated</span>
                  <span>{format(new Date(page.updated_at || page.created_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            {relatedWorkflows.length > 0 && (
              <div className="rounded-3xl border border-border/70 bg-background p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Related workflows</p>
                    <h3 className="text-lg font-semibold">More intent pages</h3>
                  </div>
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-3">
                  {relatedWorkflows.map((workflow) => (
                    <Link key={workflow.id} to={`/workflow/${workflow.slug}`} className="block rounded-3xl border border-border/70 bg-card p-4 hover:border-primary hover:bg-white transition">
                      <p className="font-medium">{workflow.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{workflow.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {relatedBlogs.length > 0 && (
              <div className="rounded-3xl border border-border/70 bg-background p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Related reading</p>
                    <h3 className="text-lg font-semibold">Helpful blog posts</h3>
                  </div>
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-3">
                  {relatedBlogs.map((blog) => (
                    <Link key={blog.id} to={`/blog/${blog.slug}`} className="block rounded-3xl border border-border/70 bg-card p-4 hover:border-primary hover:bg-white transition">
                      <p className="font-medium">{blog.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{blog.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
