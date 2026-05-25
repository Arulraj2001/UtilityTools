/**
 * Seller Business Performance Dashboard - Premium full business intelligence dashboard
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, BarChart3, RefreshCw, Calculator, PieChart, Activity, Download } from 'lucide-react'
import { useSellerPerformance } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, DonutChart, LineChartComponent, BarChartComponent, GaugeMeter, ProgressBar, Section } from '../PremiumSellerCharts'

const FIELDS = [
  { n: 'monthlyRevenue', l: 'Monthly Revenue (₹)', t: 'number', p: '500000' },
  { n: 'monthlyCosts', l: 'Monthly Costs (₹)', t: 'number', p: '300000' },
  { n: 'returns', l: 'Return Rate (%)', t: 'number', p: '5', d: '5' },
  { n: 'adSpend', l: 'Monthly Ad Spend (₹)', t: 'number', p: '30000' },
  { n: 'operatingExpenses', l: 'Monthly Operating Exp (₹)', t: 'number', p: '25000' },
  { n: 'taxRate', l: 'Tax Rate (%)', t: 'number', p: '18', d: '18' },
]

const SellerBusinessPerformanceDashboard = memo(() => {
  const [inputs, setInputs] = useState({ returns: '5', taxRate: '18' })
  const [hasRun, setHasRun] = useState(false)
  const result = useSellerPerformance(inputs)
  const activeResult = hasRun && result ? result : null
  const handleChange = useCallback((n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleCalc = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ returns: '5', taxRate: '18' }); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="Business Parameters" icon={Activity}>
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
            <Calculator className="w-4 h-4" /> Analyze Business
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>{activeResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Annual KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Annual Revenue" value={activeResult.annualRevenue} icon={DollarSign} color="text-green-400" />
            <KpiCard label="Gross Profit" value={activeResult.grossProfit} icon={BarChart3} color="text-blue-400" />
            <KpiCard label="Net Profit" value={activeResult.netProfit} icon={TrendingUp} color={activeResult.netProfit > 0 ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="Net Margin" value={activeResult.margin} icon={Percent} suffix="%" color={activeResult.margin > 15 ? 'text-green-400' : 'text-yellow-400'} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Costs" value={activeResult.annualCosts} icon={DollarSign} color="text-red-400" />
            <KpiCard label="Returns Impact" value={activeResult.returnImpact} icon={BarChart3} color="text-red-400" />
            <KpiCard label="Tax Liability" value={activeResult.taxLiability} icon={Percent} color="text-amber-400" />
            <KpiCard label="Ad ROI" value={activeResult.adsROI} icon={TrendingUp} suffix="x" color={activeResult.adsROI > 3 ? 'text-green-400' : 'text-yellow-400'} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DonutChart data={activeResult.expenseCategories} title="Annual Expense Breakdown" />
            <Section title="Business Health">
              <GaugeMeter value={activeResult.growthScore} label="Growth Score"
                color={activeResult.growthScore > 70 ? '#10b981' : activeResult.growthScore > 40 ? '#f59e0b' : '#ef4444'} />
            </Section>
          </div>

          {/* Monthly Trend */}
          {activeResult.monthlyData && (
            <LineChartComponent data={activeResult.monthlyData} title="Monthly Revenue, Profit & Costs" />
          )}
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter your business metrics to get a comprehensive seller performance dashboard.</div>}
    </div>
  )
})

export default SellerBusinessPerformanceDashboard