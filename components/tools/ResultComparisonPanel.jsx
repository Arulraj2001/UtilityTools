import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowRightLeft, BarChart3 } from 'lucide-react'
import { compareScenarios } from '@/lib/engines/logisticsScenarioEngine'

export default function ResultComparisonPanel({ baseScenario = {}, variantScenario = {} }) {
  const comparison = useMemo(
    () => compareScenarios(baseScenario, variantScenario),
    [baseScenario, variantScenario]
  )

  if (!comparison) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Scenario Comparison</p>
          <h3 className="text-lg font-semibold">Side-by-side freight performance</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
          <ArrowRightLeft className="w-4 h-4" />
          Comparison mode
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ComparisonCard label="Cost delta" value={formatChange(comparison.totalCostDifference, '₹')} />
        <ComparisonCard label="Weight delta" value={formatChange(comparison.weightDifference, 'kg')} />
        <ComparisonCard label="Time delta" value={formatChange(comparison.timeDifference, 'days')} />
      </div>

      <div className="mt-5 rounded-3xl border border-border/50 bg-slate-950/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <BarChart3 className="w-4 h-4" />
          <span>{comparison.summary}</span>
        </div>
      </div>
    </motion.div>
  )
}

function ComparisonCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-slate-950/95 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function formatChange(value, suffix = '') {
  if (value === null || value === undefined) return 'N/A'
  const symbol = value > 0 ? '+' : ''
  return `${symbol}${Number(value).toFixed(2)} ${suffix}`
}
