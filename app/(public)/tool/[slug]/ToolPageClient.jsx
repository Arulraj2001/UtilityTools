'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Home, Bookmark, BookmarkCheck, Share2, Clock } from 'lucide-react'
import { getIcon } from '@/lib/iconMap'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import useToolMemo from '@/hooks/useToolMemo'
import { useLocalStorage } from '@/lib/useLocalStorage'
import {
  incrementToolPageUsage,
} from '@/api/toolPageApi'
import { trackToolEvent } from '@/lib/analytics'

const ToolInputForm = lazy(() => import('@/components/tools/ToolInputForm'))
const ToolResult = lazy(() => import('@/components/tools/ToolResult'))
const ImageToolRouter = lazy(() => import('@/components/tools/image/ImageToolRouter'))
const PDFTool = lazy(() => import('@/components/tools/PDFTool'))
const GovToolRouter = lazy(() => import('@/components/tools/gov/GovToolRouter'))
const LogisticsToolRouter = lazy(() => import('@/components/tools/logistics/LogisticsToolRouter'))
const SellerToolRouter = lazy(() => import('@/components/tools/seller/SellerToolRouter'))
const SeoToolRouter = lazy(() => import('@/components/tools/seo/SeoToolRouter'))
const TextToolRouter = lazy(() => import('@/components/tools/text/TextToolRouter'))

const IMAGE_TOOLS = [
  'image-compressor', 'image-resizer', 'image-converter', 'image-cropper',
  'image-to-pdf', 'image-watermark', 'image-color-picker', 'image-metadata-viewer',
  'background-remover', 'image-rotator', 'jpg-to-png', 'png-to-jpg',
];

