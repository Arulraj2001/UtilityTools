import React from 'react'

export default function JobCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
      {/* Shimmer background */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 space-y-4">
        {/* TOP - Icon + Title + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0 flex-1">
            {/* Icon skeleton */}
            <div className="w-12 h-12 rounded-2xl bg-border/50 shrink-0" />

            {/* Title skeleton */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 rounded-lg bg-border/50 w-3/4" />
              <div className="space-y-1">
                <div className="h-3 rounded bg-border/40 w-full" />
                <div className="h-3 rounded bg-border/40 w-2/3" />
              </div>
            </div>
          </div>

          {/* Status skeleton */}
          <div className="h-6 w-16 rounded-full bg-border/50 shrink-0" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 rounded bg-border/40 w-full" />
          <div className="h-3 rounded bg-border/40 w-5/6" />
        </div>

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-1.5">
          <div className="h-6 w-20 rounded-full bg-border/50" />
          <div className="h-6 w-24 rounded-full bg-border/50" />
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
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
