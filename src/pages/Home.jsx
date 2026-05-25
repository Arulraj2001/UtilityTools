import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTools, getCategories, getTotalUsageCount, getFeaturedWorkflows, getCategoryCounts, getFeaturedJobs } from '@/api/supabaseApi'
import HeroSection from '../components/home/HeroSection'
import StatsBar from '../components/home/StatsBar'
const CategoriesGrid = lazy(() => import('../components/home/CategoriesGrid'))
const FeaturedTools = lazy(() => import('../components/home/FeaturedTools'))
const PopularWorkflows = lazy(() => import('../components/home/PopularWorkflows'))
import AdBanner from '../components/shared/AdBanner'

function SectionHeaderSkeleton({ titleWidth = 'w-48', subtitleWidth = 'w-64' }) {
  return (
    <div className="text-center mb-10">
      <div className={`mx-auto h-9 rounded-full bg-muted animate-pulse ${titleWidth}`} />
      <div className={`mx-auto mt-3 h-4 rounded-full bg-muted animate-pulse ${subtitleWidth}`} />
    </div>
  )
}

function CategoriesSectionSkeleton() {
  return (
    <section className="sm:py-20 rounded">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeaderSkeleton titleWidth="w-56 sm:w-64" subtitleWidth="w-72 sm:w-80" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-36 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}

function ToolsSectionSkeleton({ title = 'Loading', subtitle = 'Loading section…' }) {
  return (
    <section className="sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="h-9 w-56 rounded-full bg-muted animate-pulse mb-3" />
            <div className="h-4 w-72 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="hidden sm:block h-8 w-32 rounded-full bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>

        <div className="mt-6 sm:hidden text-center">
          <div className="h-9 w-32 mx-auto rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </section>
  )
}

function WorkflowsSectionSkeleton() {
  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <SectionHeaderSkeleton titleWidth="w-60 sm:w-72" subtitleWidth="w-80 sm:w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 rounded-3xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="mt-8 text-center">
        <div className="inline-flex h-12 w-44 rounded-full bg-muted animate-pulse" />
      </div>
    </section>
  )
}

export default function Home() {
  const [deferHomepageQueries, setDeferHomepageQueries] = useState(false)

  useEffect(() => {
    setDeferHomepageQueries(true)
  }, [])

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
    isFetching: isFetchingFeaturedTools,
    error: featuredToolsError,
  } = useQuery({
    queryKey: ['featured-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'is_featured desc, created_at desc', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: trendingTools = [],
    isLoading: isLoadingTrendingTools,
    isFetching: isFetchingTrendingTools,
    error: trendingToolsError,
  } = useQuery({
    queryKey: ['trending-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'is_trending desc, created_at desc', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: recentTools = [],
    isLoading: isLoadingRecentTools,
    isFetching: isFetchingRecentTools,
    error: recentToolsError,
  } = useQuery({
    queryKey: ['recent-tools'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false, limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: totalUsage = 0,
    isLoading: isLoadingUsage,
    isFetching: isFetchingUsage,
  } = useQuery({
    queryKey: ['total-usage'],
    queryFn: getTotalUsageCount,
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: featuredWorkflows = [],
    isLoading: isLoadingWorkflows,
    isFetching: isFetchingWorkflows,
  } = useQuery({
    queryKey: ['workflows-featured'],
    queryFn: () => getFeaturedWorkflows({ limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const {
    data: featuredJobs = [],
    isLoading: isLoadingFeaturedJobs
  } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: () => getFeaturedJobs({ limit: 6 }),
    enabled: deferHomepageQueries,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const toolCount = useMemo(() => {
    const categoryTotal = categories.reduce((sum, category) => sum + (category.tool_count || categoryCounts[category.id] || 0), 0)
    return categoryTotal > 0 ? categoryTotal : 50
  }, [categories, categoryCounts])

  const hasError = categoriesError
  const showCategoriesSectionSkeleton = isLoadingCategories || isLoadingCategoryCounts
  const showFeaturedSectionSkeleton = !deferHomepageQueries || isLoadingFeaturedTools || isFetchingFeaturedTools || isLoadingRecentTools || isFetchingRecentTools
  const showTrendingSectionSkeleton = !deferHomepageQueries || isLoadingTrendingTools || isFetchingTrendingTools
  const showRecentSectionSkeleton = !deferHomepageQueries || isLoadingRecentTools || isFetchingRecentTools
  const showWorkflowsSectionSkeleton = !deferHomepageQueries || isLoadingWorkflows || isFetchingWorkflows

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

  return (
    <div>
      <HeroSection toolCount={toolCount} />
      <StatsBar toolCount={toolCount} userCount={totalUsage} />

      {showCategoriesSectionSkeleton ? (
        <CategoriesSectionSkeleton />
      ) : (
        <Suspense fallback={<CategoriesSectionSkeleton />}>
          <CategoriesGrid categories={categories} countByCategory={categoryCounts} />
        </Suspense>
      )}

      {showFeaturedSectionSkeleton ? (
        <ToolsSectionSkeleton title="Featured Tools" subtitle="Our most popular and highly rated tools" />
      ) : (
        <Suspense fallback={<ToolsSectionSkeleton title="Featured Tools" subtitle="Our most popular and highly rated tools" />}>
          <FeaturedTools
            tools={featuredTools.length > 0 ? featuredTools : recentTools.slice(0, 4)}
            categories={categories}
            title="Featured Tools"
            subtitle="Our most popular and highly rated tools"
          />
        </Suspense>
      )}

      <AdBanner placement="in_content" pageType="home" className="py-6" />

      {showWorkflowsSectionSkeleton ? (
        <WorkflowsSectionSkeleton />
      ) : (
        featuredWorkflows.length > 0 && (
          <Suspense fallback={<WorkflowsSectionSkeleton />}>
            <PopularWorkflows workflows={featuredWorkflows} />
          </Suspense>
        )
      )}

      {/* Featured Jobs (deferred) */}
      {deferHomepageQueries && featuredJobs && featuredJobs.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-semibold mb-4">Latest Government Jobs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map((j) => (
                <div key={j.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition">
                  <a href={`/jobs/${encodeURIComponent(j.slug)}`} className="no-underline">
                    <h3 className="font-semibold">{j.title}</h3>
                    <p className="text-sm text-muted-foreground">{j.organization} • {j.location}</p>
                    <p className="text-sm mt-2 line-clamp-2">{j.short_description}</p>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showTrendingSectionSkeleton ? (
        <ToolsSectionSkeleton title="Trending Now" subtitle="Tools gaining popularity this week" />
      ) : (
        trendingTools.length > 0 && (
          <Suspense fallback={<ToolsSectionSkeleton title="Trending Now" subtitle="Tools gaining popularity this week" />}>
            <FeaturedTools
              tools={trendingTools}
              categories={categories}
              title="Trending Now"
              subtitle="Tools gaining popularity this week"
            />
          </Suspense>
        )
      )}

      {showRecentSectionSkeleton ? (
        <ToolsSectionSkeleton title="Recently Added" subtitle="Fresh tools just added to the platform" />
      ) : (
        <Suspense fallback={<ToolsSectionSkeleton title="Recently Added" subtitle="Fresh tools just added to the platform" />}>
          <FeaturedTools
            tools={recentTools}
            categories={categories}
            title="Recently Added"
            subtitle="Fresh tools just added to the platform"
          />
        </Suspense>
      )}
    </div>
  )
}
