import React from 'react'
import {
  Search,
  Filter,
  Sparkles,
} from 'lucide-react'

export default function JobFilters({
  filter = 'all',
  setFilter,
  search = '',
  setSearch,
}) {
  const filters = [
    ['all', 'All'],
    ['published', 'Published'],
    ['draft', 'Draft'],
    ['expired', 'Expired'],
    ['featured', 'Featured'],
  ]

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/50 bg-card/80 backdrop-blur-sm p-5 lg:p-6 mb-6 shadow-sm">
      {/* Spotlight */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 blur-3xl rounded-full opacity-40 pointer-events-none" />

      <div className="relative z-10">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Filters
            </div>

            <h3 className="text-2xl font-black tracking-tight">
              Manage Jobs
            </h3>

            <p className="text-sm text-muted-foreground mt-2">
              Search, filter, and manage published and draft job listings.
            </p>
          </div>

          <div className="hidden lg:flex w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
            <Filter className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-4">
          {/* FILTER */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter?.(e.target.value)}
              className="w-full h-12 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-sm px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              {filters.map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) => setSearch?.(e.target.value)}
              placeholder="Search jobs by title, organization, category..."
              className="w-full h-12 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-sm pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="flex flex-wrap gap-3 mt-5">
          <div className="px-3 py-1.5 rounded-xl border bg-background/60 text-xs font-medium text-muted-foreground">
            Draft + Published Support
          </div>

          <div className="px-3 py-1.5 rounded-xl border bg-background/60 text-xs font-medium text-muted-foreground">
            SEO-Friendly Job Management
          </div>

          <div className="px-3 py-1.5 rounded-xl border bg-background/60 text-xs font-medium text-muted-foreground">
            Fast Search & Filtering
          </div>
        </div>
      </div>
    </div>
  )
}