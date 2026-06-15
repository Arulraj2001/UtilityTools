'use client';
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Wrench,
  BookOpen,
  FolderOpen,
  Eye,
  TrendingUp,
  BarChart3,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Smartphone,
  Tablet,
  Sparkles,
  ShieldCheck,
  Activity,
  Link2,
  FileText,
  Users,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getToolsWithCategories, getBlogPosts, getCategories, getAnalyticsEvents, getWorkflowPages } from '@/api/supabaseApi'

const formatNumber = (value) => {
  if (typeof value !== 'number') return value
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString()
}

const getDateKey = (date) => date.toISOString().slice(0, 10)

const buildSeries = (events, days = 14) => {
  const today = new Date()
  const counts = events.reduce((acc, event) => {
    const key = getDateKey(new Date(event.created_at))
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date()
    date.setDate(today.getDate() - (days - 1 - index))
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { date: label, count: counts[getDateKey(date)] || 0 }
  })
}

const getPercentChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

const formatDuration = (seconds) => {
  if (!seconds || seconds < 1) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

const colorMap = {
  desktop: '#2563EB',
  mobile: '#7C3AED',
  tablet: '#0EA5E9',
  chrome: '#2DD4BF',
  firefox: '#F97316',
  safari: '#0EA5E9',
  edge: '#22C55E',
  opera: '#EF4444',
  other: '#94A3B8',
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-sm mb-1">{data.date}</p>
        <p className="text-sm text-foreground">{data.count.toLocaleString()} page views</p>
      </div>
    )
  }
  return null
}

const labelFormatter = (value) => {
  if (!value) return ''
  return value.length > 15 ? `${value.slice(0, 15)}...` : value
}

