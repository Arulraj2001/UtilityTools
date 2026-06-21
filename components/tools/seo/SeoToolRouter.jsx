/**
 * Premium SEO Tool Router - Maps all SEO tool slugs to their custom interactive components.
 */
import React, { lazy, Suspense, memo } from 'react'

// Lazy-loaded tools
const MetaTagGenerator = lazy(() => import('./tools/MetaTagGenerator'))
const OpenGraphGenerator = lazy(() => import('./tools/OpenGraphGenerator'))
const RobotsTxtGenerator = lazy(() => import('./tools/RobotsTxtGenerator'))
const SitemapGenerator = lazy(() => import('./tools/SitemapGenerator'))
const SchemaGenerator = lazy(() => import('./tools/SchemaGenerator'))
const UtmBuilder = lazy(() => import('./tools/UtmBuilder'))
const KeywordDensityChecker = lazy(() => import('./tools/KeywordDensityChecker'))
const WordDensityChecker = lazy(() => import('./tools/WordDensityChecker'))
const HtmlMinifier = lazy(() => import('./tools/Minifiers').then(m => ({ default: m.HtmlMinifier })))
const CssMinifier = lazy(() => import('./tools/Minifiers').then(m => ({ default: m.CssMinifier })))
const JavascriptMinifier = lazy(() => import('./tools/Minifiers').then(m => ({ default: m.JavascriptMinifier })))

const SEO_TOOL_MAP = {
  'meta-tag-generator': MetaTagGenerator,
  'open-graph-generator': OpenGraphGenerator,
  'robots-txt-generator': RobotsTxtGenerator,
  'sitemap-generator': SitemapGenerator,
  'schema-generator': SchemaGenerator,
  'utm-builder': UtmBuilder,
  'keyword-density-checker': KeywordDensityChecker,
  'word-density-checker': WordDensityChecker,
  'html-minifier': HtmlMinifier,
  'css-minifier': CssMinifier,
  'javascript-minifier': JavascriptMinifier,
}

const LoadingFallback = () => (
  <div className="p-6 space-y-4 animate-pulse">
    <div className="h-8 bg-muted rounded-xl w-1/3"></div>
    <div className="h-32 bg-muted rounded-xl"></div>
    <div className="h-64 bg-muted rounded-xl"></div>
  </div>
)

const SeoToolRouter = memo(({ tool }) => {
  if (!tool?.slug) return null

  const Component = SEO_TOOL_MAP[tool.slug]

  if (!Component) return null

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component tool={tool} />
    </Suspense>
  )
})

export default SeoToolRouter

export const SEO_TOOL_SLUGS = Object.keys(SEO_TOOL_MAP)
