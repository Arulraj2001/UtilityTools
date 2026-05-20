import React, { lazy, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTools, getCategories, getTotalUsageCount, getFeaturedWorkflows, getCategoryCounts } from '@/api/supabaseApi'
import HeroSection from '../components/home/HeroSection'
import StatsBar from '../components/home/StatsBar'
const CategoriesGrid = lazy(() => import('../components/home/CategoriesGrid'))
const FeaturedTools = lazy(() => import('../components/home/FeaturedTools'))
const PopularWorkflows = lazy(() => import('../components/home/PopularWorkflows'))
import AdBanner from '../components/shared/AdBanner'

export default function Home() {
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
    retry: false,
  })

  const {
    data: categoryCounts = {},
    isLoading: isLoadingCategoryCounts,
  } = useQuery({
    queryKey: ['category-counts', categories.map(c => c.id)],
    enabled: categories.length > 0,
    queryFn: () => getCategoryCounts({ categoryIds: categories.map(c => c.id) }),
    retry: false,
  })

  const {
    data: featuredTools = [],
    isLoading: isLoadingFeaturedTools,
    error: featuredToolsError,
  } = useQuery({
    queryKey: ['featured-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'is_featured desc, created_at desc', ascending: false, limit: 6 }),
    retry: false,
  })

  const {
    data: trendingTools = [],
    isLoading: isLoadingTrendingTools,
    error: trendingToolsError,
  } = useQuery({
    queryKey: ['trending-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'is_trending desc, created_at desc', ascending: false, limit: 6 }),
    retry: false,
  })

  const {
    data: recentTools = [],
    isLoading: isLoadingRecentTools,
    error: recentToolsError,
  } = useQuery({
    queryKey: ['recent-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false, limit: 6 }),
    retry: false,
  })

  const {
    data: totalUsage = 0,
    isLoading: isLoadingUsage,
  } = useQuery({
    queryKey: ['total-usage'],
    queryFn: getTotalUsageCount,
    retry: false,
  })

  const {
    data: featuredWorkflows = [],
    isLoading: isLoadingWorkflows,
  } = useQuery({
    queryKey: ['workflows-featured'],
    queryFn: () => getFeaturedWorkflows({ limit: 6 }),
    retry: false,
  })

  const toolCount = useMemo(() => {
    const categoryTotal = categories.reduce((sum, category) => sum + (category.tool_count || categoryCounts[category.id] || 0), 0)
    if (categoryTotal > 0) return categoryTotal
    return Math.max(featuredTools.length + trendingTools.length + recentTools.length, 50)
  }, [categories, categoryCounts, featuredTools.length, trendingTools.length, recentTools.length])

  const isLoading = isLoadingCategories || isLoadingFeaturedTools || isLoadingTrendingTools || isLoadingRecentTools || isLoadingUsage || isLoadingWorkflows
  const hasError = categoriesError || featuredToolsError || trendingToolsError || recentToolsError

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading homepage data…</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4 text-center">
        <h2 className="text-2xl font-semibold mb-3">Unable to load homepage data</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          {categoriesError?.message || featuredToolsError?.message || trendingToolsError?.message || recentToolsError?.message || 'There was an issue loading site data. Please try refreshing the page.'}
        </p>
      </div>
    )
  }

  const SectionFallback = (
    <div className="min-h-[24vh] flex items-center justify-center text-sm text-muted-foreground">
      Loading content…
    </div>
  )

  return (
    <div>
      <HeroSection toolCount={toolCount} />
      <StatsBar toolCount={toolCount} userCount={totalUsage} />
      <Suspense fallback={SectionFallback}>
        <CategoriesGrid categories={categories} countByCategory={categoryCounts} />
      </Suspense>
      <Suspense fallback={SectionFallback}>
        <FeaturedTools
          tools={featuredTools.length > 0 ? featuredTools : recentTools.slice(0, 4)}
          categories={categories}
          title="Featured Tools"
          subtitle="Our most popular and highly rated tools"
        />
      </Suspense>
      <AdBanner placement="in_content" pageType="home" className="py-6" />
      {featuredWorkflows.length > 0 && (
        <Suspense fallback={SectionFallback}>
          <PopularWorkflows workflows={featuredWorkflows} />
        </Suspense>
      )}
      {trendingTools.length > 0 && (
        <Suspense fallback={SectionFallback}>
          <FeaturedTools
            tools={trendingTools}
            categories={categories}
            title="Trending Now"
            subtitle="Tools gaining popularity this week"
          />
        </Suspense>
      )}
      <Suspense fallback={SectionFallback}>
        <FeaturedTools
          tools={recentTools}
          categories={categories}
          title="Recently Added"
          subtitle="Fresh tools just added to the platform"
        />
      </Suspense>
    </div>
  )
}
