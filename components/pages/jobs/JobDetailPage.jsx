'use client';
import React, { useEffect, useMemo } from 'react'
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CalendarDays,
  MapPin,
  BadgeIndianRupee,
  BriefcaseBusiness,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Clock,
} from 'lucide-react'

import { useJob } from '@/hooks/jobs/useJobs'
import { useSiteBooleanSetting } from '@/hooks/useSiteSettings'

import JobMeta from '@/components/jobs/JobMeta'
import JobApplyCard from '@/components/jobs/JobApplyCard'
import RelatedJobs from '@/components/jobs/RelatedJobs'
import JobSEOLinking from '@/components/jobs/JobSEOLinking'
import { JobDetailSkeleton } from '@/components/jobs/skeletons'

import JobSEO, { isExpired } from '@/utils/jobs/jobSeo'

import {
  matchRelatedTools,
  matchRelatedWorkflows,
  matchRelatedBlogs,
  matchRelatedJobs,
} from '@/lib/jobs/jobRelations'

import { trackJobView } from '@/lib/jobs/jobAnalytics'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import PageNotFound from '@/lib/PageNotFound'

import ToolCard from '@/components/shared/ToolCard'
import BlogCard from '@/components/blog/BlogCard'

// ── Application status helpers ──────────────────────────────────────────────
const getApplicationStatus = (lastDate) => {
  if (!lastDate) return { open: true, label: 'Applications Open', days: null }
  const deadline = new Date(lastDate)
  if (Number.isNaN(deadline.getTime())) return { open: true, label: 'Applications Open', days: null }
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { open: false, label: 'Applications Closed', days: Math.abs(diffDays) }
  if (diffDays <= 7) return { open: true, label: `${diffDays} day${diffDays === 1 ? '' : 's'} left`, days: diffDays }
  return { open: true, label: 'Applications Open', days: diffDays }
}

