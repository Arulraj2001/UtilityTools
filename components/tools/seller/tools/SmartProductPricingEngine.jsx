/**
 * Smart Product Pricing Engine - Premium pricing optimization tool
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, Target, RefreshCw, Calculator, Tag } from 'lucide-react'
import { usePricingEngine } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, LineChartComponent, BarChartComponent, ProgressBar, Section } from '../PremiumSellerCharts'

const FIELDS = [
  { n: 'costPrice', l: 'Cost Price (₹)', t: 'number', p: '500' },
  { n: 'targetMargin', l: 'Target Margin (%)', t: 'number', p: '20', d: '20' },
  { n: 'marketplaceFees', l: 'Marketplace Fees (%)', t: 'number', p: '15', d: '15' },
  { n: 'competitorPrice', l: 'Competitor Price (₹)', t: 'number', p: '800' },
  { n: 'discount', l: 'Discount (%)', t: 'number', p: '10' },
]

const SmartProductPricingEngine = memo(() => {
  const [inputs, setInputs] = useState(/** @type {Record<string, string>} */ ({}))
  const [hasRun, setHasRun] = useState(false)
  const result = usePricingEngine(inputs)
  const activeResult = hasRun && result ? result : null
  const handleChange = useCallback(
    /** @param {string} n @param {string} v */
    (n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleCalc = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({}); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="Pricing Parameters" icon={Tag}>
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
            <Calculator className="w-4 h-4" /> Calculate Price
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
            <KpiCard label="Base Price" value={activeResult.basePrice} icon={DollarSign} />
            <KpiCard label="Suggested Price" value={activeResult.suggestedPrice} icon={Tag} color="text-green-400" />
            <KpiCard label="Final Margin" value={activeResult.finalMargin} icon={Percent} suffix="%" color={activeResult.finalMargin > activeResult.targetMargin ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="vs Competitor" value={activeResult.compDiff} icon={TrendingUp} suffix="%" color={activeResult.compDiff <= 0 ? 'text-green-400' : 'text-red-400'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BarChartComponent data={activeResult.feeSimulation} title="Price Breakdown" />
            <Section title="Competitive Analysis">
              <div className="space-y-3">
                <ProgressBar value={Math.max(0, 50 - activeResult.compDiff)} label="Price Position" max={100} />
                <p className="text-xs text-muted-foreground">
                  {activeResult.compDiff < -5 ? 'Your price is significantly lower than competitors' :
                   activeResult.compDiff > 5 ? 'Your price is higher than competitors' :
                   'Your price is competitive'}
                </p>
                <p className="text-xs text-muted-foreground">Psychological pricing: <strong className="text-primary">₹{activeResult.psychologicalPrice.toFixed(2)}</strong></p>
              </div>
            </Section>
          </div>

          {activeResult.priceCurve && (
            <Section title="Price Optimization Curve">
              <div className="grid grid-cols-5 gap-2">
                {activeResult.priceCurve.filter((_, i) => i % 2 === 0).map((p, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-primary">₹{p.price.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">{p.margin.toFixed(1)}% margin</p>
                    <p className="text-[10px] text-green-400">₹{p.profit.toFixed(0)} profit</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter cost and margin targets to get optimized pricing recommendations.</div>}
    </div>
  )
})

export default SmartProductPricingEngine