/**
 * Volumetric Freight Analyzer - Compare airline/courier divisors with optimization meter
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Scale, Weight, TrendingDown, TrendingUp, Lightbulb, Download, Copy } from 'lucide-react'
import { useVolumetricAnalyzer } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { ComparisonBar, MetricCard, AnimatedGauge, UtilizationBar, CardSkeleton } from '../PremiumCharts'
import { toast } from 'sonner'

const VolumetricFreightAnalyzer = memo(() => {
  const [inputs, setInputs] = useState({})
  const result = useVolumetricAnalyzer(inputs)
  const { exportJSON, copyResult } = useExportTools('volumetric-freight-analyzer')

  const handleChange = useCallback((name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  const chartData = useMemo(() => {
    if (!result?.comparisons) return []
    return result.comparisons.map(c => ({
      name: c.name.includes('(') ? c.name.split('(')[0].trim() : c.name.split(' ')[0],
      value: c.volumetric,
      color: c.isHigher ? '#ef4444' : '#10b981',
    }))
  }, [result])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['length', 'width', 'height'].map(f => (
          <div key={f} className="space-y-1">
            <label className="text-[10px] text-muted-foreground">{f.charAt(0).toUpperCase() + f.slice(1)} (cm)</label>
            <input type="number" step="0.1" value={inputs[f] || ''} onChange={e => handleChange(f, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Actual Weight (kg)</label>
          <input type="number" step="0.1" value={inputs.actualWeight || ''} onChange={e => handleChange('actualWeight', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Unit</label>
          <select value={inputs.unit || 'cm'} onChange={e => handleChange('unit', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
            <option value="cm">CM</option>
            <option value="m">Meters</option>
            <option value="in">Inches</option>
          </select>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Volume (cm³)" value={result.volumeCm3} icon={Weight} prefix="" color="text-blue-400" />
            {result.cbm > 0 && <MetricCard label="CBM" value={result.cbm} icon={Scale} prefix="" color="text-green-400" />}
            <MetricCard label="Best Divisor" value={result.bestDivisor} icon={TrendingDown} prefix="" color="text-purple-400" />
            <MetricCard label="Volume/Weight" value={result.comparisons?.[0]?.volumetric ? `${result.comparisons[0].volumetric} kg` : 'N/A'} icon={TrendingUp} prefix="" color="text-orange-400" />
          </div>

          <ComparisonBar data={chartData} title="Volumetric Weight by Divisor" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Optimization Meter</h4>
              <AnimatedGauge
                value={inputs.actualWeight && result.comparisons[0]?.volumetric > inputs.actualWeight ? 35 : 85}
                max={100}
                label="Efficiency"
                color={inputs.actualWeight && result.comparisons[0]?.volumetric > inputs.actualWeight * 1.5 ? '#ef4444' : '#10b981'}
              />
              <p className="text-center text-xs text-muted-foreground mt-2">
                {inputs.actualWeight && result.comparisons[0]?.volumetric > inputs.actualWeight * 1.5
                  ? 'Package is very dimension-heavy - resize recommended'
                  : 'Package dimensions are reasonably efficient'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Divisor Comparison Table</h4>
              <div className="space-y-2">
                {result.comparisons.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-muted/30">
                    <span>{c.name}</span>
                    <span className={`font-medium ${c.isHigher ? 'text-red-400' : 'text-green-400'}`}>
                      {c.chargeable.toFixed(2)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result.recommendations?.length > 0 && (
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Recommendations
              </h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
            <button onClick={() => { copyResult(JSON.stringify(result)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</button>
            <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> JSON</button>
          </div>
        </>
      )}

      {!result && !inputs.length && !inputs.width && !inputs.height && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter dimensions to analyze volumetric weight
        </div>
      )}
    </motion.div>
  )
})

export default VolumetricFreightAnalyzer