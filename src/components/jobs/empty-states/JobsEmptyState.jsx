import React from 'react'
import { BriefcaseBusiness, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function JobsEmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
        <BriefcaseBusiness className="w-8 h-8 text-primary" />
      </div>

      <h3 className="text-2xl font-bold tracking-tight mb-2">
        No Jobs Available
      </h3>

      <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        We don't have any job listings matching your criteria right now. 
        Check back soon or explore our tools and resources.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/jobs"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5 transition-all font-medium text-sm"
        >
          Browse All Jobs
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to="/tools"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-sm border border-primary/20"
        >
          Explore Tools
        </Link>
      </div>
    </div>
  )
}
