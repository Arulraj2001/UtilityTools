import React, { Suspense } from 'react'
import { motion } from 'framer-motion'

const DeferredChart = React.lazy(() => import('./DeferredChart'))
import useIntersectionLoad from '../../hooks/useIntersectionLoad'

export default function ResultChart({ chart }) {
  const [ref, isVisible] = useIntersectionLoad({ rootMargin: '300px', once: true })

  if (!chart) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="
        rounded-2xl
        border border-border/50
        bg-card
        p-4
        space-y-3
        overflow-hidden
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Analytics
          </p>
          <h3 className="text-sm font-semibold">
            {chart.title || 'Overview'}
          </h3>
        </div>

        <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
          Live
        </span>
      </div>

      <div ref={ref} className="w-full h-[260px] sm:h-[280px]">
        {!isVisible && (
          <div className="w-full h-full animate-pulse bg-gradient-to-r from-muted/40 to-muted/10 rounded-lg" />
        )}

        {isVisible && (
          <Suspense fallback={<div className="w-full h-full rounded-lg bg-card/60 animate-pulse" />}>
            <DeferredChart chart={chart} />
          </Suspense>
        )}
      </div>
    </motion.div>
  )
}
