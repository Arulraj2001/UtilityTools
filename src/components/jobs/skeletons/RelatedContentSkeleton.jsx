import React from 'react'

export default function RelatedContentSkeleton({ type = 'grid', count = 4 }) {
  const skeletonItem = (
    <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
      {/* Image skeleton */}
      <div className="w-full h-40 bg-border/50" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-border/50 w-1/2" />
        <div className="space-y-2">
          <div className="h-4 rounded bg-border/40 w-full" />
          <div className="h-4 rounded bg-border/40 w-3/4" />
        </div>
        <div className="h-10 rounded-lg bg-border/50 w-full" />
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

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/80 p-4 h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{skeletonItem}</div>
      ))}
    </div>
  )
}
