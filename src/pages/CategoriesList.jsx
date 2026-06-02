import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCategories, getTools } from '@/api/supabaseApi'
import CategoriesGrid from '../components/home/CategoriesGrid'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { buildCollectionPageSchema } from '@/lib/pageSchemas'

const categoriesDescription =
  'Browse QuickUtils tool categories for PDF tools, image tools, finance calculators, education tools, developer utilities, SEO tools, and everyday workflows.'

export default function CategoriesList() {
  const {
    data: tools = [],
    isLoading: isLoadingTools,
  } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false, limit: 500 }),
    retry: false,
  })

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
    retry: false,
  })

  if (isLoadingTools || isLoadingCategories) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      </div>
    )
  }

  return (
    <>
      <StaticPageSEO
        title="Tool Categories - Browse QuickUtils by Task Type"
        description={categoriesDescription}
        path="/categories"
        ogTitle="QuickUtils Tool Categories"
        ogDescription={categoriesDescription}
        jsonLd={[
          buildCollectionPageSchema({
            name: 'QuickUtils Tool Categories',
            description: categoriesDescription,
            url: `${SITE_URL}/categories`,
            items: categories,
            getItem: (category) => ({
              name: category.name,
              description: category.description,
              url: `${SITE_URL}/category/${encodeURIComponent(category.slug)}`,
            }),
          }),
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Categories', url: `${SITE_URL}/categories` },
          ]),
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">All Categories</h1>
        <p className="text-muted-foreground mb-4 max-w-3xl">
          Browse QuickUtils by task type. Category hubs group related tools with supporting
          guides, workflows, FAQs, and internal links so you can move from a problem to the
          right utility faster.
        </p>
        <div className="mb-8 flex flex-wrap gap-4 text-sm font-medium">
          <a href="#category-grid" className="text-primary hover:underline">View categories</a>
          <Link to="/methodology" className="text-primary hover:underline">Methodology</Link>
          <Link to="/blog" className="text-primary hover:underline">Tool guides</Link>
        </div>
        <div id="category-grid">
          <CategoriesGrid categories={categories} tools={tools} />
        </div>
      </div>
    </>
  )
}
