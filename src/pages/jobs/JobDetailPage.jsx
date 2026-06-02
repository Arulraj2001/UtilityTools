import React, { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CalendarDays,
  MapPin,
  BadgeIndianRupee,
  BriefcaseBusiness,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'

import { useJob } from '@/hooks/jobs/useJobs'
import { useSiteBooleanSetting } from '@/hooks/useSiteSettings'

import JobMeta from '@/components/jobs/JobMeta'
import JobApplyCard from '@/components/jobs/JobApplyCard'
import RelatedJobs from '@/components/jobs/RelatedJobs'
import JobSEOLinking from '@/components/jobs/JobSEOLinking'
import { JobDetailSkeleton } from '@/components/jobs/skeletons'

import JobSEO from '@/utils/jobs/jobSeo'

import {
  matchRelatedTools,
  matchRelatedWorkflows,
  matchRelatedBlogs,
  matchRelatedJobs,
} from '@/lib/jobs/jobRelations'

import { trackJobView } from '@/lib/jobs/jobAnalytics'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

import ToolCard from '@/components/shared/ToolCard'
import BlogCard from '@/components/blog/BlogCard'

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

  if (!job) {
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

  return (
    <main className="min-h-screen">
      <JobSEO job={job} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-3xl rounded-full opacity-30" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <Link
            to="/jobs"
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

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-xs">
              <Sparkles className="w-3 h-3" />
              Applications Open
            </div>
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
                    <Link
                      key={workflow.id}
                      to={`/workflow/${encodeURIComponent(workflow.slug)}`}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedBlogs.map((blog, i) => (
                    <BlogCard
                      key={blog.id}
                      post={blog}
                      index={i}
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
                  <Link to="/job-sources-policy" className="text-primary hover:underline">
                    Job Sources Policy
                  </Link>
                  <Link to="/corrections-policy" className="text-primary hover:underline">
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
