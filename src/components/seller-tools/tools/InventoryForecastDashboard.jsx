/**
 * Inventory Forecast Dashboard - Premium inventory management with forecasting
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, TrendingUp, AlertTriangle, RefreshCw, Calculator, DollarSign, Clock } from 'lucide-react'
import { useInventoryForecast } from '@/hooks/seller/useSellerCalculations'
import { KpiCard, LineChartComponent, BarChartComponent, GaugeMeter, ProgressBar, Section } from '../PremiumSellerCharts'

const FIELDS = [
  { n: 'currentStock', l: 'Current Stock', t: 'number', p: '200' },
  { n: 'monthlySales', l: 'Monthly Sales', t: 'number', p: '100' },
  { n: 'leadTime', l: 'Lead Time (days)', t: 'number', p: '15', d: '15' },
  { n: 'reorderPoint', l: 'Reorder Point', t: 'number', p: '50', d: '50' },
  { n: 'safetyStock', l: 'Safety Stock', t: 'number', p: '20', d: '20' },
  { n: 'price', l: 'Selling Price (₹)', t: 'number', p: '1000' },
  { n: 'cost', l: 'Unit Cost (₹)', t: 'number', p: '500' },
]

const InventoryForecastDashboard = memo(() => {
  const [inputs, setInputs] = useState({ leadTime: '15', reorderPoint: '50', safetyStock: '20' })
  const [hasRun, setHasRun] = useState(false)
  const result = useInventoryForecast(inputs)
  const activeResult = hasRun && result ? result : null
  const handleChange = useCallback((n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleCalc = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ leadTime: '15', reorderPoint: '50', safetyStock: '20' }); setHasRun(false) }, [])

  return (
    <div className="space-y-5">
      <Section title="Stock & Sales Data" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <Calculator className="w-4 h-4" /> Analyze Inventory
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
            <KpiCard label="Days Until Stockout" value={Math.round(activeResult.daysUntilOut)} icon={Clock} suffix=" days" color={activeResult.daysUntilOut > 30 ? 'text-green-400' : 'text-red-400'} />
            <KpiCard label="Reorder Qty" value={activeResult.reorderQuantity} icon={Package} color="text-blue-400" />
            <KpiCard label="Stock Value" value={activeResult.stockValue} icon={DollarSign} />
            <KpiCard label="Projected Revenue" value={activeResult.projectedRevenue} icon={TrendingUp} color="text-green-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="Inventory Health">
              <GaugeMeter value={activeResult.healthScore} label="Health Score"
                color={activeResult.healthScore > 70 ? '#10b981' : activeResult.healthScore > 40 ? '#f59e0b' : '#ef4444'} />
            </Section>
            <Section title="Alerts">
              <div className="space-y-2">
                {activeResult.reorderAlert && <div className="flex items-center gap-2 text-xs text-amber-400"><AlertTriangle className="w-3 h-3" /> Reorder point reached!</div>}
                {activeResult.deadStockDetected && <div className="flex items-center gap-2 text-xs text-red-400"><AlertTriangle className="w-3 h-3" /> Dead stock detected</div>}
                {activeResult.fastMoving && <div className="flex items-center gap-2 text-xs text-green-400"><TrendingUp className="w-3 h-3" /> Fast-moving product</div>}
                {!activeResult.reorderAlert && !activeResult.deadStockDetected && !activeResult.fastMoving && <p className="text-xs text-muted-foreground">All clear</p>}
              </div>
            </Section>
            <BarChartComponent data={activeResult.reorderTimeline} title="Stock Levels" />
          </div>

          {activeResult.monthlyProjections && <LineChartComponent data={activeResult.monthlyProjections} title="6-Month Inventory Forecast" />}
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter inventory data to forecast stock levels, detect issues, and optimize reordering.</div>}
    </div>
  )
})

export default InventoryForecastDashboard