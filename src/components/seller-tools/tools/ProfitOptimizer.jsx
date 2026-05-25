/**
 * E-commerce Profit Optimizer - Premium margin optimization tool
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, Target, Download, RefreshCw, Calculator, AlertTriangle, Lightbulb } from 'lucide-react'
import { useProfitOptimization } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, DonutChart, LineChartComponent, BarChartComponent, SuggestionCard, Section } from '../PremiumSellerCharts'

const INPUT_FIELDS = [
  { name: 'costPrice', label: 'Cost Price (₹)', type: 'number', placeholder: '500', default: '' },
  { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', placeholder: '1000', default: '' },
  { name: 'quantity', label: 'Quantity', type: 'number', placeholder: '100', default: '1' },
  { name: 'operatingExpenses', label: 'Operating Expenses (₹)', type: 'number', placeholder: '5000', default: '' },
  { name: 'adsSpend', label: 'Ads Spend (₹)', type: 'number', placeholder: '2000', default: '' },
  { name: 'competitorPrice', label: 'Competitor Price (₹)', type: 'number', placeholder: '950', default: '' },
  { name: 'targetMargin', label: 'Target Margin (%)', type: 'number', placeholder: '20', default: '20' },
]

const ProfitOptimizer = memo(() => {
  const [inputs, setInputs] = useState({ targetMargin: '20', quantity: '1' })
  const [hasRun, setHasRun] = useState(false)
  const result = useProfitOptimization(inputs)
  const activeResult = hasRun && result ? result : null

  const handleChange = useCallback((name, value) => { setHasRun(false); setInputs(prev => ({ ...prev, [name]: value })) }, [])
  const handleCalculate = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ targetMargin: '20', quantity: '1' }); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="Cost & Revenue Analysis" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {INPUT_FIELDS.map(field => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleCalculate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Calculator className="w-4 h-4" /> Optimize Profit
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/70 transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>
        {activeResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Gross Profit" value={activeResult.grossProfit} icon={DollarSign} color="text-green-400" />
              <KpiCard label="Margin %" value={activeResult.margin} icon={Percent} suffix="%" color={activeResult.margin > activeResult.targetMargin ? 'text-green-400' : 'text-red-400'} />
              <KpiCard label="ROI %" value={activeResult.roi} icon={TrendingUp} suffix="%" />
              <KpiCard label="Ad ROAS" value={activeResult.adROAS} icon={Target} suffix="x" color={activeResult.adROAS > 2 ? 'text-green-400' : 'text-yellow-400'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DonutChart data={activeResult.expenseAllocation} title="Expense Allocation" />
              <Section title="Target Price Analysis">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current Price</span><span className="font-bold">₹{activeResult.revenue.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Target Price</span><span className="font-bold text-primary">₹{activeResult.targetPrice.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Suggested Price</span><span className="font-bold text-green-400">₹{activeResult.suggestedPrice.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Price Gap</span><span className={`font-bold ${activeResult.priceGap > 0 ? 'text-amber-400' : 'text-green-400'}`}>₹{activeResult.priceGap.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">vs Competitor</span><span className={`font-bold ${activeResult.pricePosition <= 0 ? 'text-green-400' : 'text-red-400'}`}>{activeResult.pricePosition > 0 ? '+' : ''}{activeResult.pricePosition.toFixed(1)}%</span></div>
                </div>
              </Section>
            </div>

            {activeResult.marginTrend && <LineChartComponent data={activeResult.marginTrend} title="Margin vs Target Trend" />}
            <SuggestionCard suggestions={activeResult.suggestions} />
          </motion.div>
        )}
      </AnimatePresence>

      {!hasRun && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Enter your cost and revenue data to optimize profit margins, analyze ad efficiency, and get smart pricing recommendations.
        </div>
      )}
    </div>
  )
})

export default ProfitOptimizer