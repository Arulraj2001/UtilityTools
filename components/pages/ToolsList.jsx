'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTools, getCategories } from '@/api/supabaseApi'
import { trackWorkflowSearch } from '@/lib/analytics'
import ToolCard from '@/components/shared/ToolCard'
import AdBanner from '@/components/shared/AdBanner'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { buildCollectionPageSchema } from '@/lib/pageSchemas'
import { robotsForSearchParams } from '@/lib/indexation'

const toolsDescription =
  'Browse free QuickUtils tools for PDFs, images, calculators, text, developer tasks, SEO checks, student work, seller workflows, and shipping calculations.'

const priorityCategorySlugs = [
  'pdf-tools',
  'image-tools',
  'finance',
  'education',
  'developer-tools',
  'seo-tools',
]

export default function ToolsList() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Restore scroll position when user navigates back from a tool page
  const scrollKey = 'toolslist_scroll'
  const didRestoreRef = useRef(false)
  useEffect(() => {
    if (!didRestoreRef.current) {
      didRestoreRef.current = true
      const saved = sessionStorage.getItem(scrollKey)
      if (saved) {
        const y = parseInt(saved, 10)
        if (!isNaN(y) && y > 0) {
          // Short timeout lets the list render before restoring
          setTimeout(() => window.scrollTo({ top: y, behavior: 'auto' }), 60)
          sessionStorage.removeItem(scrollKey)
        }
      }
    }
  }, [])

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
  })

  const filtered = useMemo(() => {
    return tools.filter(tool => {
      const selectedCategoryRow = categories.find((category) => (
        category.id === selectedCategory || category.slug === selectedCategory
      ))
      const matchesSearch = !search ||
        tool.name?.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCat = selectedCategory === 'all' ||
        tool.category_id === selectedCategory ||
        tool.category_slug === selectedCategory ||
        tool.category_id === selectedCategoryRow?.slug ||
        tool.category_slug === selectedCategoryRow?.slug
      return matchesSearch && matchesCat
    })
  }, [tools, categories, search, selectedCategory])

  const priorityCategories = useMemo(() => (
    priorityCategorySlugs
      .map((slug) => categories.find((category) => category.slug === slug))
      .filter(Boolean)
  ), [categories])

  const collectionSchema = useMemo(() => buildCollectionPageSchema({
    name: 'QuickUtils Free Online Tools',
    description: toolsDescription,
    url: `${SITE_URL}/tools`,
    items: tools.slice(0, 50),
    getItem: (tool) => ({
      name: tool.name,
      description: tool.description,
      url: `${SITE_URL}/tool/${encodeURIComponent(tool.slug)}`,
    }),
  }), [tools])

  useEffect(() => {
    if (!search.trim()) return

    const timer = setTimeout(() => {
      trackWorkflowSearch({
        query: search.trim(),
        resultCount: filtered.length,
        source: selectedCategory === 'all' ? 'tools_list' : 'tools_list_category',
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [search, filtered.length, selectedCategory])

  return (
    <>
      <StaticPageSEO
        title="Free Online Tools - PDF, Image, Calculator, SEO and Developer Utilities"
        description={toolsDescription}
        path="/tools"
        ogTitle="QuickUtils Free Online Tools"
        ogDescription={toolsDescription}
        robots={robotsForSearchParams(searchParams)}
        jsonLd={[
          collectionSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Tools', url: `${SITE_URL}/tools` },
          ]),
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Tools</h1>
        <p className="text-muted-foreground max-w-3xl">
          Browse practical browser-based utilities for documents, images, finance, education,
          developer tasks, SEO checks, seller operations, and shipping calculations. Start with a
          category when you know the task area, or search when you already know the tool name.
        </p>
        {priorityCategories.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {priorityCategories.map((category) => (
              <Link key={category.id}
                href={`/category/${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/70 hover:text-primary transition"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-5">{filtered.length} tools found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tool, i) => {
              const cat = categories.find(c => (
                c.id === tool.category_id ||
                c.slug === tool.category_id ||
                c.slug === tool.category_slug
              ))
              return (
                <React.Fragment key={tool.id}>
                  <ToolCard tool={tool} index={i} categoryName={cat?.name} compact={true} />
                  {(i + 1) % 8 === 0 && <div className="col-span-full"><AdBanner placement="in_content" /></div>}
                </React.Fragment>
              )
            })}
          </div>
        </>
      )}
      <section className="mt-12 rounded-2xl border border-border/70 bg-card p-6">
        <h2 className="text-xl font-semibold">How to choose the right tool</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-muted-foreground leading-relaxed">
          <p>Use PDF and image tools when upload limits, dimensions, format, or document order matter.</p>
          <p>Use calculator categories when you need transparent formulas for finance, study, math, or daily planning.</p>
          <p>Use developer and SEO tools when you need clean structured data, metadata, encoding, or crawl-support files.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/methodology" className="text-primary hover:underline">How tools are tested</Link>
          <Link href="/categories" className="text-primary hover:underline">Browse all categories</Link>
          <Link href="/blog" className="text-primary hover:underline">Read tool guides</Link>
        </div>
      </section>
      </div>
    </>
  )
}
