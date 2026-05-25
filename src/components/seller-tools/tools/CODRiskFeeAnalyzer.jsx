/**
 * COD Risk & Fee Analyzer - Premium COD analysis tool
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, Shield, RefreshCw, Calculator, AlertTriangle, Clock, Ban } from 'lucide-react'
import { useCODAnalysis } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, DonutChart, BarChartComponent, GaugeMeter, ProgressBar, SuggestionCard, Section } from '../PremiumSellerCharts'

const FIELDS = [
  { n: 'codAmount', l: 'COD Amount (₹)', t: 'number', p: '500' },
  { n: 'averageOrderValue', l: 'Avg Order Value (₹)', t: 'number', p: '500', d: '500' },
  { n: 'returnRate', l: 'Return Rate (%)', t: 'number', p: '10', d: '10' },
  { n: 'courierCodFee', l: 'Courier COD Fee (₹)', t: 'number', p: '30', d: '30' },
  { n: 'prepaidRatio', l: 'Prepaid Orders (%)', t: 'number', p: '40', d: '40' },
]

const CODRiskFeeAnalyzer = memo(() => {
  const [inputs, setInputs] = useState({ averageOrderValue: '500', returnRate: '10', courierCodFee: '30', prepaidRatio: '40' })
  const [hasRun, setHasRun] = useState(false)
  const result = useCODAnalysis(inputs)
  const activeResult = hasRun && result ? result : null
  const handleChange = useCallback((n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleCalc = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ averageOrderValue: '500', returnRate: '10', courierCodFee: '30', prepaidRatio: '40' }); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="COD Settings" icon={Shield}>
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
            <Calculator className="w-4 h-4" /> Analyze COD Risk
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
            <KpiCard label="COD Fee" value={activeResult.codFee} icon={DollarSign} color="text-red-400" />
            <KpiCard label="RTO Cost" value={activeResult.rtoCost} icon={Ban} color="text-red-400" />
            <KpiCard label="Return Probability" value={activeResult.returnProbability} icon={Percent} suffix="%" color="text-amber-400" />
            <KpiCard label="Effective Revenue" value={activeResult.effectiveRevenue} icon={TrendingUp} color="text-green-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="Risk Assessment">
              <GaugeMeter value={activeResult.riskScore} label={`${activeResult.riskLevel} Risk`}
                color={activeResult.riskScore > 60 ? '#ef4444' : activeResult.riskScore > 30 ? '#f59e0b' : '#10b981'} />
            </Section>
            <BarChartComponent data={activeResult.codVsPrepaid} title="COD vs Prepaid Cost" />
            <Section title="Payout Timeline">
              <div className="space-y-2">
                {activeResult.payoutTimeline?.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{s.day}:</span>
                    <span className={`font-medium ${s.status === 'Completed' ? 'text-green-400' : s.status === 'In Transit' ? 'text-blue-400' : 'text-amber-400'}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Prepaid vs COD Savings">
            <p className="text-sm mb-2">Switching to prepaid could save you <span className="font-bold text-green-400">₹{activeResult.premiumSavings.toFixed(2)}</span> per order</p>
            <ProgressBar value={activeResult.premiumSavings} label="Savings Potential" max={Math.max(activeResult.premiumSavings, 50)} />
          </Section>
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter COD details to analyze risk, fees, and payout timelines.</div>}
    </div>
  )
})

export default CODRiskFeeAnalyzer