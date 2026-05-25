/**
 * Freight Billing Optimizer - Actual vs volumetric weight comparison with cost impact
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Scale, Weight, TrendingDown, DollarSign, Download, Copy } from 'lucide-react'
import { useChargeableWeight } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { ComparisonBar, MetricCard, AnimatedGauge, UtilizationBar, CardSkeleton } from '../PremiumCharts'
import { toast } from 'sonner'

const FreightBillingOptimizer = memo(() => {
  const [inputs, setInputs] = useState({})
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useChargeableWeight(inputs)
  const result = hasRun ? computedResult : null
  const { exportJSON, copyResult } = useExportTools('freight-billing-optimizer')

  const handleChange = useCallback((name, value) => {
    setHasRun(false)
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleCalculate = useCallback(() => {
    setHasRun(true)
  }, [])

  const handleReset = useCallback(() => {
    setInputs({})
    setHasRun(false)
  }, [])

  const chartData = useMemo(() => {
    if (!result) return []
    return [
      { name: 'Actual', value: result.actualWeight, color: '#3b82f6' },
      { name: 'Volumetric', value: result.volumetricWeight, color: '#f59e0b' },
      { name: 'Chargeable', value: result.chargeable, color: '#10b981' },
    ]
  }, [result])

  if (!hasRun) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['actualWeight', 'length', 'width', 'height'].map(f => (
            <div key={f} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f === 'actualWeight' ? 'Actual Weight (kg)' : `${f.charAt(0).toUpperCase() + f.slice(1)} (cm)`}</label>
              <input type="number" step="0.1" placeholder="0" value={inputs[f] || ''} onChange={e => handleChange(f, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Divisor</label>
            <input type="number" value={inputs.divisor || 5000} onChange={e => handleChange('divisor', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 outline-none text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter weight and dimensions to analyze billing
        </div>
      </div>
    )
  }

  if (hasRun && !result) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter valid weight and dimensions then press Start Analysis
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Actual Weight" value={`${result.actualWeight} kg`} icon={Weight} prefix="" color="text-blue-400" />
        <MetricCard label="Volumetric" value={`${result.volumetricWeight} kg`} icon={Weight} prefix="" color="text-yellow-400" />
        <MetricCard label="Chargeable" value={`${result.chargeable} kg`} icon={Scale} prefix="" color="text-green-400" />
        <MetricCard label="Impact" value={`${result.impactPct}%`} icon={TrendingDown} prefix="" color={result.isVolumetricBilled ? 'text-red-400' : 'text-green-400'} />
      </div>

      <ComparisonBar data={chartData} title="Weight Comparison" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Billing Scale</h4>
          <div className="flex items-center justify-center">
            <AnimatedGauge value={result.isVolumetricBilled ? 75 : 25} max={100} label={result.isVolumetricBilled ? 'Volumetric' : 'Actual'} 
              color={result.isVolumetricBilled ? '#f59e0b' : '#10b981'} />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {result.isVolumetricBilled ? 'Volumetric weight determines billing' : 'Actual weight determines billing'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Savings Suggestion</h4>
          <p className="text-sm">{result.savingsSuggestion?.message || 'No optimization needed'}</p>
          {result.savingsSuggestion?.reductionNeeded > 0 && (
            <div className="mt-2">
              <UtilizationBar value={60} label="Optimization Potential" color="#10b981" />
            </div>
          )}
        </div>
      </div>

      {result.courierComparisons?.length > 0 && (
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Courier Divisor Comparison</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {result.courierComparisons.map((c, i) => (
              <div key={i} className="p-2 bg-muted/30 rounded-lg text-xs">
                <p className="font-medium">{c.courier}</p>
                <p>Divisor: {c.divisor}</p>
                <p>Chargeable: {c.chargeable} kg</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
        <button onClick={() => { copyResult(JSON.stringify(result)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</button>
        <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> JSON</button>
      </div>
    </motion.div>
  )
})

export default FreightBillingOptimizer