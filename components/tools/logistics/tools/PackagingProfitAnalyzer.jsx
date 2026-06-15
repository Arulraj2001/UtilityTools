/**
 * Packaging Profit Analyzer - Monthly forecasts, sustainability score, bulk discounts
 */
// @ts-nocheck
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Box, Leaf, TrendingUp, DollarSign, Download } from 'lucide-react'
import { usePackagingAnalysis } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { MetricCard, AnimatedGauge, TrendLine } from '../PremiumCharts'
import { PACKAGING_TYPES } from '@/lib/logistics/premiumLogisticsMath'

const PackagingProfitAnalyzer = memo(() => {
  const [inputs, setInputs] = useState({
    boxCost: '',
    tapeCost: '',
    fillerCost: '',
    labelCost: '',
    laborCost: '',
    quantity: '',
    monthlyShipments: '',
    packagingType: '',
  })
  const [hasRun, setHasRun] = useState(false)
  const computedResult = usePackagingAnalysis(inputs)
  const result = hasRun ? computedResult : null
  const { exportJSON } = useExportTools('packaging-profit-analyzer')

  const handleChange = useCallback((name, value) => {
    setHasRun(false)
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleCalculate = useCallback(() => {
    setHasRun(true)
  }, [])

  const handleReset = useCallback(() => {
    setInputs({
      boxCost: '',
      tapeCost: '',
      fillerCost: '',
      labelCost: '',
      laborCost: '',
      quantity: '',
      monthlyShipments: '',
      packagingType: '',
    })
    setHasRun(false)
  }, [])

  const monthlyTrend = useMemo(() => {
    if (!result) return []
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2026, i, 1).toLocaleString('default', { month: 'short' }),
      value: result.monthlyTotal * (1 + Math.sin(i / 2) * 0.2),
      value2: result.monthlyRevenue * (1 + Math.sin(i / 2) * 0.2),
    }))
  }, [result])

  if (!hasRun || !result) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'boxCost', label: 'Box (₹)', placeholder: '15' },
            { name: 'tapeCost', label: 'Tape (₹)', placeholder: '2' },
            { name: 'fillerCost', label: 'Filler (₹)', placeholder: '3' },
            { name: 'labelCost', label: 'Label (₹)', placeholder: '1' },
            { name: 'laborCost', label: 'Labor (₹)', placeholder: '5' },
          ].map(f => (
            <div key={f.name} className="space-y-1">
              <label className="text-[10px] text-muted-foreground">{f.label}</label>
              <input
                type="number"
                placeholder={f.placeholder}
                value={inputs[f.name] || ''}
                onChange={e => handleChange(f.name, e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Qty</label>
            <input
              type="number"
              placeholder="100"
              value={inputs.quantity || ''}
              onChange={e => handleChange('quantity', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Monthly Shipments</label>
            <input
              type="number"
              placeholder="120"
              value={inputs.monthlyShipments || ''}
              onChange={e => handleChange('monthlyShipments', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Package Type</label>
            <select
              value={inputs.packagingType || ''}
              onChange={e => handleChange('packagingType', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none"
            >
              <option value="" disabled hidden>Select package type</option>
              {Object.entries(PACKAGING_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleCalculate}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Start Analysis
          </button>
        </div>

        <div className="text-center py-8 text-muted-foreground text-sm">
          Enter your packaging details and press Start Analysis to view cost, profit, and sustainability projections.
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Per Unit Cost" value={result.perUnitMaterial} icon={Box} color="text-blue-400" />
        <MetricCard label="Total Batch" value={result.totalBatch} icon={DollarSign} color="text-green-400" />
        <MetricCard label="Profit Margin" value={`${result.profitMargin}%`} icon={TrendingUp} prefix="" color="text-purple-400" />
        <MetricCard label="Sustainability" value={result.sustainabilityLabel} icon={Leaf} prefix="" color={result.sustainabilityScore >= 80 ? 'text-green-400' : 'text-yellow-400'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Sustainability Score</h4>
          <AnimatedGauge
            value={result.sustainabilityScore}
            max={100}
            label="Score"
            color={result.sustainabilityScore >= 80 ? '#10b981' : result.sustainabilityScore >= 60 ? '#f59e0b' : '#ef4444'}
          />
        </div>
        <div className="md:col-span-2">
          <TrendLine data={monthlyTrend} title="Monthly Revenue vs Cost" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Monthly Projections</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Cost</span><span className="font-bold">₹{result.monthlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Revenue</span><span className="font-bold text-green-400">₹{result.monthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Profit</span><span className="font-bold text-primary">₹{result.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Yearly Total</span><span className="font-bold">₹{result.yearlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Waste & Bulk</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly Waste</span><span className="font-bold text-red-400">₹{result.monthlyWaste.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bulk Discount</span><span className="font-bold text-green-400">{result.bulkDiscount}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">With Bulk</span><span className="font-bold">₹{result.perUnitWithBulk.toFixed(2)}/unit</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Selling Price</span><span className="font-bold">₹{result.estimatedSellingPrice.toFixed(2)}/unit</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => exportJSON(result)}
          className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"
        >
          <Download className="w-3 h-3" /> JSON
        </button>
      </div>
    </motion.div>
  )
})

export default PackagingProfitAnalyzer
