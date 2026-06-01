import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BriefcaseBusiness,
  Search,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'

import { useJobs, useFeaturedJobs } from '@/hooks/jobs/useJobs'
import { useSiteBooleanSetting } from '@/hooks/useSiteSettings'
import JobsFilterSidebar from '@/components/jobs/JobsFilterSidebar'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet'

import { Button } from '@/components/ui/button'

import JobCard from '@/components/jobs/JobCard'
import FeaturedJobs from '@/components/jobs/FeaturedJobs'

import { JobListSkeleton } from '@/components/jobs/skeletons'

import {
  JobsEmptyState,
  SearchResultsEmptyState,
} from '@/components/jobs/empty-states'

export default function JobsListPage() {
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { value: jobsEnabled = true } = useSiteBooleanSetting('jobs_enabled', true)

  const categoryParam =
    searchParams.get('category') || undefined

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
  } = useJobs({
    search,
    category: categoryParam,
    enabled: jobsEnabled,
  })

  const { data: featured = [] } = useFeaturedJobs()

  const activeQuickFilters = useMemo(
    () =>
      [
        { key: 'featured', label: 'Featured' },
        { key: 'recent', label: 'Recent' },
        { key: 'freshers', label: 'Freshers' },
        { key: 'remote', label: 'Remote' },
        { key: 'government', label: 'Government' },
        { key: 'private', label: 'Private' },
        { key: 'tech', label: 'IT' },
      ]
        .filter((item) => searchParams.has(item.key))
        .map((item) => item.label),
    [searchParams]
  )

  const results = useMemo(() => {
    const filters = {
      featured: searchParams.has('featured'),
      recent: searchParams.has('recent'),
      freshers: searchParams.has('freshers'),
      remote: searchParams.has('remote'),
      government: searchParams.has('government'),
      private: searchParams.has('private'),
      tech: searchParams.has('tech'),
    }

    return (jobs || []).filter((job) => {
      const normalized = (value) =>
        String(value || '').toLowerCase()

      const tags = Array.isArray(job.tags)
        ? job.tags.map((tag) => normalized(tag))
        : []

      const tagString = tags.join(' ')

      if (filters.featured && !job.featured) {
        return false
      }

      if (filters.recent) {
        const dateValue =
          job.created_at ||
          job.last_date ||
          job.application_start_date

        const date = dateValue
          ? new Date(dateValue)
          : null

        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)

        if (
          !date ||
          Number.isNaN(date.getTime()) ||
          date < cutoff
        ) {
          return false
        }
      }

      if (
        filters.freshers &&
        !(
          normalized(job.experience).includes(
            'fresher'
          ) || tagString.includes('fresh')
        )
      ) {
        return false
      }

      if (
        filters.remote &&
        !(
          normalized(job.location).includes(
            'remote'
          ) || tagString.includes('remote')
        )
      ) {
        return false
      }

      if (
        filters.government &&
        !(
          normalized(job.category).includes(
            'government'
          ) ||
          normalized(job.organization).includes(
            'government'
          ) ||
          tagString.includes('government') ||
          tagString.includes('gov')
        )
      ) {
        return false
      }

      if (
        filters.private &&
        !(
          normalized(job.category).includes(
            'private'
          ) ||
          normalized(job.organization).includes(
            'private'
          ) ||
          tagString.includes('private')
        )
      ) {
        return false
      }

      if (
        filters.tech &&
        !(
          normalized(job.category).includes('tech') ||
          normalized(job.job_type).includes('tech') ||
          tagString.includes('tech') ||
          normalized(job.title).includes('tech')
        )
      ) {
        return false
      }

      return true
    })
  }, [jobs, searchParams])

  if (!jobsEnabled) {
    return (
      <main className="min-h-screen bg-background">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                Temporary Notice
              </span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Job Listings Temporarily Unavailable
            </h2>

            <p className="text-muted-foreground mt-4 text-base">
              We are currently updating and reviewing job listings to ensure
              quality and accuracy.
            </p>

            <p className="text-muted-foreground mt-2 text-sm">
              Please check back later for new opportunities.
            </p>
          </div>
        </section>
      </main>
    )
  }
  return (
    <main className="min-h-screen bg-background">
      
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-primary/10 blur-3xl rounded-full opacity-30" />

        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          
          <div className="max-w-4xl">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm mb-5">
              <Sparkles className="w-4 h-4" />
              Latest opportunities updated regularly
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Find Jobs,
              <span className="block text-primary">
                Internships & Government Openings
              </span>
            </h1>

            <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-3xl">
              Discover government jobs, fresher openings,
              internships, and career opportunities with
              related tools, workflows, and application
              support.
            </p>

            {/* SEARCH */}
            <div className="mt-7">
              
              <div className="relative">
                
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search jobs, organizations, categories..."
                  className="w-full h-13 pl-14 pr-5 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm"
                />
              </div>
            </div>

            {/* ACTIVE FILTERS */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              
              {categoryParam ? (
                <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium bg-card text-muted-foreground">
                  Category: {categoryParam}
                </span>
              ) : null}

              {activeQuickFilters.map((filter) => (
                <span
                  key={filter}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium bg-card text-muted-foreground"
                >
                  {filter}
                </span>
              ))}
            </div>

            {/* MOBILE FILTER BUTTON */}
            <Button
              variant="secondary"
              className="xl:hidden fixed bottom-4 right-4 z-40 rounded-full px-4 py-5 shadow-xl"
              onClick={() =>
                setIsFilterOpen(true)
              }
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>

            {/* STATS */}
            <div className="mt-7 flex flex-wrap gap-3">
              
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-card/60 backdrop-blur-sm text-sm">
                <BriefcaseBusiness className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  {results.length} Jobs Available
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-card/60 backdrop-blur-sm text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Government + Private Opportunities
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-card/60 backdrop-blur-sm text-sm">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Application Support Workflows
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <Sheet
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
        >
          <SheetContent
            side="bottom"
            className="max-w-full h-full pt-4"
          >
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold">
                Filters
              </SheetTitle>
            </SheetHeader>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Adjust category and quick filters
                for jobs.
              </p>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-14rem)] pb-28">
              <JobsFilterSidebar
                onClear={() =>
                  setIsFilterOpen(false)
                }
              />
            </div>

            <SheetFooter className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 p-4 backdrop-blur-xl">
              
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setIsFilterOpen(false)
                  }
                >
                  Clear Filters
                </Button>

                <Button
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setIsFilterOpen(false)
                  }
                >
                  Apply Filters
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1.2fr)_320px] gap-6">
          
          {/* FILTER SIDEBAR */}
          <aside className="hidden xl:block">
            <div className="sticky top-28 rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <JobsFilterSidebar />
            </div>
          </aside>

          {/* JOB LIST */}
          <div className="min-w-0">
            
            <div className="xl:hidden mb-6">
              <FeaturedJobs jobs={featured} />
            </div>

            <div className="flex items-center justify-between mb-5">
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Latest Jobs
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  Browse curated opportunities and
                  application-ready resources.
                </p>
              </div>
            </div>

            {isLoading ? (
              <JobListSkeleton count={5} />
            ) : isError ? (
              <div className="p-8 rounded-3xl border bg-card text-center">
                
                <p className="text-destructive font-medium text-base">
                  Failed to load jobs
                </p>

                <p className="text-sm text-muted-foreground mt-2">
                  {error?.message ||
                    'Something went wrong while loading jobs.'}
                </p>
              </div>
            ) : results.length > 0 ? (
              
              <div className="space-y-4">
                {results.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                  />
                ))}
              </div>

            ) : search.trim() ? (
              <SearchResultsEmptyState
                query={search}
                onClear={() => setSearch('')}
              />
            ) : (
              <JobsEmptyState />
            )}
          </div>

          {/* FEATURED */}
          <aside className="hidden xl:block">
            
            <div className="sticky top-28 space-y-5">
              
              <FeaturedJobs jobs={featured} />

              <div className="rounded-3xl border border-border/50 bg-card p-5">
                
                <div className="flex items-center justify-between gap-3 mb-4">
                  
                  <div>
                    <h3 className="text-base font-semibold">
                      Application Support
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      Tools and workflow guidance
                      for job applications.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>
                      Passport Photo Resizer
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>
                      Compress PDF Below 200KB
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>
                      Signature Resize Tools
                    </span>
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