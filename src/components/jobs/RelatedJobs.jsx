import React from 'react'
import { BriefcaseBusiness, ArrowRight } from 'lucide-react'

import JobCard from './JobCard'

export default function RelatedJobs({ jobs = [] }) {
  if (!jobs || jobs.length === 0) return null

  return (
    <section className="mt-10">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
            <BriefcaseBusiness className="w-3 h-3" />
            More Opportunities
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            Related Jobs
          </h2>

          <p className="text-muted-foreground text-xs mt-1.5">
            Explore similar opportunities and related openings.
          </p>
        </div>

        <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card hover:border-primary/30 hover:text-primary transition-all text-xs font-medium">
          Browse More Jobs
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-3">
        {jobs.map((job, index) => (
          <JobCard
            key={job?.id ?? index}
            job={job}
          />
        ))}
      </div>
    </section>
  )
}