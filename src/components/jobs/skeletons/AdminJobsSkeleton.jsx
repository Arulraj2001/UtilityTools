import React from 'react'

export default function AdminJobsSkeleton() {
  return (
    <main className="max-w-[1700px] mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="h-6 w-40 rounded-full bg-border/50" />
        <div className="h-10 rounded-lg bg-border/50 w-64" />
        <div className="h-4 rounded-lg bg-border/40 w-96" />
        <div className="h-12 rounded-2xl bg-border/50 w-40" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 rounded-lg bg-border/50" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-border/50 bg-card/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border/50">
          <div className="space-y-2 flex-1">
            <div className="h-6 rounded-lg bg-border/50 w-32" />
            <div className="h-4 rounded-lg bg-border/40 w-64" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-border/50" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded bg-border/50 w-1/3" />
                <div className="h-3 rounded bg-border/40 w-1/2" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-lg bg-border/50" />
                <div className="h-8 w-8 rounded-lg bg-border/50" />
                <div className="h-8 w-8 rounded-lg bg-border/50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </main>
  )
}
