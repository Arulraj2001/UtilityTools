/**
 * Premium Text Tool Router - Maps all text tool slugs to their custom interactive components.
 */
import React, { lazy, Suspense, memo } from 'react'

// Lazy-loaded tools
const WordCounter = lazy(() => import('./tools/WordCounter'))
const CaseConverter = lazy(() => import('./tools/CaseConverter'))
const TextCompare = lazy(() => import('./tools/TextCompare'))
const FindReplace = lazy(() => import('./tools/FindReplace'))
const SlugGenerator = lazy(() => import('./tools/SlugGenerator'))
const LoremIpsumGenerator = lazy(() => import('./tools/LoremIpsumGenerator'))
const TextReverser = lazy(() => import('./tools/TextReverser'))
const LineSorter = lazy(() => import('./tools/LineSorter'))
const DuplicateRemover = lazy(() => import('./tools/DuplicateRemover'))
const WhitespaceRemover = lazy(() => import('./tools/WhitespaceRemover'))

const TEXT_TOOL_MAP = {
  'word-counter': WordCounter,
  'case-converter': CaseConverter,
  'text-compare': TextCompare,
  'find-replace': FindReplace,
  'slug-generator': SlugGenerator,
  'lorem-ipsum': LoremIpsumGenerator,
  'text-reverser': TextReverser,
  'line-sorter': LineSorter,
  'duplicate-remover': DuplicateRemover,
  'whitespace-remover': WhitespaceRemover,
}

const LoadingFallback = () => (
  <div className="p-6 space-y-4 animate-pulse">
    <div className="h-8 bg-muted rounded-xl w-1/3"></div>
    <div className="h-32 bg-muted rounded-xl"></div>
    <div className="h-64 bg-muted rounded-xl"></div>
  </div>
)

const TextToolRouter = memo(({ tool }) => {
  if (!tool?.slug) return null

  const Component = TEXT_TOOL_MAP[tool.slug]

  if (!Component) return null

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component tool={tool} />
    </Suspense>
  )
})

TextToolRouter.displayName = 'TextToolRouter'

export default TextToolRouter

export const TEXT_TOOL_SLUGS = Object.keys(TEXT_TOOL_MAP)
