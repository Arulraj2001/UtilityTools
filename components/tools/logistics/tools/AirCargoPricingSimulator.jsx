/**
 * Air Cargo Pricing Simulator - Airline comparisons, surcharges, customs, import/export tax simulation
 */
// @ts-nocheck
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plane, DollarSign, Shield, TrendingUp, Download, Copy } from 'lucide-react'
import { useAirFreightPricing } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { CostStack, MetricCard, ComparisonBar, CardSkeleton, COLORS } from '../PremiumCharts'
import { AIRLINES, FREIGHT_CLASSES } from '@/lib/logistics/premiumLogisticsMath'
import { toast } from 'sonner'

const AirCargoPricingSimulator = memo(() => {
  const [inputs, setInputs] = useState({})
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useAirFreightPricing(inputs)
  const result = hasRun ? computedResult : null
  const { exportJSON, copyResult } = useExportTools('air-cargo-pricing')

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

  const costStackData = useMemo(() => {
    if (!result) return []
    return [{
      name: 'Air Freight',
      Base: result.baseFreight,
      Fuel: result.fuelSurcharge,
      Security: result.securityFee,
      Airport: result.airportFee,
      DG: result.dgSurcharge,
      Customs: result.customs,
      Tax: result.importTax + result.exportTax,
    }]
  }, [result])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Weight (kg) *</label>
          <input type="number" value={inputs.actualWeight || ''} onChange={e => handleChange('actualWeight', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Length (cm)</label>
          <input type="number" value={inputs.length || ''} onChange={e => handleChange('length', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Width (cm)</label>
          <input type="number" value={inputs.width || ''} onChange={e => handleChange('width', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Height (cm)</label>
          <input type="number" value={inputs.height || ''} onChange={e => handleChange('height', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Airline</label>
          <select value={inputs.airline || 'emirates'} onChange={e => handleChange('airline', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
            {Object.entries(AIRLINES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Cargo Class</label>
          <select value={inputs.cargoClass || ''} onChange={e => handleChange('cargoClass', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
            <option value="">Standard</option>
            {FREIGHT_CLASSES.slice(0, 8).map(fc => <option key={fc.class} value={fc.label}>{fc.class}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Rate/kg (₹)</label>
          <input type="number" value={inputs.ratePerKg || ''} onChange={e => handleChange('ratePerKg', e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground flex items-center gap-1">DG <input type="checkbox" checked={inputs.dangerousGoods || false} onChange={e => handleChange('dangerousGoods', e.target.checked)} className="ml-1" /></label></div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
        <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Chargeable Weight" value={`${result.chargeable} kg`} icon={Plane} prefix="" color="text-blue-400" />
            <MetricCard label="Base Freight" value={result.baseFreight} icon={DollarSign} color="text-green-400" />
            <MetricCard label="Total Cost" value={result.total} icon={TrendingUp} color="text-purple-400" />
            <MetricCard label="Density" value={`${result.density} kg/m³`} icon={Shield} prefix="" color="text-orange-400" />
          </div>

          <CostStack data={costStackData} title="Cost Breakdown by Component" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-card/80 to-card/40 border border-border/50 rounded-xl">
            <div className="text-xs"><span className="text-muted-foreground">Fuel Surcharge</span><p className="font-bold">₹{result.fuelSurcharge.toFixed(2)}</p></div>
            <div className="text-xs"><span className="text-muted-foreground">Airport Fee</span><p className="font-bold">₹{result.airportFee.toFixed(2)}</p></div>
            <div className="text-xs"><span className="text-muted-foreground">Security Fee</span><p className="font-bold">₹{result.securityFee.toFixed(2)}</p></div>
            <div className="text-xs"><span className="text-muted-foreground">Customs</span><p className="font-bold">₹{result.customs.toFixed(2)}</p></div>
            {result.dgSurcharge > 0 && <div className="text-xs"><span className="text-muted-foreground">DG Surcharge</span><p className="font-bold text-red-400">₹{result.dgSurcharge.toFixed(2)}</p></div>}
            <div className="text-xs"><span className="text-muted-foreground">Import Tax</span><p className="font-bold">₹{result.importTax.toFixed(2)}</p></div>
            <div className="text-xs"><span className="text-muted-foreground">Export Tax</span><p className="font-bold">₹{result.exportTax.toFixed(2)}</p></div>
            <div className="text-xs"><span className="text-muted-foreground">Airline</span><p className="font-bold text-primary">{result.airline}</p></div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
            <button onClick={() => { copyResult(JSON.stringify(result)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</button>
            <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> JSON</button>
          </div>
        </>
      )}

      {hasRun && !result && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter valid weight and dimensions then press Start Analysis
        </div>
      )}
      {!hasRun && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter weight and dimensions then press Start Analysis
        </div>
      )}
    </motion.div>
  )
})

export default AirCargoPricingSimulator