const PDF_TOOLS = ['merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'protect-pdf', 'remove-pages-pdf', 'word-to-pdf'];

const GOV_TOOLS = [
  'ssc-photo-resizer', 'ssc-signature-resizer', 'railway-photo-resizer',
  'bank-exam-photo-tool', 'passport-size-photo-maker', 'photo-kb-reducer',
  'signature-maker', 'exam-photo-cropper', 'pdf-size-reducer',
  'exam-document-pdf-compressor', 'image-to-exam-pdf', 'pdf-page-extractor',
  'pdf-merger', 'pdf-to-image', 'document-scanner',
];

const LOGISTICS_TOOLS = [
  'smart-courier-analyzer', 'shipment-transit-intelligence', 'cargo-volume-planner',
  'freight-billing-optimizer', 'packaging-profit-analyzer', 'air-cargo-pricing-simulator',
  'container-optimization-system', 'parcel-dimension-intelligence', 'volumetric-freight-analyzer',
  'advanced-shipping-estimator', 'courier-charges-calculator', 'delivery-time-estimator',
  'cbm-calculator', 'chargeable-weight-calculator', 'packaging-cost-calculator',
  'air-freight-calculator', 'container-load-calculator', 'parcel-dimension-calculator',
  'volumetric-weight-calculator', 'shipping-cost-calculator',
];

const SELLER_TOOLS = [
  'amazon-seller-profit-intelligence', 'flipkart-seller-earnings-analyzer',
  'ecommerce-profit-optimizer', 'cod-risk-fee-analyzer', 'advanced-shipping-label-studio',
  'inventory-forecast-dashboard', 'smart-gst-invoice-builder', 'smart-product-pricing-engine',
  'business-roi-intelligence', 'seller-business-performance-dashboard', 'amazon-fee-calculator',
  'flipkart-fee-calculator', 'profit-margin-calculator', 'cod-charge-calculator',
  'shipping-label-generator', 'inventory-calculator', 'gst-invoice-generator',
  'product-pricing-calculator', 'roi-calculator', 'seller-profit-estimator',
];

const SEO_TOOLS = [
  'meta-tag-generator', 'open-graph-generator', 'robots-txt-generator',
  'sitemap-generator', 'schema-generator', 'utm-builder',
  'keyword-density-checker', 'word-density-checker',
  'html-minifier', 'css-minifier', 'javascript-minifier',
];

const TEXT_TOOLS = [
  'word-counter', 'case-converter', 'text-compare', 'find-replace',
  'slug-generator', 'lorem-ipsum', 'text-reverser', 'line-sorter',
  'duplicate-remover', 'whitespace-remover',
];

export default function ToolPageClient({ tool, categoryName }) {
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const skipAutoCalcRef = useRef(false)
  const [bookmarks, setBookmarks] = useLocalStorage('bookmarked_tools', [])
  const [recentTools, setRecentTools] = useLocalStorage('recent_tools', [])

  const isImageTool = tool ? IMAGE_TOOLS.includes(tool.slug) : false
  const isPDFTool = tool ? PDF_TOOLS.includes(tool.slug) : false
  const isGovTool = tool ? GOV_TOOLS.includes(tool.slug) : false
  const isLogisticsTool = tool ? LOGISTICS_TOOLS.includes(tool.slug) : false
  const isSellerTool = tool ? SELLER_TOOLS.includes(tool.slug) : false
  const isSeoTool = tool ? SEO_TOOLS.includes(tool.slug) : false
  const isTextTool = tool ? TEXT_TOOLS.includes(tool.slug) : false
  const isBookmarked = tool ? bookmarks.includes(tool.id) : false

  const prevSlugRef = useRef(tool?.slug)
  useEffect(() => {
    if (!tool) return
    if (prevSlugRef.current === tool.slug) return
    prevSlugRef.current = tool.slug

    const fields = tool.input_fields || []
    const defaults = {}
    fields.forEach(f => {
      defaults[f.name] = f.default_value !== undefined ? f.default_value : ''
    })
    skipAutoCalcRef.current = true
    setInputs(defaults)
    setResult(null)
  }, [tool?.slug, tool])

  useEffect(() => {
    if (!tool) return
    setRecentTools(prev => {
      const filtered = prev.filter(id => id !== tool.id)
      return [tool.id, ...filtered].slice(0, 10)
    })

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
        : { ...res, metrics }

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
    const fields = tool.input_fields || []
    const defaults = {}
    fields.forEach(f => {
      defaults[f.name] = f.default_value !== undefined ? f.default_value : ''
    })
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
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success('Link copied!'))
        .catch((err) => {
          console.error('Clipboard write failed:', err);
          fallbackCopyText(url);
        });
    } else {
      fallbackCopyText(url);
    }
  }

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        toast.success('Link copied!');
      } else {
        toast.error('Failed to copy link');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      toast.error('Failed to copy link');
    }
  }

  if (!tool) return null;

  return (
    <div>
      {/* Tool Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center shrink-0 shadow-sm">
            <DynamicIcon name={tool.icon || 'Wrench'} className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {tool.is_featured && <Badge className="bg-primary/10 text-primary border-0 text-xs">Featured</Badge>}
              {tool.is_trending && <Badge className="bg-accent/10 text-accent border-0 text-xs">Trending</Badge>}
              {categoryName && <Badge variant="secondary" className="text-xs">{categoryName}</Badge>}
            </div>
            <div className="text-2xl sm:text-3xl font-bold mb-2">{tool.name}</div>
            <p className="text-muted-foreground">{tool.description}</p>
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

      {tool.usage_count > 0 && (
        <div className="flex items-center gap-1.5 mb-4 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Used {tool.usage_count.toLocaleString()} times • Free Forever
        </div>
      )}

      {/* Interactive Tool UI */}
      {isImageTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing image workspace...</div>}>
          <ImageToolRouter tool={tool} />
        </Suspense>
      ) : isPDFTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing PDF workspace...</div>}>
          <PDFTool tool={tool} />
        </Suspense>
      ) : isGovTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing form workspace...</div>}>
          <GovToolRouter tool={tool} />
        </Suspense>
      ) : isLogisticsTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing logistics workspace...</div>}>
          <LogisticsToolRouter tool={tool} />
        </Suspense>
      ) : isSellerTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing seller workspace...</div>}>
          <SellerToolRouter tool={tool} />
        </Suspense>
      ) : isSeoTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing SEO workspace...</div>}>
          <SeoToolRouter tool={tool} />
        </Suspense>
      ) : isTextTool ? (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing text workspace...</div>}>
          <TextToolRouter tool={tool} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="min-h-[260px] py-12 text-center text-sm text-muted-foreground">Preparing calculator workspace...</div>}>
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
  );
}

const DynamicIcon = ({ name, ...props }) => {
  return React.createElement(getIcon(name), props)
}
