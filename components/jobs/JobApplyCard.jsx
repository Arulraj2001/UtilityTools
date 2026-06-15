import React from 'react'
import {
  ArrowUpRight,
  FileText,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react'

import { formatDate } from '@/lib/jobs/jobHelpers'

export default function JobApplyCard({ job }) {
  if (!job) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
      {/* GLOW */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10">
        {/* TITLE */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Apply for this Job
            </h3>

            <p className="text-xs text-muted-foreground">
              Official application links and resources
            </p>
          </div>
        </div>

        {/* APPLY BUTTON */}
        <a
          href={job.apply_link || job.official_website}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-center gap-1.5 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.01]"
        >
          Apply Now

          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        {/* META */}
        <div className="mt-4 space-y-2">
          {job.last_date && (
            <div className="flex items-center gap-2 text-xs">
              <CalendarClock className="w-3.5 h-3.5 text-primary" />

              <span>
                Last Date:{' '}
                <span className="font-medium">
                  {formatDate(job.last_date)}
                </span>
              </span>
            </div>
          )}

          {job.notification_pdf && (
            <a
              href={job.notification_pdf}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />

              <span className="underline underline-offset-3">
                Official Notification PDF
              </span>
            </a>
          )}
        </div>

        {/* TRUST NOTE */}
        <div className="mt-4 rounded-lg border border-border/50 bg-background/60 backdrop-blur-sm p-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Always verify official eligibility, deadlines, and instructions
            before submitting your application.
          </p>
        </div>
      </div>
    </div>
  )
}