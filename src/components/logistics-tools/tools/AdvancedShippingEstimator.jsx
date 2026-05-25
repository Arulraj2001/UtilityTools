/**
 * Advanced Shipping Estimator - Multi-courier comparison with waterfall chart, monthly forecast, peak pricing simulation
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Truck, DollarSign, TrendingUp, Download, Copy, Plus, Trash2, Clock, Shield } from 'lucide-react'
import { useShippingEstimator, useShippingState } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { MetricCard, CourierCard, TrendLine, CostDonut, ComparisonBar, CardSkeleton } from '../PremiumCharts'
import { SHIPPING_MODES } from '@/lib/logistics/premiumLogisticsMath'
import { toast } from 'sonner'

const AdvancedShippingEstimator = memo(() => {
  const [inputs, setInputs] = useState({ packages: [], distance: '', mode: '', insurance: false, cod: false, gst: false, fuelAdjustment: false, peakPricing: false })
  const { packages, setPackages, addPackage, removePackage, updatePackage } = useShippingState([{ length: '', width: '', height: '', weight: '', quantity: '', unit: 'cm' }])
  const [selectedCourier, setSelectedCourier] = useState(null)
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useShippingEstimator({ ...inputs, packages })
  const result = hasRun ? computedResult : null
  const { exportJSON, exportArrayCSV, copyResult } = useExportTools('shipping-estimator')

  const handleChange = useCallback(
    /** @param {string} name @param {string|boolean} value */
    (name, value) => {
      setHasRun(false)
      setInputs(prev => ({ ...prev, [name]: value }))
    }, [])

  const handleCalculate = useCallback(() => {
    setHasRun(true)
  }, [])

  const handleReset = useCallback(() => {
    setInputs({ packages: [], distance: '', mode: '', insurance: false, cod: false, gst: false, fuelAdjustment: false, peakPricing: false })
    setPackages([{ length: '', width: '', height: '', weight: '', quantity: '', unit: 'cm' }])
    setSelectedCourier(null)
    setHasRun(false)
  }, [setPackages])

  const monthlyData = useMemo(() => {
    if (!result?.monthlyForecast) return []
    return result.monthlyForecast.map(m => ({ month: m.month, value: m.cost, value2: m.shipments * 10 }))
  }, [result])

  const costDonutData = useMemo(() => {
    if (!result) return []
    return [
      { name: 'Base Cost', value: result.baseCost || 0 },
      { name: 'Insurance', value: result.insuranceCost || 0 },
      { name: 'COD Fee', value: result.codFee || 0 },
      { name: 'Fuel Adj', value: result.fuelAdjustment || 0 },
      { name: 'Peak Adj', value: result.peakPricing || 0 },
      { name: 'GST', value: result.gst || 0 },
    ]
  }, [result])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Toggles */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Mode:</label>
          <select value={inputs.mode} onChange={e => handleChange('mode', e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
            <option value="" disabled hidden>Select mode</option>
            {Object.entries(SHIPPING_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={inputs.insurance} onChange={e => handleChange('insurance', e.target.checked)} /> Insurance</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={inputs.cod} onChange={e => handleChange('cod', e.target.checked)} /> COD</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={inputs.fuelAdjustment} onChange={e => handleChange('fuelAdjustment', e.target.checked)} /> Fuel Adj</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={inputs.peakPricing} onChange={e => handleChange('peakPricing', e.target.checked)} /> Peak Pricing</label>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex-1 max-w-[200px] space-y-1">
          <label className="text-[10px] text-muted-foreground">Distance (km) *</label>
          <input type="number" value={inputs.distance || ''} onChange={e => handleChange('distance', e.target.value)} placeholder="e.g. 120"
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
          <button onClick={addPackage} className="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Package</button>
        </div>
      </div>

      {/* Package inputs */}
      <div className="space-y-2">
        {packages.map((pkg, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-2 p-3 bg-gradient-to-br from-card/60 to-card/20 border border-border/50 rounded-xl items-end">
            {['length', 'width', 'height', 'weight'].map(f => (
              <div key={f} className="flex-1 min-w-[60px]">
                <label className="text-[10px] text-muted-foreground uppercase">{f === 'weight' ? 'Wt (kg)' : f[0].toUpperCase() + f.slice(1)}</label>
                <input type="number" value={pkg[f] || ''} onChange={e => updatePackage(i, f, e.target.value)} placeholder={f === 'weight' ? 'kg' : 'cm'}
                  className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
              </div>
            ))}
            <div className="w-14">
              <label className="text-[10px] text-muted-foreground uppercase">Qty</label>
              <input type="number" value={pkg.quantity || ''} onChange={e => updatePackage(i, 'quantity', e.target.value)} placeholder="1"
                className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
            </div>
            {packages.length > 1 && <button onClick={() => removePackage(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
          </motion.div>
        ))}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Chargeable" value={`${result.totalChargeable} kg`} icon={Truck} prefix="" color="text-blue-400" />
            <MetricCard label="Base Cost" value={result.baseCost} icon={DollarSign} color="text-green-400" />
            <MetricCard label="Total with GST" value={result.total} icon={TrendingUp} color="text-purple-400" />
            <MetricCard label="ETA" value={`${result.etaDays} days`} icon={Clock} prefix="" color="text-orange-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CostDonut data={costDonutData} title="Cost Breakdown" />
            <TrendLine data={monthlyData} title="Monthly Forecast" />
          </div>

          {result.courierEstimates?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Courier Estimates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {result.courierEstimates.map((c, i) => (
                  <CourierCard key={i} courier={c} selected={selectedCourier?.name === c.name} onSelect={setSelectedCourier} />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
            <button onClick={() => { copyResult(JSON.stringify(result)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</button>
            <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> JSON</button>
            <button onClick={() => exportArrayCSV(result.monthlyForecast)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> CSV</button>
          </div>
        </>
      )}

      {hasRun && !result && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter valid distance and package details then press Start Analysis
        </div>
      )}
      {!hasRun && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Prepare your shipment details and press Start Analysis
        </div>
      )}
    </motion.div>
  )
})

export default AdvancedShippingEstimator