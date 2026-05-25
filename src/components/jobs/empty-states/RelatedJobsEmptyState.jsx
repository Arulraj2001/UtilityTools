import React from 'react'
import { Link } from 'lucide-react'

export default function RelatedJobsEmptyState() {
  return (
    <div className="py-8 text-center rounded-2xl border border-dashed border-border/50 bg-card/30">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
        <Link className="w-5 h-5 text-muted-foreground" />
      </div>

      <h4 className="font-semibold text-sm mb-1">
        No Related Jobs Found
      </h4>

      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        We couldn't find similar job opportunities. 
        Explore more jobs to discover new openings.
      </p>
    </div>
  )
}
