import React from 'react'

export default function JobDetailSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Back + Header */}
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="h-4 w-32 rounded bg-border/50" />

        {/* Title */}
        <div className="space-y-3">
          <div className="h-8 rounded-lg bg-border/50 w-3/4" />
          <div className="h-5 rounded-lg bg-border/40 w-1/2" />
        </div>

        {/* Info Card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 rounded bg-border/40 w-1/2" />
                <div className="h-5 rounded bg-border/50 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-6">
          <div className="h-5 rounded-lg bg-border/50 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 rounded bg-border/40 w-full" />
            ))}
            <div className="h-4 rounded bg-border/40 w-3/4" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Related jobs */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6">
              <div className="h-5 rounded-lg bg-border/50 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-border/40" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Apply card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6 space-y-4">
              <div className="h-12 rounded-lg bg-border/50" />
              <div className="space-y-2">
                <div className="h-4 rounded bg-border/40 w-full" />
                <div className="h-4 rounded bg-border/40 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </main>
  )
}
