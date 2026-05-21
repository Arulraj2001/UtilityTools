import React from 'react'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FeaturedJobsEmptyState() {
  return (
    <div className="py-12 text-center rounded-2xl border border-dashed border-primary/20 bg-primary/5">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>

      <h4 className="font-semibold text-sm mb-1">
        No Featured Jobs
      </h4>

      <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
        Featured job opportunities will appear here when available.
      </p>

      <Link
        to="/jobs"
        className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-xs border border-primary/20"
      >
        Browse All Jobs
      </Link>
    </div>
  )
}
