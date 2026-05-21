import React from 'react'
import { BriefcaseBusiness, Plus } from 'lucide-react'

export default function AdminJobsEmptyState({ onCreateClick = () => {} }) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
        <BriefcaseBusiness className="w-8 h-8 text-primary" />
      </div>

      <h3 className="text-xl font-bold tracking-tight mb-2">
        Create Your First Job Listing
      </h3>

      <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        Start building your recruitment CMS by creating a new job listing. 
        Add title, description, requirements, and more.
      </p>

      <button
        onClick={onCreateClick}
        className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
      >
        <Plus className="w-5 h-5" />
        Create First Job
      </button>
    </div>
  )
}
