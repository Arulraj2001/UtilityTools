/**
 * 3D Cargo Volume Planner - Multi-package CBM calculator with container preview and utilization
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Cuboid, Weight, Box, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useCBMPlanner } from '@/hooks/logistics/useLogisticsCalculations'
import { MetricCard, UtilizationBar, ComparisonBar, CardSkeleton } from '../PremiumCharts'
import { CONTAINER_TYPES } from '@/lib/logistics/premiumLogisticsMath'

const CargoVolumePlanner = memo(() => {
  const [parcels, setParcels] = useState([{ length: 1.2, width: 0.8, height: 1.0, weight: 50, quantity: 1 }])
  const [unit, setUnit] = useState('m')
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useCBMPlanner(parcels, unit)
  const result = hasRun ? computedResult : null

  const updateParcel = useCallback((i, field, value) => {
    setHasRun(false)
    setParcels(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: parseFloat(value) || 0 } : p))
  }, [])

  const addParcel = useCallback(() => {
    setHasRun(false)
    setParcels(prev => [...prev, { length: 1.0, width: 0.6, height: 0.8, weight: 30, quantity: 1 }])
  }, [])

  const removeParcel = useCallback((i) => {
    setHasRun(false)
    setParcels(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const handleCalculate = useCallback(() => {
    setHasRun(true)
  }, [])

  const handleReset = useCallback(() => {
    setParcels([{ length: 1.2, width: 0.8, height: 1.0, weight: 50, quantity: 1 }])
    setUnit('m')
    setHasRun(false)
  }, [])

  const containerUtilData = useMemo(() => {
    if (!result?.containerFit) return []
    return Object.entries(result.containerFit).map(([k, v]) => ({
      name: k,
      value: v.utilization,
      color: v.utilization > 80 ? '#10b981' : v.utilization > 50 ? '#f59e0b' : '#ef4444',
    }))
  }, [result])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header + Add */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => { setHasRun(false); setUnit(unit === 'm' ? 'cm' : 'm') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            Unit: {unit === 'm' ? 'Meters' : 'CM'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
          <button onClick={addParcel} className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Package
          </button>
        </div>
      </div>

      {/* Parcel Inputs */}
      <div className="space-y-2">
        {parcels.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-2 p-3 bg-gradient-to-br from-card/60 to-card/20 border border-border/50 rounded-xl items-end">
            {['length', 'width', 'height', 'weight'].map(f => (
              <div key={f} className="flex-1 min-w-[60px]">
                <label className="text-[10px] text-muted-foreground uppercase">{f === 'weight' ? 'Wt (kg)' : f[0].toUpperCase() + f.slice(1)}</label>
                <input type="number" step="0.1" value={p[f] || ''} onChange={e => updateParcel(i, f, e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
              </div>
            ))}
            <div className="w-16">
              <label className="text-[10px] text-muted-foreground uppercase">Qty</label>
              <input type="number" value={p.quantity || 1} onChange={e => updateParcel(i, 'quantity', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
            </div>
            {parcels.length > 1 && (
              <button onClick={() => removeParcel(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {result && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Volume" value={`${result.totalCBM} m³`} icon={Cuboid} prefix="" color="text-blue-400" />
            <MetricCard label="Total Weight" value={result.totalWeight} icon={Weight} color="text-green-400" />
            <MetricCard label="Density" value={`${result.density} kg/m³`} icon={TrendingUp} prefix="" color="text-purple-400" />
            <MetricCard label="Classification" value={result.densityClass} icon={Box} prefix="" color="text-orange-400" />
          </div>

          {/* Utilization bars */}
          <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Container Space Utilization</h4>
            <div className="space-y-3">
              {containerUtilData?.slice(0, 4).map(d => (
                <UtilizationBar key={d.name} value={d.value} label={d.name} color={d.color} />
              ))}
            </div>
          </div>

          {/* Freight Recommendation */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4">
            <p className="text-sm font-medium">Recommendation: <span className="text-primary">{result.freightRecommendation}</span></p>
          </div>
        </>
      )}

      {!result && parcels.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Cuboid className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Adjust package dimensions to see volume calculations
        </div>
      )}
    </motion.div>
  )
})

export default CargoVolumePlanner