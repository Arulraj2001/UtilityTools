import React from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'

import JobCard from './JobCard'

export default function FeaturedJobs({ jobs = [] }) {
  if (!jobs || jobs.length === 0) return null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
      {/* GLOW */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
              <Sparkles className="w-3 h-3" />
              Curated Opportunities
            </div>

            <h3 className="text-lg font-bold tracking-tight">
              Featured Jobs
            </h3>

            <p className="text-xs text-muted-foreground mt-1.5">
              Handpicked openings and trending opportunities.
            </p>
          </div>

          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* JOBS */}
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
            />
          ))}
        </div>
      </div>
    </section>
  )
}