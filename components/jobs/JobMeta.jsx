import React from 'react'
import {
  MapPin,
  BriefcaseBusiness,
  GraduationCap,
  BadgeIndianRupee,
  CalendarDays,
  Building2,
} from 'lucide-react'

import { formatDate } from '@/lib/jobs/jobHelpers'

export default function JobMeta({ job }) {
  if (!job) return null

  const items = [
    {
      label: 'Organization',
      value: job.organization,
      icon: Building2,
    },
    {
      label: 'Location',
      value: job.location,
      icon: MapPin,
    },
    {
      label: 'Job Type',
      value: job.job_type,
      icon: BriefcaseBusiness,
    },
    {
      label: 'Qualification',
      value: job.qualification,
      icon: GraduationCap,
    },
    {
      label: 'Experience',
      value: job.experience,
      icon: BriefcaseBusiness,
    },
    {
      label: 'Salary',
      value: job.salary,
      icon: BadgeIndianRupee,
    },
    {
      label: 'Last Date',
      value: formatDate(job.last_date),
      icon: CalendarDays,
    },
  ]

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 relative overflow-hidden">
      {/* SPOTLIGHT */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/10 blur-3xl rounded-full" />

      <div className="relative z-10">
        <h3 className="text-sm font-bold tracking-tight mb-4">
          Job Information
        </h3>

        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>

                  <p className="font-medium leading-snug mt-0.5 text-xs break-words">
                    {item.value || 'Not specified'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}