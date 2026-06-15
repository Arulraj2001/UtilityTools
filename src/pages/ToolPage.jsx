import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Home, Bookmark, BookmarkCheck, Share2, Clock, Zap } from 'lucide-react'
import { getIcon } from '@/lib/iconMap'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import useToolMemo from '@/hooks/useToolMemo'
import ToolSEO from '@/components/seo/ToolSEO'
import { useLocalStorage } from '@/lib/useLocalStorage'
import PageNotFound from '@/lib/PageNotFound'
import {
  getToolPageBlogPosts,
  getToolPageBySlug,
  getToolPageCategories,
  getToolPageRelatedTools,
  getToolPageWorkflows,
  incrementToolPageUsage,
} from '@/api/toolPageApi'
import { trackToolEvent } from '@/lib/analytics'

const ToolInputForm = lazy(() => import('@/components/tools/ToolInputForm'))
const ToolResult = lazy(() => import('@/components/tools/ToolResult'))
const FAQAccordion = lazy(() => import('@/components/shared/FAQAccordion'))
const ToolCard = lazy(() => import('@/components/shared/ToolCard'))
const AdBanner = lazy(() => import('@/components/shared/AdBanner'))
const ImageToolRouter = lazy(() => import('@/components/image-tools/ImageToolRouter'))
const PDFTool = lazy(() => import('@/components/tools/PDFTool'))
const GovToolRouter = lazy(() => import('@/components/gov-tools/GovToolRouter'))
const LogisticsToolRouter = lazy(() => import('@/components/logistics-tools/LogisticsToolRouter'))
const SellerToolRouter = lazy(() => import('@/components/seller-tools/SellerToolRouter'))
const ToolContentSections = lazy(() => import('@/components/seo/ToolContentSections'))
const SanitizedHtmlBlock = lazy(() => import('@/components/seo/SanitizedHtmlBlock'))

const IMAGE_TOOLS = [
  'image-compressor',
  'image-resizer',
  'image-converter',
  'image-cropper',
  'image-to-pdf',
  'image-watermark',
  'image-color-picker',
  'image-metadata-viewer',
  'background-remover',
  'image-rotator',
  'jpg-to-png',
  'png-to-jpg',
]