export default function JobDetailPage() {
  const { slug } = useParams()

  const { value: jobsEnabled = true } = useSiteBooleanSetting('jobs_enabled', true)

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useJob(slug)

  // Track job view for analytics
  useEffect(() => {
    if (job?.id) {
      trackJobView(job.id)
    }
  }, [job?.id])

  // Application status
  const appStatus = useMemo(
    () => getApplicationStatus(job?.last_date),
    [job?.last_date]
  )

  const {
    data: relatedTools = [],
  } = useQuery({
    queryKey: ['job', job?.id, 'relatedTools'],
    queryFn: () => matchRelatedTools(job),
    enabled: !!job,
  })

  const {
    data: relatedWorkflows = [],
  } = useQuery({
    queryKey: ['job', job?.id, 'relatedWorkflows'],
    queryFn: () => matchRelatedWorkflows(job),
    enabled: !!job,
  })

  const {
    data: relatedBlogs = [],
  } = useQuery({
    queryKey: ['job', job?.id, 'relatedBlogs'],
    queryFn: () => matchRelatedBlogs(job),
    enabled: !!job,
  })

  const {
    data: relatedJobs = [],
  } = useQuery({
    queryKey: ['job', job?.id, 'relatedJobs'],
    queryFn: () => matchRelatedJobs(job),
    enabled: !!job,
  })

  if (isLoading) {
    return <JobDetailSkeleton />
  }

  if (isError) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl border bg-card p-10 text-center">
          <h2 className="text-2xl font-bold">
            Failed to load job
          </h2>

          <p className="text-muted-foreground mt-3">
            {error?.message || 'Something went wrong while loading this job.'}
          </p>
        </div>
      </main>
    )
  }

  if (!jobsEnabled) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl border bg-card p-10 text-center">
          <h2 className="text-2xl font-bold">
            Job listings are temporarily paused
          </h2>

          <p className="text-muted-foreground mt-3">
            The job listing feature is currently paused. Please check back later.
          </p>
        </div>
      </main>
    )
  }

  if (!job) return (
    <PageNotFound
      title="Job not found"
      message="The job listing you requested does not exist, has expired, or is not published."
      primaryHref="/jobs"
      primaryLabel="Browse jobs"
    />
  )

  return (
    <main className="min-h-screen">
      <JobSEO job={job} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-3xl rounded-full opacity-30" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <Link href="/jobs"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {job.category && (
              <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                {job.category}
              </div>
            )}

            {job.job_type && (
              <div className="px-2.5 py-0.5 rounded-full border text-xs">
                {job.job_type}
              </div>
            )}

            {appStatus.open ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-xs">
                <Sparkles className="w-3 h-3" />
                {appStatus.label}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 text-xs">
                <AlertTriangle className="w-3 h-3" />
                {appStatus.label}
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight max-w-4xl">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-muted-foreground">
            {job.organization && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{job.organization}</span>
              </div>
            )}

            {job.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
            )}

            {job.salary && (
              <div className="flex items-center gap-1.5">
                <BadgeIndianRupee className="w-4 h-4" />
                <span>{job.salary}</span>
              </div>
            )}

            {job.last_date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                <span>Last Date: {job.last_date}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI CONTENT DISCLOSURE — Required for AdSense approval & Google Helpful Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/20 px-4 py-3 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <p className="font-medium mb-1">Content transparency</p>
            <p>
              This job listing was compiled from official government notifications using AI-assisted
              extraction and reviewed by the QuickUtils editorial team. Always verify eligibility,
              dates, fees, and application details on the{' '}
              {job.official_website ? (
                <a
                  href={job.official_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  official source
                </a>
              ) : (
                'official source'
              )}{' '}
              before applying.
            </p>
            {job.published_at && (
              <p className="mt-1 text-blue-600/80 dark:text-blue-400/80">
                <Clock className="w-3 h-3 inline mr-1" />
                Published {new Date(job.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}QuickUtils Editorial Team
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN */}
          <article className="xl:col-span-2 space-y-6">
            {/* DESCRIPTION */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                Job Overview
              </h2>

              <div
                className="prose prose-sm prose-neutral dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    job.full_description ||
                    job.short_description ||
                    ''
                  ),
                }}
              />
            </div>

            {/* ELIGIBILITY */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                Eligibility
              </h2>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                {job.qualification && (
                  <div className="flex items-start gap-3">
                    <BriefcaseBusiness className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">
                        Qualification
                      </p>

                      <p className="mt-1">{job.qualification}</p>
                    </div>
                  </div>
                )}

                {job.experience && (
                  <div className="flex items-start gap-3">
                    <BriefcaseBusiness className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">
                        Experience
                      </p>

                      <p className="mt-1">{job.experience}</p>
                    </div>
                  </div>
                )}

                {job.application_fee && (
                  <div className="flex items-start gap-3">
                    <BadgeIndianRupee className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-xs">
                        Application Fee
                      </p>

                      <p className="mt-1">{job.application_fee}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RELATED WORKFLOWS */}
            {relatedWorkflows.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">
                  Related Workflows
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedWorkflows.map((workflow) => (
                    <Link key={workflow.id}
                      href={`/workflow/${encodeURIComponent(workflow.slug)}`}
                      className="group"
                    >
                      <div className="rounded-2xl border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all">
                        <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                          {workflow.title}
                        </h3>

                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {workflow.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* BLOGS */}
            {relatedBlogs.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">
                  Related Articles
                </h2>

                <div className="space-y-3">
                  {relatedBlogs.map((blog, i) => (
                    <BlogCard
                      key={blog.id}
                      post={blog}
                      index={i}
                      compact={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* SIDEBAR */}
          <aside className="space-y-5">
            <div className="sticky top-24 space-y-5">
              <JobApplyCard job={job} />

              <JobMeta job={job} />

              <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-5">
                <h3 className="font-bold text-sm mb-3">Job Information Standards</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Verify eligibility, dates, fees, and application instructions on the official
                  source before applying.
                </p>
                <div className="flex flex-col gap-2 text-xs font-medium">
                  <Link href="/job-sources-policy" className="text-primary hover:underline">
                    Job Sources Policy
                  </Link>
                  <Link href="/corrections-policy" className="text-primary hover:underline">
                    Report a job correction
                  </Link>
                </div>
              </section>

              {relatedTools.length > 0 && (
                <section className="rounded-2xl border bg-card/80 backdrop-blur-sm p-5">
                  <h3 className="font-bold text-sm mb-4">
                    Related Tools
                  </h3>

                  <div className="space-y-3">
                    {relatedTools.map((tool, i) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        index={i}
                        compact={true}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>

        {/* SEO LINKING - Internal linking for better crawl depth */}
        <JobSEOLinking job={job} />

        {/* RELATED JOBS */}
        {relatedJobs.length > 0 && (
          <div className="mt-10">
            <RelatedJobs jobs={relatedJobs} />
          </div>
        )}
      </section>
    </main>
  )
}
