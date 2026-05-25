import React from 'react'
import { TrendingUp, Eye, MousePointerClick, Zap } from 'lucide-react'
import { useMostViewedJobs, useMostAppliedJobs, useTrendingJobs, useJobsAnalyticsSummary } from '@/hooks/jobs/useJobAnalytics'

function StatCard({ icon: Icon, label, value, change, loading }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {change !== undefined && (
          <div className="text-xs font-semibold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
            +{(change * 100).toFixed(0)}%
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>

      {loading ? (
        <div className="h-8 w-16 bg-border/50 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold tracking-tight">{value || 0}</p>
      )}
    </div>
  )
}

function JobsList({ title, jobs, icon: Icon, loading, emptyText }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
        ) : jobs && jobs.length > 0 ? (
          jobs.map((job, i) => (
            <div
              key={job.id || i}
              className="px-5 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium line-clamp-1">{job.title}</p>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                {job.views_count !== undefined && (
                  <span>{job.views_count} views</span>
                )}
                {job.apply_clicks !== undefined && (
                  <span> • {job.apply_clicks} applies</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {emptyText || 'No data available'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function JobAnalyticsDashboard() {
  const { data: summary, isLoading: summaryLoading } = useJobsAnalyticsSummary()
  const { data: mostViewed, isLoading: viewedLoading } = useMostViewedJobs({ limit: 5 })
  const { data: mostApplied, isLoading: appliedLoading } = useMostAppliedJobs({ limit: 5 })
  const { data: trending, isLoading: trendingLoading } = useTrendingJobs({ limit: 5 })

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h2 className="text-lg font-bold mb-4">Analytics Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Eye}
            label="Total Views"
            value={summary?.totalViews?.toLocaleString()}
            loading={summaryLoading}
          />
          <StatCard
            icon={MousePointerClick}
            label="Total Applies"
            value={summary?.totalApplies?.toLocaleString()}
            loading={summaryLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Views/Job"
            value={summary?.averageViewsPerJob?.toFixed(1)}
            loading={summaryLoading}
          />
          <StatCard
            icon={Zap}
            label="Conversion Rate"
            value={`${(summary?.conversionRate * 100 || 0).toFixed(1)}%`}
            loading={summaryLoading}
          />
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <JobsList
          title="Most Viewed Jobs"
          jobs={mostViewed}
          icon={Eye}
          loading={viewedLoading}
          emptyText="No view data yet"
        />
        <JobsList
          title="Most Applied Jobs"
          jobs={mostApplied}
          icon={MousePointerClick}
          loading={appliedLoading}
          emptyText="No application data yet"
        />
        <JobsList
          title="Trending Jobs (24h)"
          jobs={trending}
          icon={TrendingUp}
          loading={trendingLoading}
          emptyText="No recent activity"
        />
      </div>
    </div>
  )
}