const PDF_TOOLS = ['merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'protect-pdf', 'remove-pages-pdf', 'word-to-pdf']

const GOV_TOOLS = [
  'ssc-photo-resizer',
  'ssc-signature-resizer',
  'railway-photo-resizer',
  'bank-exam-photo-tool',
  'passport-size-photo-maker',
  'photo-kb-reducer',
  'signature-maker',
  'exam-photo-cropper',
  'pdf-size-reducer',
  'exam-document-pdf-compressor',
  'image-to-exam-pdf',
  'pdf-page-extractor',
  'pdf-merger',
  'pdf-to-image',
  'document-scanner',
]

const LOGISTICS_TOOLS = [
  'smart-courier-analyzer',
  'shipment-transit-intelligence',
  'cargo-volume-planner',
  'freight-billing-optimizer',
  'packaging-profit-analyzer',
  'air-cargo-pricing-simulator',
  'container-optimization-system',
  'parcel-dimension-intelligence',
  'volumetric-freight-analyzer',
  'advanced-shipping-estimator',
  'courier-charges-calculator',
  'delivery-time-estimator',
  'cbm-calculator',
  'chargeable-weight-calculator',
  'packaging-cost-calculator',
  'air-freight-calculator',
  'container-load-calculator',
  'parcel-dimension-calculator',
  'volumetric-weight-calculator',
  'shipping-cost-calculator',
]

const SELLER_TOOLS = [
  'amazon-seller-profit-intelligence',
  'flipkart-seller-earnings-analyzer',
  'ecommerce-profit-optimizer',
  'cod-risk-fee-analyzer',
  'advanced-shipping-label-studio',
  'inventory-forecast-dashboard',
  'smart-gst-invoice-builder',
  'smart-product-pricing-engine',
  'business-roi-intelligence',
  'seller-business-performance-dashboard',
  'amazon-fee-calculator',
  'flipkart-fee-calculator',
  'profit-margin-calculator',
  'cod-charge-calculator',
  'shipping-label-generator',
  'inventory-calculator',
  'gst-invoice-generator',
  'product-pricing-calculator',
  'roi-calculator',
  'seller-profit-estimator',
]

export default function ToolPage() {
  const { slug } = useParams()
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const skipAutoCalcRef = useRef(false)
  const [bookmarks, setBookmarks] = useLocalStorage('bookmarked_tools', [])
  const [recentTools, setRecentTools] = useLocalStorage('recent_tools', [])

  const { data: tool = null, isLoading: isToolLoading } = useQuery({
    queryKey: ['tool-by-slug', slug],
    queryFn: () => getToolPageBySlug(slug, { published: true }),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: tools = [] } = useQuery({
    queryKey: ['tools-by-category', tool?.category_id],
    queryFn: () => getToolPageRelatedTools({ limit: 20, categoryId: tool?.category_id }),
    // Only fetch once we know the category — avoids loading all 200 tools
    enabled: !!tool?.category_id,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    cacheTime: 10 * 60 * 1000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getToolPageCategories,
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['blog-published', slug],
    queryFn: () => getToolPageBlogPosts({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-published', slug],
    queryFn: () => getToolPageWorkflows({ limit: 12 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })

  const category = useMemo(() => (
    categories.find((c) => (
      c.id === tool?.category_id ||
      c.slug === tool?.category_id ||
      c.slug === tool?.category_slug
    ))
  ), [categories, tool])
  const relatedTools = useMemo(() => {
    if (!tool) return []
    return tools
      .filter((t) => (
        t.id !== tool.id && (
          t.category_id === tool.category_id ||
          t.category_id === tool.category_slug ||
          t.category_slug === tool.category_slug ||
          t.category_slug === tool.category_id
        )
      ))
      .slice(0, 4)
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
  const isLogisticsTool = tool ? LOGISTICS_TOOLS.includes(tool.slug) : false
  const isSellerTool = tool ? SELLER_TOOLS.includes(tool.slug) : false

  // Global <ScrollToTop /> in App.jsx handles scroll-to-top on route change.
  // No duplicate call needed here — it caused double-scroll jank between tools.

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

      // Atomic increment — eliminates read-then-write race condition
      if (tool?.id) {
        incrementToolPageUsage(tool.id).catch(() => {})
        trackToolEvent(tool, 'tool_open').catch(() => {})
      }
  }, [tool?.id])

  const runToolDynamic = useCallback(async (activeTool, activeInputs) => {
    const { runTool } = await import('@/lib/toolEngine')
    return runTool(activeTool, activeInputs)
  }, [])

  const memoRunTool = useToolMemo(runToolDynamic)

  const calculate = useCallback(async () => {
    if (!tool) return
    setLoading(true)
    const startTime = Date.now()

    try {
      const res = await memoRunTool(tool, inputs)
      let metrics = null
      if (!res?.error && isLogisticsTool) {
        const { buildLogisticsMetrics } = await import('@/lib/engines/logisticsMetricsEngine')
        metrics = buildLogisticsMetrics(res, inputs, tool.slug)
      }

      const augmentedResult = res?.error
        ? res
        : {
            ...res,
            metrics,
          }

      setResult(augmentedResult)
      trackToolEvent(tool, 'tool_run', {
        success: !res?.error,
        duration_ms: Date.now() - startTime,
        input_count: Object.keys(inputs).length,
      }).catch(() => {})
    } catch (error) {
      console.error('Calculation error:', error)
      setResult({ error: error.message || 'Calculation failed' })
      trackToolEvent(tool, 'tool_run', {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message,
      }).catch(() => {})
    } finally {
      setLoading(false)
    }
  }, [tool, inputs, memoRunTool, isLogisticsTool])

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

  // Resolve the active tool directly by slug so page content and metadata use the matching DB row.
  if (isToolLoading) return <ToolPageSkeleton />
  if (!tool && !isToolLoading) return (
    <PageNotFound
      title="Tool not found"
      message="The tool you requested does not exist, has been removed, or is not published."
      primaryHref="/tools"
      primaryLabel="Browse All Tools"
    />
  )

  return (
    <>
      {tool && <ToolSEO tool={tool} categoryName={category?.name} />}
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
            <div>
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
                  Used {tool.usage_count.toLocaleString()} times • ✅ Free Forever
                </div>
              )}
            </div>

            <div
              className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
            >
              {isImageTool ? (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading image tool…</div>}>
                  <ImageToolRouter tool={tool} />
                </Suspense>
              ) : isPDFTool ? (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading PDF tool…</div>}>
                  <PDFTool tool={tool} />
                </Suspense>
              ) : isGovTool ? (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading government tool…</div>}>
                  <GovToolRouter tool={tool} />
                </Suspense>
              ) : isLogisticsTool ? (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading logistics tool…</div>}>
                  <LogisticsToolRouter tool={tool} />
                </Suspense>
              ) : isSellerTool ? (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading seller tool…</div>}>
                  <SellerToolRouter tool={tool} />
                </Suspense>
              ) : (
                <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Loading tool form…</div>}>
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
                </Suspense>
              )}
            </div>

            <div
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
              <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
                <Link to="/methodology" className="text-primary hover:underline">How tools are tested</Link>
                <Link to="/corrections-policy" className="text-primary hover:underline">Report a correction</Link>
                <Link to="/contact" className="text-primary hover:underline">Contact support</Link>
              </div>
            </div>

            {/* Value proposition blurb for E-E-A-T - shown for all tools above the main educational content */}
            <div className="text-xs text-muted-foreground px-1">
              This tool is free, private where possible, and includes detailed guidance below so you understand the results and limitations before using them for official submissions or important decisions.
            </div>

            {tool?.long_description && (
              <Suspense fallback={null}>
                <SanitizedHtmlBlock
                  html={tool.long_description}
                  className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 prose prose-sm max-w-none dark:prose-invert"
                />
              </Suspense>
            )}

            {/* NEW SEO CONTENT */}
            <Suspense fallback={null}>
              <ToolContentSections tool={tool} categoryName={category?.name} />
            </Suspense>

            {tool?.faq?.length > 0 && (
              <div className="mt-8">
                <Suspense fallback={null}>
                  <FAQAccordion items={tool.faq} />
                </Suspense>
              </div>
            )}

            {/* Related Articles (SEO) */}
            {relatedArticles.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-primary rounded-full"></div>
                  <h2 className="text-xl font-semibold">Related articles</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedArticles.map(related => (
                    <Link key={related.id} to={`/blog/${encodeURIComponent(related.slug)}`} className="group block rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 overflow-hidden premium-card panel-highlight glow-border">
                      <div className="flex gap-3 p-3">
                        {related.featured_image && (
                          <div className="flex-shrink-0">
                            <img src={related.featured_image} alt={related.title} loading="lazy" decoding="async" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
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
              </div>
            )}

            {/* Related Workflows */}
            {workflows.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent rounded-full"></div>
                  <h2 className="text-xl font-semibold">Popular Workflows</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {workflows.slice(0, 4).map(workflow => (
                    <Link key={workflow.id} to={`/workflow/${encodeURIComponent(workflow.slug)}`} className="group block rounded-xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all duration-300 overflow-hidden premium-card panel-highlight">
                      <div className="p-4">
                        <p className="text-sm font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">{workflow.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{workflow.excerpt || 'Step-by-step workflow guide...'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-accent transition-colors">
                          <span>Learn more</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="space-y-5">
            <Suspense fallback={null}>
              <AdBanner placement="tool_top" />
            </Suspense>

            {relatedTools.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Related Tools</h3>
                <div className="space-y-3">
                  {relatedTools.map((rt, i) => (
                    <Suspense key={rt.id} fallback={null}>
                      <ToolCard tool={rt} index={i} categoryName={category?.name} />
                    </Suspense>
                  ))}
                </div>
              </div>
            )}

            <Suspense fallback={null}>
              <AdBanner placement="tool_bottom" />
            </Suspense>
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
