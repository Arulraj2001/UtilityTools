import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight, Home, Bookmark, BookmarkCheck, Share2, Clock, Zap } from 'lucide-react'
import { getIcon } from '@/lib/iconMap'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { runTool } from '@/lib/toolEngine'
import ToolInputForm from '@/components/tools/ToolInputForm'
import ToolResult from '@/components/tools/ToolResult'
import ImageTool from '@/components/tools/ImageTool'
import PDFTool from '@/components/tools/PDFTool'
import ImageToolRouter, { IMAGE_TOOL_SLUGS } from '@/components/image-tools/ImageToolRouter';
import GovToolRouter, { GOV_TOOL_SLUGS } from '@/components/gov-tools/GovToolRouter'
import FAQAccordion from '@/components/shared/FAQAccordion'
import ToolCard from '@/components/shared/ToolCard'
import AdBanner from '@/components/shared/AdBanner'
import ToolSEO from '@/components/seo/ToolSEO'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { getTools, getCategories, updateToolUsage, getBlogPosts } from '@/api/supabaseApi'
import ToolContentSections
from '@/components/seo/ToolContentSections'

const IMAGE_TOOLS = IMAGE_TOOL_SLUGS;
const PDF_TOOLS = ['merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'protect-pdf', 'remove-pages-pdf']
const GOV_TOOLS = GOV_TOOL_SLUGS

export default function ToolPage() {
  const { slug } = useParams()
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const skipAutoCalcRef = useRef(false)
  const [bookmarks, setBookmarks] = useLocalStorage('bookmarked_tools', [])
  const [recentTools, setRecentTools] = useLocalStorage('recent_tools', [])

  const { data: tools = [], isLoading, isFetching } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
    // keep previous data to avoid clearing UI during background refetches
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    cacheTime: 10 * 60 * 1000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['blog-published', slug],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 50 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })

  const tool = useMemo(() => tools.find(t => t.slug === slug), [tools, slug])
  const category = useMemo(() => categories.find(c => c.id === tool?.category_id), [categories, tool])
  const relatedTools = useMemo(() => {
    if (!tool) return []
    return tools.filter(t => t.id !== tool.id && t.category_id === tool.category_id).slice(0, 4)
  }, [tools, tool])

  const relatedArticles = useMemo(() => {
    if (!tool || !posts || posts.length === 0) return []

    // scoring: category match (3), tag overlap (1 per tag), seo_keywords overlap (2 per keyword), slug/title match (2)
    const toolKeywords = (tool.seo_keywords || '').toLowerCase().split(/[,\s]+/).filter(Boolean)
    const toolNameParts = (tool.name || '').toLowerCase().split(/\s+/).filter(Boolean)

    const scored = posts.map(p => {
      let score = 0
      const pCategory = p.blog_categories?.id || p.category_id
      if (pCategory && tool.category_id && pCategory === tool.category_id) score += 3

      const pTags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase()) : []
      const tagOverlap = pTags.filter(t => toolNameParts.includes(t)).length
      score += tagOverlap

      const pKeywords = (p.seo_keywords || '').toLowerCase().split(/[,\s]+/).filter(Boolean)
      const kwOverlap = pKeywords.filter(k => toolKeywords.includes(k)).length
      score += kwOverlap * 2

      const slugMatch = p.slug && (p.slug.includes(tool.slug) || tool.slug.includes(p.slug))
      if (slugMatch) score += 2

      const titleOverlap = (p.title || '').toLowerCase().split(/\s+/).filter(Boolean).filter(w => toolNameParts.includes(w)).length
      score += titleOverlap

      return { post: p, score }
    })

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(s => s.post)
  }, [tool, posts])

  const isBookmarked = tool ? bookmarks.includes(tool.id) : false
  const isImageTool = tool ? IMAGE_TOOLS.includes(tool.slug) : false
  const isPDFTool = tool ? PDF_TOOLS.includes(tool.slug) : false
  const isGovTool = tool ? GOV_TOOLS.includes(tool.slug) : false

  // Scroll to top when navigating to a new tool
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  // Only reset inputs when the route `slug` actually changes to a new tool.
  const prevSlugRef = useRef(slug)
  useEffect(() => {
    if (!tool) return
    if (prevSlugRef.current === slug) return
    prevSlugRef.current = slug

    const fields = tool.input_fields || []
    const defaults = {}
    fields.forEach(f => {
      defaults[f.name] = f.default_value !== undefined ? f.default_value : ''
    })
    // only reset when navigating to a new tool
    skipAutoCalcRef.current = true
    setInputs(defaults)
    setResult(null)
  }, [slug, tool])

  useEffect(() => {
    if (!tool) return
    setRecentTools(prev => {
      const filtered = prev.filter(id => id !== tool.id)
      return [tool.id, ...filtered].slice(0, 10)
    })

    if (tool?.id) {
      updateToolUsage(tool.id, (tool.usage_count || 0) + 1).catch(() => {})
    }
  }, [tool?.id])

  const calculate = useCallback(async () => {
    if (!tool) return
    setLoading(true)
    try {
      const res = await runTool(tool, inputs)
      setResult(res)
    } catch (error) {
      console.error('Calculation error:', error)
      setResult({ error: error.message || 'Calculation failed' })
    } finally {
      setLoading(false)
    }
  }, [tool, inputs])

  useEffect(() => {
    if (!tool || isImageTool || isPDFTool) return

    if (skipAutoCalcRef.current) {
      skipAutoCalcRef.current = false
      return
    }

    const fields = tool.input_fields || []
    const hasTextarea = fields.some(f => f.type === 'textarea')
    const fieldCount = fields.length
    if (hasTextarea || fieldCount === 0) return

    const hasEmptyRequired = fields.some(f => f.required && !inputs[f.name])
    if (hasEmptyRequired) return

    const timer = setTimeout(calculate, 300)
    return () => clearTimeout(timer)
  }, [inputs, tool?.slug, isImageTool, isPDFTool, calculate])

  const reset = useCallback(() => {
    if (!tool) return
    console.log('Reset clicked for:', tool.slug)
    const fields = tool.input_fields || []
    const defaults = {}
    fields.forEach(f => {
      defaults[f.name] = f.default_value !== undefined ? f.default_value : ''
    })
    console.log('Setting inputs to:', defaults)
    skipAutoCalcRef.current = true
    setInputs(defaults)
    setResult(null)
    setTimeout(() => toast.success('Form reset'), 50)
  }, [tool])

  const toggleBookmark = () => {
    if (!tool) return
    setBookmarks(prev =>
      prev.includes(tool.id) ? prev.filter(id => id !== tool.id) : [...prev, tool.id]
    )
    toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks')
  }

  const share = () => {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied!'))
  }

  // Only show the full page skeleton when there is no cached tools data.
  if (isLoading && (!tools || tools.length === 0)) return <ToolPageSkeleton />
  if (!tool && !isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-2xl font-bold mb-2">Tool not found</p>
      <p className="text-muted-foreground mb-6">The tool you're looking for doesn't exist.</p>
      <Button asChild><Link to="/tools">Browse All Tools</Link></Button>
    </div>
  )

  return (
    <>
      {tool && <ToolSEO tool={tool} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/" className="hover:text-foreground flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/tools" className="hover:text-foreground">Tools</Link>
          {category && (<><ChevronRight className="w-3.5 h-3.5" /><Link to={`/category/${encodeURIComponent(category.slug)}`} className="hover:text-foreground">{category.name}</Link></>)}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{tool?.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center shrink-0 shadow-sm">
                    <DynamicIcon name={tool?.icon || 'Wrench'} className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {tool?.is_featured && <Badge className="bg-primary/10 text-primary border-0 text-xs"><Zap className="w-3 h-3 mr-1" />Featured</Badge>}
                      {tool?.is_trending && <Badge className="bg-accent/10 text-accent border-0 text-xs">?? Trending</Badge>}
                      {category && <Badge variant="secondary" className="text-xs">{category.name}</Badge>}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{tool?.name}</h1>
                    <p className="text-muted-foreground">{tool?.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={toggleBookmark}>
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={share}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {tool?.usage_count > 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  Used {tool.usage_count.toLocaleString()} times
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
            >
              {isImageTool ? (
                <ImageToolRouter tool={tool} />
              ) : isPDFTool ? (
                <PDFTool tool={tool} />
              ) : isGovTool ? (
                <GovToolRouter tool={tool} />
              ) : (
                <div className="space-y-6">
                  <ToolInputForm
                    tool={tool}
                    inputs={inputs}
                    onChange={setInputs}
                    onCalculate={calculate}
                    onReset={reset}
                    loading={loading}
                  />

                  {result && (
                    <div>
                      <div className="border-t border-border/50 mb-5 pt-5">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Results</h2>
                        <ToolResult result={result} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold">Quick usage tips</h2>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Use {tool?.name} with the input format that best matches your task.</li>
                <li>Start with the default settings, then adjust only the fields you need.</li>
                <li>Smaller input files usually process faster and keep the browser responsive.</li>
              </ul>
            </motion.div>

            {tool?.long_description && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: tool.long_description }}
              />
            )}

            {/* NEW SEO CONTENT */}
            <ToolContentSections
              tool={tool}
            />

            {/* Related Articles (SEO) */}
            {relatedArticles.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-primary rounded-full"></div>
                  <h2 className="text-xl font-semibold">Related articles</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedArticles.map(related => (
                    <Link key={related.id} to={`/blog/${encodeURIComponent(related.slug)}`} className="group block rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 overflow-hidden">
                      <div className="flex gap-3 p-3">
                        {related.featured_image && (
                          <div className="flex-shrink-0">
                            <img src={related.featured_image} alt={related.title} loading="lazy" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">{related.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{related.excerpt || 'Read more about this topic...'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(related.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {tool?.faq?.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-8">
                <FAQAccordion items={tool.faq} />
              </motion.div>
            )}

          </div>

          <div className="space-y-5">
            <AdBanner placement="tool_top" />

            {relatedTools.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Related Tools</h3>
                <div className="space-y-3">
                  {relatedTools.map((rt, i) => (
                    <ToolCard key={rt.id} tool={rt} index={i} categoryName={category?.name} />
                  ))}
                </div>
              </div>
            )}

            <AdBanner placement="tool_bottom" />
          </div>
        </div>
      </div>
    </>
  )
}

function ToolPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-4 w-48 bg-muted rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    </div>
  )
}

const DynamicIcon = ({ name, ...props }) => {
  const Icon = getIcon(name)
  return <Icon {...props} />
}
