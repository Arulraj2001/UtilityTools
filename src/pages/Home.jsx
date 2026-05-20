import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getTools, getCategories, getTotalUsageCount, getFeaturedWorkflows } from '@/api/supabaseApi'
import HeroSection from '../components/home/HeroSection'
import StatsBar from '../components/home/StatsBar'
import CategoriesGrid from '../components/home/CategoriesGrid'
import FeaturedTools from '../components/home/FeaturedTools'
import PopularWorkflows from '../components/home/PopularWorkflows'
import AdBanner from '../components/shared/AdBanner'

export default function Home() {
  const {
    data: tools = [],
    isLoading: isLoadingTools,
    error: toolsError,
  } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false }),
    retry: false,
  })

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

  const featuredTools = tools.filter(t => t.is_featured)
  const trendingTools = tools.filter(t => t.is_trending)
  const recentTools = tools.slice(0, 8)

  if (isLoadingTools || isLoadingCategories || isLoadingUsage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading homepage data…</p>
      </div>
    )
  }

  if (toolsError || categoriesError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4 text-center">
        <h2 className="text-2xl font-semibold mb-3">Unable to load homepage data</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          {toolsError?.message || categoriesError?.message || 'There was an issue loading site data. Please try refreshing the page.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <HeroSection toolCount={tools.length} />
      <StatsBar toolCount={tools.length} userCount={totalUsage} />
      <CategoriesGrid categories={categories} tools={tools} />
      <FeaturedTools
        tools={featuredTools.length > 0 ? featuredTools : recentTools.slice(0, 4)}
        categories={categories}
        title="Featured Tools"
        subtitle="Our most popular and highly rated tools"
      />
      <AdBanner placement="in_content" pageType="home" className="py-6" />
      {featuredWorkflows.length > 0 && (
        <PopularWorkflows workflows={featuredWorkflows} />
      )}
      {trendingTools.length > 0 && (
        <FeaturedTools
          tools={trendingTools}
          categories={categories}
          title="Trending Now"
          subtitle="Tools gaining popularity this week"
        />
      )}
      <FeaturedTools
        tools={recentTools}
        categories={categories}
        title="Recently Added"
        subtitle="Fresh tools just added to the platform"
      />
    </div>
  )
}
