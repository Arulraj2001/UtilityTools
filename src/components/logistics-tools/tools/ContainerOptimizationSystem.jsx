/**
 * Container Optimization System - Multi-package loading with utilization scoring and weight balancing
 */
import React, { memo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Box, Plus, Trash2, Cuboid, Weight, TrendingUp, Scale } from 'lucide-react'
import { useContainerOptimization } from '@/hooks/logistics/useLogisticsCalculations'
import { MetricCard, UtilizationBar, AnimatedGauge } from '../PremiumCharts'
import { CONTAINER_TYPES } from '@/lib/logistics/premiumLogisticsMath'

/**
 * @typedef {{length:number,width:number,height:number,weight:number,quantity:number}} PackageInput
 * @typedef {{
 *   container:string,
 *   containerVolume:number,
 *   containerMaxLoad:number,
 *   totalItems:number,
 *   totalVolume:number,
 *   totalWeight:number,
 *   utilization:number,
 *   deadSpace:number,
 *   weightUtilization:number,
 *   score:number,
 *   scoreLabel:string,
 *   items:Array<{
 *     length:number,
 *     width:number,
 *     height:number,
 *     weight:number,
 *     quantity:number,
 *     cbm:number,
 *     fitCount:number,
 *     orientation:string,
 *     fitPerContainer:number
 *   }>
 * }} ContainerOptimizationResult
 */

const DEFAULT_PACKAGES = [{ length: 100, width: 80, height: 60, weight: 50, quantity: 1 }]

const ContainerOptimizationSystem = memo(() => {
  const [packages, setPackages] = useState(/** @type {PackageInput[]} */ (DEFAULT_PACKAGES))
  const [containerType, setContainerType] = useState('20ft')
  const [hasRun, setHasRun] = useState(false)
  /** @type {ContainerOptimizationResult | null} */
  const computedResult = useContainerOptimization(packages, containerType)
  /** @type {ContainerOptimizationResult | null} */
  const result = hasRun ? computedResult : null

  const updatePkg = useCallback(
    /**
     * @param {number} i
     * @param {'length'|'width'|'height'|'weight'|'quantity'} field
     * @param {string} value
     */
    (i, field, value) => {
      setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: parseFloat(value) || 0 } : p))
    },
    [])

  const runAnalysis = useCallback(() => {
    setHasRun(true)
  }, [])

  const resetAnalysis = useCallback(() => {
    setPackages(DEFAULT_PACKAGES)
    setContainerType('20ft')
    setHasRun(false)
  }, [])

  const addPackage = useCallback(() => {
    setPackages(prev => [...prev, { length: 80, width: 60, height: 40, weight: 30, quantity: 1 }])
  }, [])

  const removePackage = useCallback(
    /** @param {number} i */
    (i) => {
      setPackages(prev => prev.filter((_, idx) => idx !== i))
    },
    [])

  /** @type {Array<'length'|'width'|'height'|'weight'>} */
  const dimensionFields = ['length', 'width', 'height', 'weight']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Container:</label>
            <select value={containerType} onChange={e => setContainerType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
              {Object.entries(CONTAINER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          <button onClick={addPackage} className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Package Type
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={runAnalysis} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            Start Analysis
          </button>
          <button onClick={resetAnalysis} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {packages.map((pkg, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-2 p-3 bg-gradient-to-br from-card/60 to-card/20 border border-border/50 rounded-xl items-end">
            {dimensionFields.map(f => {
              /** @type {'length'|'width'|'height'|'weight'} */
              const field = f
              return (
                <div key={field} className="flex-1 min-w-[60px]">
                  <label className="text-[10px] text-muted-foreground uppercase">{field === 'weight' ? 'Wt (kg)' : field[0].toUpperCase() + field.slice(1)}</label>
                  <input type="number" value={pkg[field] || ''} onChange={e => updatePkg(i, field, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
                </div>
              )
            })}
            <div className="w-16">
              <label className="text-[10px] text-muted-foreground uppercase">Qty</label>
              <input type="number" value={pkg.quantity || 1} onChange={e => updatePkg(i, 'quantity', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
            </div>
            {packages.length > 1 && (
              <button onClick={() => removePackage(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </motion.div>
        ))}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Container" value={result.container} icon={Cuboid} prefix="" color="text-blue-400" />
            <MetricCard label="Total Items" value={result.totalItems} icon={Box} prefix="" color="text-green-400" />
            <MetricCard label="Total Weight" value={result.totalWeight} icon={Weight} color="text-purple-400" />
            <MetricCard label="Score" value={result.scoreLabel} icon={TrendingUp} prefix="" color={result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Utilization Score</h4>
              <AnimatedGauge value={result.score} max={100} label="Score" color={result.score >= 80 ? '#10b981' : result.score >= 60 ? '#f59e0b' : '#ef4444'} />
            </div>
            <div className="md:col-span-2 space-y-3 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Space & Weight Utilization</h4>
              <UtilizationBar value={result.utilization} label="Space Utilization" color={result.utilization > 80 ? '#10b981' : result.utilization > 50 ? '#f59e0b' : '#ef4444'} />
              <UtilizationBar value={result.weightUtilization} label="Weight Capacity" color={result.weightUtilization > 80 ? '#10b981' : result.weightUtilization > 50 ? '#f59e0b' : '#ef4444'} />
              <div className="flex justify-between text-xs pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Dead Space: {result.deadSpace.toFixed(2)} m³</span>
                <span className="text-muted-foreground">Container Volume: {result.containerVolume} m³</span>
              </div>
            </div>
          </div>

          {result.items?.length > 0 && (
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Package Fit Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.items.map((item, i) => (
                  <div key={i} className="p-2 bg-muted/30 rounded-lg text-xs">
                    <p className="font-medium">{item.length}×{item.width}×{item.height}cm</p>
                    <p className="text-muted-foreground">Fits per container: {item.fitPerContainer}</p>
                    {item.orientation && <p className="text-muted-foreground">Orientation: {item.orientation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
})

export default ContainerOptimizationSystem