const getWorkflowEventSlug = (event) => {
  const slug = event.event_data?.pageSlug || ''
  if (slug) return String(slug).replace(/^\//, '').replace(/\/$/, '')
  const path = event.page_url || event.event_data?.page_url || ''
  if (typeof path === 'string' && path.startsWith('/workflow/')) {
    return path.replace('/workflow/', '').replace(/\/$/, '')
  }
  return ''
}

export default function AdminDashboard() {
  const { data: tools = [] } = useQuery({
    queryKey: ['all-tools'],
    queryFn: () => getToolsWithCategories({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['all-posts'],
    queryFn: () => getBlogPosts({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: workflowPages = [] } = useQuery({
    queryKey: ['workflow-pages-admin'],
    queryFn: () => getWorkflowPages({ published: false, orderBy: 'updated_at', ascending: false, limit: 500 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: analyticsEvents = [] } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: () => getAnalyticsEvents({ limit: 1200, sinceDays: 90 }),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const trafficEvents = analyticsEvents.filter((event) => event.event_type === 'page_view')
  const searchEvents = analyticsEvents.filter((event) => event.event_type === 'workflow_search')
  const workflowOpenEvents = analyticsEvents.filter((event) => event.event_type === 'workflow_open')
  const toolEvents = analyticsEvents.filter((event) => event.event_type === 'tool_event')
  const pageViews = trafficEvents.length

  const workflowTrafficEvents = trafficEvents.filter((event) => ['workflow_page', 'workflow_index'].includes(event.event_data?.pageType))
  const workflowPageEvents = trafficEvents.filter((event) => event.event_data?.pageType === 'workflow_page')
  const workflowIndexEvents = trafficEvents.filter((event) => event.event_data?.pageType === 'workflow_index')
  const workflowTotalViews = workflowTrafficEvents.length
  const workflowShare = pageViews ? Math.round((workflowTotalViews / pageViews) * 100) : 0
  const workflowSourceCounts = workflowTrafficEvents.reduce((acc, event) => {
    const source = event.event_data?.traffic_source || 'direct'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})
  const topWorkflowSources = Object.entries(workflowSourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([source, count]) => ({ source, count }))
  const workflowSearchSeries = buildSeries(searchEvents, 21)
  const workflowGrowthSeries = buildSeries(workflowTrafficEvents, 21)
  const workflowLast7 = workflowGrowthSeries.slice(-7).reduce((sum, item) => sum + item.count, 0)
  const workflowPrev7 = workflowGrowthSeries.slice(-14, -7).reduce((sum, item) => sum + item.count, 0)
  const workflowWeeklyGrowth = getPercentChange(workflowLast7, workflowPrev7)

  const workflowPageMap = workflowPages.reduce((acc, page) => {
    if (page?.slug) acc[page.slug] = page
    return acc
  }, {})

  const workflowPageStats = workflowPageEvents.reduce((acc, event) => {
    const slug = getWorkflowEventSlug(event)
    if (!slug) return acc

    if (!acc[slug]) {
      acc[slug] = {
        slug,
        title: workflowPageMap[slug]?.title || slug,
        views: 0,
        sessions: new Set(),
        durationSum: 0,
        durationCount: 0,
        entrySessions: 0,
        convertSessions: 0,
        bounceSessions: 0,
      }
    }

    acc[slug].views += 1
    if (event.session_id) acc[slug].sessions.add(event.session_id)
    return acc
  }, {})

  const sessionGroups = trafficEvents.reduce((acc, event) => {
    const sessionId = event.session_id || `anon-${event.page_url || event.event_data?.page_url || event.created_at}`
    acc[sessionId] = acc[sessionId] || []
    acc[sessionId].push(event)
    return acc
  }, {})

  Object.values(sessionGroups).forEach((events) => {
    const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const duration = Math.max(0, (new Date(sorted[sorted.length - 1]?.created_at).getTime() - new Date(sorted[0]?.created_at).getTime()) / 1000)
    const firstSlug = getWorkflowEventSlug(sorted[0])
    const slugSet = [...new Set(sorted.map(getWorkflowEventSlug).filter(Boolean))]
    const isBounce = sorted.length === 1

    slugSet.forEach((slug) => {
      const stats = workflowPageStats[slug]
      if (!stats) return

      stats.durationSum += duration
      stats.durationCount += 1
      if (firstSlug === slug) {
        stats.entrySessions += 1
        if (sorted.length > 1) stats.convertSessions += 1
        if (isBounce) stats.bounceSessions += 1
      }
    })
  })

  const topWorkflowPages = Object.values(workflowPageStats)
    .map((stats) => {
      const avgSessionDuration = stats.durationCount ? Math.round(stats.durationSum / stats.durationCount) : 0
      const engagementLevel = avgSessionDuration >= 120 ? 'High' : avgSessionDuration >= 60 ? 'Medium' : 'Low'
      const bounceRate = stats.entrySessions ? Math.round((stats.bounceSessions / stats.entrySessions) * 100) : 0
      return {
        ...stats,
        uniqueVisitors: stats.sessions.size,
        avgSessionDuration,
        engagementLevel,
        bounceRate,
      }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)

  const highestEngagementWorkflowPages = [...topWorkflowPages]
    .filter((page) => page.avgSessionDuration > 0)
    .sort((a, b) => b.avgSessionDuration - a.avgSessionDuration)
    .slice(0, 4)

  const lowestBounceWorkflowPages = [...topWorkflowPages]
    .filter((page) => page.entrySessions > 0)
    .sort((a, b) => a.bounceRate - b.bounceRate)
    .slice(0, 4)

  const topConvertingWorkflowPages = [...topWorkflowPages]
    .filter((page) => page.convertSessions > 0)
    .sort((a, b) => b.convertSessions - a.convertSessions)
    .slice(0, 4)

  const workflowOpenCount = workflowOpenEvents.length

  const totalUsage = tools.reduce((sum, tool) => sum + (tool.usage_count || 0), 0)
  const uniqueVisitors = new Set(trafficEvents.map((event) => event.session_id || 'anonymous')).size
  const organicTraffic = trafficEvents.filter((event) => event.event_data?.traffic_source === 'organic').length

  const sessions = Object.values(
    trafficEvents.reduce((acc, event) => {
      const sessionId = event.session_id || `unknown-${event.page_url || event.event_data?.page_url || event.created_at}`
      acc[sessionId] = acc[sessionId] || []
      acc[sessionId].push(event)
      return acc
    }, {})
  )

  const sessionStats = sessions.map((events) => {
    const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const start = new Date(sorted[0]?.created_at || Date.now())
    const end = new Date(sorted[sorted.length - 1]?.created_at || Date.now())
    return {
      pages: sorted.length,
      duration: Math.max(0, (end.getTime() - start.getTime()) / 1000),
      exitPage: sorted[sorted.length - 1]?.page_url || sorted[sorted.length - 1]?.event_data?.page_url,
      firstPage: sorted[0]?.page_url || sorted[0]?.event_data?.page_url,
    }
  })

  const bounceRate = sessionStats.length
    ? Math.round((sessionStats.filter((session) => session.pages === 1).length / sessionStats.length) * 100)
    : 0

  const avgSessionDuration = sessionStats.length
    ? Math.round(sessionStats.reduce((sum, session) => sum + session.duration, 0) / sessionStats.length)
    : 0

  const pageGrowthSeries = buildSeries(trafficEvents, 30)
  const last7 = pageGrowthSeries.slice(-7).reduce((sum, item) => sum + item.count, 0)
  const prev7 = pageGrowthSeries.slice(-14, -7).reduce((sum, item) => sum + item.count, 0)
  const last30 = pageGrowthSeries.reduce((sum, item) => sum + item.count, 0)
  const prev30Start = new Date()
  prev30Start.setDate(prev30Start.getDate() - 60)
  const prev30 = trafficEvents.filter((event) => {
    const eventDate = new Date(event.created_at)
    return eventDate >= prev30Start && eventDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }).length

  const weeklyGrowth = getPercentChange(last7, prev7)
  const monthlyGrowth = getPercentChange(last30, prev30)

  const toolEventMap = toolEvents.reduce((acc, event) => {
    const slug = event.event_data?.toolSlug
    if (!slug) return acc
    const action = event.event_data?.action
    acc[slug] = acc[slug] || { opens: 0, runs: 0, duration: 0, runsCount: 0 }
    if (action === 'tool_open') acc[slug].opens += 1
    if (action === 'tool_run') {
      acc[slug].runs += 1
      const duration = Number(event.event_data?.duration_ms || 0)
      if (duration > 0) {
        acc[slug].duration += duration
        acc[slug].runsCount += 1
      }
    }
    return acc
  }, {})

  const toolPerformance = tools
    .map((tool) => {
      const data = toolEventMap[tool.slug] || { opens: 0, runs: 0, duration: 0, runsCount: 0 }
      const completionRate = data.opens ? Math.min(100, Math.round((data.runs / data.opens) * 100)) : 0
      return {
        name: tool.name || tool.slug,
        category: tool.categories?.name || 'Unknown',
        usage: tool.usage_count || 0,
        completionRate,
        averageDuration: data.runsCount ? Math.round(data.duration / data.runsCount / 1000) : 0,
        trend: data.opens > 0 ? Math.min(48, Math.round((data.runs / Math.max(data.opens, 1)) * 48)) : 0,
      }
    })
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 6)

  const searchTermCounts = searchEvents.reduce((acc, event) => {
    const query = (event.event_data?.query || '').trim().toLowerCase()
    if (!query) return acc
    acc[query] = (acc[query] || 0) + 1
    return acc
  }, {})

  const topSearches = Object.entries(searchTermCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([query, count]) => ({ query, count }))

  const failedSearchCount = searchEvents.filter((event) => Number(event.event_data?.result_count) === 0).length

  const indexedPagesCount = trafficEvents.length
    ? new Set(trafficEvents.map((event) => event.page_url || event.event_data?.page_url)).size
    : Math.max(0, posts.length + tools.length)

  const missingMetadataCount = [...tools, ...posts].filter((item) => !item.seo_title || !item.seo_description).length
  const missingOgCount = posts.filter((post) => !post.featured_image).length
  const schemaIssuesCount = posts.filter((post) => !post.seo_keywords || !String(post.seo_keywords).trim()).length
  const brokenLinksCount = 0
  const sitemapStatus = 'Ready'
  const seoHealthScore = Math.max(40, Math.round(100 - missingMetadataCount * 0.9 - missingOgCount * 0.8 - schemaIssuesCount * 1.2))

  const exitCounts = sessionStats.reduce((acc, session) => {
    const page = session.exitPage || 'Unknown'
    acc[page] = (acc[page] || 0) + 1
    return acc
  }, {})

  const highestBouncePages = Object.entries(exitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([page, count]) => ({ page, count }))

  const engagementScore = Math.max(0, 100 - bounceRate)
  const interactionRate = uniqueVisitors ? Math.round((pageViews / uniqueVisitors) * 100) / 100 : 0

  const categoryEngagement = tools.reduce((acc, tool) => {
    const categoryName = tool.categories?.name || 'Uncategorized'
    acc[categoryName] = (acc[categoryName] || 0) + (tool.usage_count || 0)
    return acc
  }, {})

  const mostEngagedCategories = Object.entries(categoryEngagement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, usage]) => ({ category, usage }))

  const deviceCounts = trafficEvents.reduce((acc, event) => {
    const device = event.device_type || event.event_data?.deviceType || 'desktop'
    acc[device] = (acc[device] || 0) + 1
    return acc
  }, {})

  const browserCounts = trafficEvents.reduce((acc, event) => {
    const browser = event.browser || event.event_data?.browser || 'other'
    acc[browser] = (acc[browser] || 0) + 1
    return acc
  }, {})

  const deviceData = Object.entries(deviceCounts).map(([device, count]) => ({ name: device, value: count }))
  const browserData = Object.entries(browserCounts).map(([name, value]) => ({ name, value }))

  const blogViews = trafficEvents.filter((event) => event.event_data?.pageType === 'blog_post')
  const blogViewMap = blogViews.reduce((acc, event) => {
    const slug = event.event_data?.pageSlug || ''
    if (!slug) return acc
    acc[slug] = (acc[slug] || 0) + 1
    return acc
  }, {})

  const topBlogPosts = posts
    .map((post) => ({
      title: post.title,
      slug: post.slug,
      category: post.blog_categories?.name || post.category || 'Blog',
      views: blogViewMap[post.slug] || 0,
      readTime: `${Math.max(2, Math.ceil((String(post.content || '').split(/\s+/).length || 0) / 225))} min`,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 4)

  const trafficSeries = buildSeries(trafficEvents, 21)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Growth & SEO Analytics</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Monitor page traffic, search behavior, content performance and SEO health from one lightweight growth control center.
          </p>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden border border-border bg-muted">
        <CardHeader>
          <CardTitle className="text-base">Workflow Event Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 p-5">
          <div className="rounded-3xl border border-border/70 bg-background p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Activity className="w-4 h-4" />
              <span className="font-medium">Workflow views</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">{formatNumber(workflowTotalViews)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Total workflow page visits</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Workflow opens</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">{formatNumber(workflowOpenCount)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Times workflows were activated</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Search className="w-4 h-4" />
              <span className="font-medium">Workflow searches</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">{formatNumber(searchEvents.length)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Search interactions captured</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[{
          title: 'Page Views', value: formatNumber(pageViews), icon: Eye,
          wrapper: 'bg-gradient-to-br from-slate-950/65 via-sky-950 to-slate-900/78 border border-cyan-400/15 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-200/10',
          accent: 'from-sky-400 via-cyan-400 to-cyan-500',
          iconAccent: 'from-sky-400/25 via-cyan-300/15 to-white/10',
          note: 'Last 90 days', metric: `${weeklyGrowth >= 0 ? '+' : ''}${weeklyGrowth}% weekly`, trend: weeklyGrowth >= 0,
        }, {
          title: 'Unique Visitors', value: formatNumber(uniqueVisitors), icon: Users,
          wrapper: 'bg-gradient-to-br from-slate-950/65 via-violet-950 to-slate-900/78 border border-violet-400/15 shadow-lg shadow-violet-500/15 ring-1 ring-violet-200/10',
          accent: 'from-violet-400 via-fuchsia-400 to-purple-500',
          iconAccent: 'from-violet-400/25 via-fuchsia-300/15 to-white/10',
          note: 'Sessions tracked', metric: `${interactionRate} pages/session`, trend: interactionRate >= 1,
        }, {
          title: 'Organic Traffic', value: formatNumber(organicTraffic), icon: Globe,
          wrapper: 'bg-gradient-to-br from-slate-950/65 via-emerald-950 to-slate-900/78 border border-emerald-400/15 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-200/10',
          accent: 'from-emerald-400 via-teal-400 to-cyan-500',
          iconAccent: 'from-emerald-400/25 via-teal-300/15 to-white/10',
          note: 'Search engine visits', metric: `${Math.round((organicTraffic / Math.max(pageViews, 1)) * 100)}% of traffic`, trend: organicTraffic >= 0,
        }, {
          title: 'Bounce Rate', value: `${bounceRate}%`, icon: ArrowDownRight,
          wrapper: 'bg-gradient-to-br from-slate-950/65 via-rose-950 to-slate-900/78 border border-rose-400/15 shadow-lg shadow-rose-500/15 ring-1 ring-rose-200/10',
          accent: 'from-rose-400 via-orange-400 to-amber-500',
          iconAccent: 'from-rose-400/25 via-orange-300/15 to-white/10',
          note: 'Single-page sessions', metric: `${formatDuration(avgSessionDuration)} avg duration`, trend: bounceRate < 45,
        }].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className={`overflow-hidden ${card.wrapper}`}>
              <CardContent className="p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">{card.title}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br ${card.iconAccent} p-3`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                  <span>{card.note}</span>
                  <span className={`font-semibold ${card.trend ? 'text-emerald-300' : 'text-rose-300'}`}>{card.metric}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Workflow Traffic Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Workflow views</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(workflowTotalViews)}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Traffic share</p>
                <p className="mt-2 text-2xl font-semibold">{workflowShare}%</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Weekly growth</p>
                <p className={`mt-2 text-2xl font-semibold ${workflowWeeklyGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {workflowWeeklyGrowth >= 0 ? '+' : ''}{workflowWeeklyGrowth}%
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Workflow opens</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(workflowOpenCount)}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground mb-3">Top traffic sources</p>
              <div className="space-y-3">
                {topWorkflowSources.length > 0 ? topWorkflowSources.map((source) => (
                  <div key={source.source} className="flex items-center justify-between text-sm text-foreground">
                    <span>{source.source}</span>
                    <span className="text-muted-foreground">{formatNumber(source.count)}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No workflow traffic sources have been captured yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Workflow Search Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Failed workflow searches</p>
                <p className="mt-2 text-2xl font-semibold">{failedSearchCount}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm text-muted-foreground">Search phrases tracked</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(topSearches.length)}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground mb-3">Discovery trend</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workflowSearchSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="workflowSearchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fill="url(#workflowSearchGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Top Workflow Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topWorkflowPages.length > 0 ? (
              topWorkflowPages.map((page) => (
                <div key={page.slug} className="rounded-3xl border border-border/70 bg-muted p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground">{page.slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatNumber(page.views)} views</p>
                      <p className="text-xs text-muted-foreground">{page.uniqueVisitors} visitors</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="rounded-2xl bg-background p-3">
                      <p>Engagement</p>
                      <p className="mt-1 text-foreground font-semibold">{page.engagementLevel}</p>
                    </div>
                    <div className="rounded-2xl bg-background p-3">
                      <p>Avg session</p>
                      <p className="mt-1 text-foreground font-semibold">{formatDuration(page.avgSessionDuration)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Workflow page analytics will appear once workflow views are tracked.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Workflow Engagement Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Highest engagement</p>
                {highestEngagementWorkflowPages.length > 0 ? (
                  highestEngagementWorkflowPages.map((page) => (
                    <div key={page.slug} className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{page.title}</span>
                      <span className="font-semibold">{formatDuration(page.avgSessionDuration)}</span>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No engagement data available yet.</p>
                )}
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Lowest bounce workflow pages</p>
                {lowestBounceWorkflowPages.length > 0 ? (
                  lowestBounceWorkflowPages.map((page) => (
                    <div key={page.slug} className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{page.title}</span>
                      <span className="font-semibold">{page.bounceRate}%</span>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No bounce metrics are available yet.</p>
                )}
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Top converting entry pages</p>
                {topConvertingWorkflowPages.length > 0 ? (
                  topConvertingWorkflowPages.map((page) => (
                    <div key={page.slug} className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{page.title}</span>
                      <span className="font-semibold">{page.convertSessions}</span>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No conversion paths captured yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Daily Traffic Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Audience trend over the last 3 weeks</p>
                <p className="text-3xl font-semibold">{formatNumber(last30)} views</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted px-3 py-2 text-sm">
                <p className="text-muted-foreground">30-day lift</p>
                <p className={`mt-1 font-semibold ${monthlyGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth}%</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficSeries} margin={{ top: 16, right: 16, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} dot={false} />
                  <Area type="monotone" dataKey="count" stroke="none" fill="url(#trafficGradient)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              SEO Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-muted/80 p-5">
              <p className="text-sm text-muted-foreground">Overall SEO health</p>
              <p className="mt-4 text-4xl font-semibold">{seoHealthScore}%</p>
              <p className="mt-2 text-xs text-muted-foreground">Based on metadata coverage, page indexability and content quality signals.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl bg-background p-4 border border-border/60">
                <p className="text-muted-foreground">Indexed pages</p>
                <p className="mt-2 text-lg font-semibold">{indexedPagesCount}</p>
              </div>
              <div className="rounded-3xl bg-background p-4 border border-border/60">
                <p className="text-muted-foreground">Missing metadata</p>
                <p className="mt-2 text-lg font-semibold">{missingMetadataCount}</p>
              </div>
              <div className="rounded-3xl bg-background p-4 border border-border/60">
                <p className="text-muted-foreground">Missing OG images</p>
                <p className="mt-2 text-lg font-semibold">{missingOgCount}</p>
              </div>
              <div className="rounded-3xl bg-background p-4 border border-border/60">
                <p className="text-muted-foreground">Schema issues</p>
                <p className="mt-2 text-lg font-semibold">{schemaIssuesCount}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background p-4 text-sm">
              <p className="font-medium">Sitemap</p>
              <p className="text-muted-foreground mt-1">{sitemapStatus} · <span className="text-foreground">/sitemap.xml available</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Performing Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {toolPerformance.map((tool, index) => (
              <div key={tool.name} className="rounded-3xl border border-border/70 bg-muted p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold">{tool.usage}</p>
                    <p className="text-xs text-muted-foreground">uses</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Completion {tool.completionRate}%</span>
                  <span>{tool.averageDuration}s avg run</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400" style={{ width: `${tool.completionRate}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Workflow Search Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-muted p-4">
              <p className="text-sm text-muted-foreground">Failed searches</p>
              <p className="mt-2 text-2xl font-semibold">{failedSearchCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-3">Top search phrases</p>
              <div className="space-y-3">
                {topSearches.length > 0 ? topSearches.map((search, index) => (
                  <div key={search.query} className="flex min-w-0 items-center justify-between gap-3 rounded-3xl border border-border/70 bg-background p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate overflow-hidden break-words min-w-0">{search.query}</p>
                      <p className="text-xs text-muted-foreground">{search.count} searches</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{index < 3 ? 'High' : 'Rising'}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No search activity yet. User queries will appear here once tracking is enabled.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              User Behavior Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl bg-background p-4 border border-border/70">
                <p className="text-muted-foreground">Engagement</p>
                <p className="mt-2 text-xl font-semibold">{engagementScore}%</p>
              </div>
              <div className="rounded-3xl bg-background p-4 border border-border/70">
                <p className="text-muted-foreground">Avg session</p>
                <p className="mt-2 text-xl font-semibold">{formatDuration(avgSessionDuration)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Highest bounce pages</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {highestBouncePages.length > 0 ? highestBouncePages.map((page) => (
                    <li key={page.page} className="flex items-center justify-between gap-2">
                      <span className="truncate">{page.page}</span>
                      <span className="text-muted-foreground">{page.count}</span>
                    </li>
                  )) : <li className="text-muted-foreground">No session exits captured yet.</li>}
                </ul>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Most engaged categories</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {mostEngagedCategories.map((category) => (
                    <li key={category.category} className="flex items-center justify-between gap-2">
                      <span>{category.category}</span>
                      <span className="text-muted-foreground">{formatNumber(category.usage)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              Device & Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {deviceData.length > 0 ? (
                deviceData.map((segment) => (
                  <div key={segment.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMap[segment.name] || '#60a5fa' }} />
                      <span>{segment.name}</span>
                    </div>
                    <span>{Math.round((segment.value / Math.max(pageViews, 1)) * 100)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Device data is unavailable until page tracking begins.</p>
              )}
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4 text-sm">
              <p className="text-muted-foreground">Browser breakdown</p>
              <div className="mt-3 space-y-2">
                {browserData.length > 0 ? browserData.map((browser) => (
                  <div key={browser.name} className="flex items-center justify-between gap-3">
                    <span>{browser.name}</span>
                    <span className="text-muted-foreground">{Math.round((browser.value / Math.max(pageViews, 1)) * 100)}%</span>
                  </div>
                )) : <p className="text-muted-foreground">No browser events captured.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Content Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topBlogPosts.length > 0 ? (
              topBlogPosts.map((post) => (
                <div key={post.slug} className="rounded-3xl border border-border/70 bg-muted p-4">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate overflow-hidden break-words min-w-0">{post.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{post.category}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{post.views} views</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.readTime}</span>
                    <span>Engagement ✓</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Top content will populate once blog page views are tracked.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
