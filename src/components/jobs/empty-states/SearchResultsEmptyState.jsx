import React from 'react'
import { Search } from 'lucide-react'

export default function SearchResultsEmptyState({ query = '', onClear = () => {} }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-5">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>

      <h3 className="text-xl font-bold tracking-tight mb-2">
        No Results Found
      </h3>

      {query && (
        <p className="text-muted-foreground mb-4">
          No jobs match <span className="font-medium">"{query}"</span>
        </p>
      )}

      <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed text-sm">
        Try adjusting your search terms or browse all available jobs.
      </p>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onClear}
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all"
        >
          Clear Search
        </button>
      </div>
    </div>
  )
}
