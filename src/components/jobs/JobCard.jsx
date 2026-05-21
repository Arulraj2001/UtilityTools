import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Building2,
  BadgeCheck,
  Clock3,
} from 'lucide-react'

import { formatDate, isExpired } from '@/lib/jobs/jobHelpers'

export default function JobCard({ job }) {
  if (!job) return null

  const slug = job.slug || ''

  const href = slug
    ? `/jobs/${encodeURIComponent(slug)}`
    : '/jobs'

  const expired = isExpired(job)

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
      
      {/* SPOTLIGHT */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 p-6">
        
        {/* TOP */}
        <div className="flex items-start justify-between gap-4">
          
          <div className="flex gap-4 min-w-0">
            
            {/* ICON */}
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <BriefcaseBusiness className="w-5 h-5 text-primary" />
            </div>

            {/* TITLE */}
            <div className="min-w-0">
              
              <Link
                to={href}
                className="inline-flex items-start gap-2 group/link"
              >
                <h3 className="text-base sm:text-lg font-bold tracking-tight leading-snug line-clamp-2 transition-colors group-hover/link:text-primary">
                  {job.title || 'Untitled Job'}
                </h3>

                <ArrowUpRight className="w-4 h-4 mt-1 opacity-0 -translate-x-1 transition-all duration-300 group-hover/link:opacity-100 group-hover/link:translate-x-0" />
              </Link>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                
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
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${
              expired
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-green-500/10 text-green-600 border-green-500/20'
            }`}
          >
            {expired ? 'Expired' : 'Open'}
          </div>
        </div>

        {/* DESCRIPTION */}
        {job.short_description && (
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {job.short_description}
          </p>
        )}

        {/* TAGS */}
        <div className="flex flex-wrap gap-2 mt-4">
          
          {job.category && (
            <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              {job.category}
            </div>
          )}

          {job.job_type && (
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              {job.job_type}
            </div>
          )}

          {job.qualification && (
            <div className="px-2.5 py-1 rounded-full border text-xs font-medium">
              {job.qualification}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="mt-5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            
            {job.last_date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{formatDate(job.last_date)}</span>
              </div>
            )}

            {job.salary && (
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>{job.salary}</span>
              </div>
            )}
          </div>

          <Link
            to={href}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all duration-200"
          >
            View Details
            <Clock3 className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}