/**
 * Business ROI Intelligence - Premium ROI analyzer with projections and campaign scoring
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, Target, RefreshCw, Calculator, BarChart3, Clock } from 'lucide-react'
import { useROIAnalysis } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, LineChartComponent, BarChartComponent, GaugeMeter, ProgressBar, Section } from '../PremiumSellerCharts'

const FIELDS = [
  { n: 'investment', l: 'Initial Investment (₹)', t: 'number', p: '100000' },
  { n: 'monthlyReturn', l: 'Monthly Return (%)', t: 'number', p: '8', d: '8' },
  { n: 'months', l: 'Analysis Period (Months)', t: 'number', p: '12', d: '12' },
  { n: 'marketingSpend', l: 'Marketing Spend (₹)', t: 'number', p: '15000' },
  { n: 'campaignRevenue', l: 'Campaign Revenue (₹)', t: 'number', p: '45000' },
]

const BusinessROIIntelligence = memo(() => {
  const [inputs, setInputs] = useState({ monthlyReturn: '8', months: '12' })
  const [hasRun, setHasRun] = useState(false)
  const result = useROIAnalysis(inputs)
  const activeResult = hasRun && result ? result : null
  const handleChange = useCallback((n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleCalc = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ monthlyReturn: '8', months: '12' }); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="Investment & Returns" icon={BarChart3}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELDS.map(f => (
            <div key={f.n} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f.l}</label>
              <input type={f.t} placeholder={f.p} value={inputs[f.n] || ''} onChange={e => handleChange(f.n, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCalc}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20">
            <Calculator className="w-4 h-4" /> Calculate ROI
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>{activeResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Return" value={activeResult.totalReturn} icon={DollarSign} color={activeResult.totalReturn > 0 ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="ROI %" value={activeResult.roi} icon={Percent} suffix="%" color={activeResult.roi > 50 ? 'text-green-400' : 'text-yellow-400'} />
            <KpiCard label="Final Value" value={activeResult.finalValue} icon={TrendingUp} />
            <KpiCard label="Recovery" value={activeResult.recoveryMonths} icon={Clock} suffix=" months" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Marketing ROI">
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-primary">{activeResult.marketingROI.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Marketing ROI</p>
              </div>
              <GaugeMeter value={activeResult.campaignScore} label="Campaign Score" size={100}
                color={activeResult.campaignScore > 70 ? '#10b981' : activeResult.campaignScore > 40 ? '#f59e0b' : '#ef4444'} />
            </Section>
            <BarChartComponent data={activeResult.recoveryProgress} title="Investment Recovery" />
          </div>

          {activeResult.timeline && <LineChartComponent data={activeResult.timeline} title="Investment Growth Timeline" />}
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter investment details to analyze ROI, compound growth, and campaign performance.</div>}
    </div>
  )
})

export default BusinessROIIntelligence