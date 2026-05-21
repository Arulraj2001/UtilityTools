import React, { useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Search,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'

import { useJobs, useFeaturedJobs } from '@/hooks/jobs/useJobs'

import JobCard from '@/components/jobs/JobCard'
import FeaturedJobs from '@/components/jobs/FeaturedJobs'
import { JobListSkeleton } from '@/components/jobs/skeletons'
import { JobsEmptyState, SearchResultsEmptyState } from '@/components/jobs/empty-states'

export default function JobsListPage() {
  const [search, setSearch] = useState('')

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
  } = useJobs({ search })

  const { data: featured = [] } = useFeaturedJobs()

  const results = useMemo(() => jobs || [], [jobs])

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 blur-3xl rounded-full opacity-30" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Latest opportunities updated regularly
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Find Jobs,
              <span className="block text-primary">
                Internships & Government Openings
              </span>
            </h1>

            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
              Discover government jobs, fresher openings, internships,
              and career opportunities with related tools, workflows,
              and application support.
            </p>

            {/* SEARCH */}
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs, organizations, categories..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm"
                />
              </div>
            </div>

            {/* STATS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/60 backdrop-blur-sm text-xs">
                <BriefcaseBusiness className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">
                  {results.length} Jobs Available
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/60 backdrop-blur-sm text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">
                  Government + Private Opportunities
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/60 backdrop-blur-sm text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">
                  Application Support Workflows
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* JOB LIST */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Latest Jobs
                </h2>

                <p className="text-xs text-muted-foreground mt-1">
                  Browse curated opportunities and application-ready resources.
                </p>
              </div>
            </div>

            {isLoading ? (
              <JobListSkeleton count={5} />
            ) : isError ? (
              <div className="p-6 rounded-2xl border bg-card text-center">
                <p className="text-destructive font-medium text-sm">
                  Failed to load jobs
                </p>

                <p className="text-xs text-muted-foreground mt-2">
                  {error?.message || 'Something went wrong while loading jobs.'}
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : search.trim() ? (
              <SearchResultsEmptyState query={search} onClear={() => setSearch('')} />
            ) : (
              <JobsEmptyState />
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-5">
            <FeaturedJobs jobs={featured} />

            <div className="rounded-2xl border bg-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl rounded-full" />

              <div className="relative z-10">
                <h3 className="font-bold text-base">
                  Application Support
                </h3>

                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Use our image resizers, PDF tools, and workflow guides
                  to prepare documents for government and private job applications.
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Passport Photo Resizer
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Compress PDF Below 200KB
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Signature Resize Tools
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}