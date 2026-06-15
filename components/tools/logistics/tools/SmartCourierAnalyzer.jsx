/**
 * Smart Courier Cost Analyzer - Premium courier comparison with charts, gauges, and projections
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Clock, DollarSign, Shield, Zap, Download, Copy, TrendingUp, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { useCourierAnalysis } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { CostDonut, ComparisonBar, MetricCard, AnimatedGauge, CourierCard, CardSkeleton, Shimmer } from '../PremiumCharts'
import { COURIER_COMPANIES } from '@/lib/logistics/premiumLogisticsMath'

const INPUT_FIELDS = [
  { name: 'weight', label: 'Package Weight (kg)', type: 'number', placeholder: '2.5', default: '' },
  { name: 'distance', label: 'Distance (km)', type: 'number', placeholder: '500', default: '' },
  { name: 'parcelType', label: 'Parcel Type', type: 'select', options: ['standard', 'fragile', 'document', 'perishable'], default: 'standard' },
  { name: 'deliverySpeed', label: 'Delivery Speed', type: 'select', options: ['standard', 'express', 'overnight'], default: 'standard' },
  { name: 'codAmount', label: 'COD Amount (₹) - Optional', type: 'number', placeholder: '0', default: '' },
  { name: 'insurance', label: 'Insurance Value (₹) - Optional', type: 'number', placeholder: '0', default: '' },
]

const SmartCourierAnalyzer = memo(() => {
  const [inputs, setInputs] = useState({})
  const [selectedCourier, setSelectedCourier] = useState(null)
  const [showComparison, setShowComparison] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useCourierAnalysis(inputs)
  const result = hasRun ? computedResult : null
  const { exportJSON, exportArrayCSV, copyResult } = useExportTools('courier-analyzer')

  const handleChange = useCallback((name, value) => {
    setHasRun(false)
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleCalculate = useCallback(() => {
    setHasRun(true)
  }, [])

  const handleReset = useCallback(() => {
    setInputs({})
    setSelectedCourier(null)
    setShowComparison(false)
    setHasRun(false)
  }, [])

  const donutData = useMemo(() => {
    if (!result || result.length === 0) return null
    const selected = selectedCourier || result[0]
    return [
      { name: 'Base Freight', value: selected.baseFreight || 0 },
      { name: 'Fuel Surcharge', value: selected.fuelCharge || 0 },
      { name: 'COD Fee', value: selected.codFee || 0 },
      { name: 'Insurance', value: selected.insuranceCharge || 0 },
      { name: 'GST', value: selected.gst || 0 },
    ]
  }, [result, selectedCourier])

  const comparisonData = useMemo(() => {
    if (!result || result.length === 0) return null
    return result.map(r => ({ name: r.courier.split(' ')[0], value: r.total, color: r.isCheapest ? '#10b981' : '#6b7280' }))
  }, [result])

  if (!hasRun) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INPUT_FIELDS.slice(0, 2).map(field => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {INPUT_FIELDS.slice(2).map(field => field.type === 'select' ? (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <select
                value={inputs[field.name] || field.default}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm"
              >
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ) : (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter weight and distance to compare courier charges
        </div>
      </div>
    )
  }

  if (hasRun && (!result || result.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter valid weight and distance then press Start Analysis
        </div>
      </div>
    )
  }

  const bestCourier = Array.isArray(result) && result.length > 0 ? result[0] : null
  const displayCourier = selectedCourier || bestCourier || { total: 0, etaDays: 0, courier: 'N/A' }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Input strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
        {INPUT_FIELDS.slice(0, 4).map(field => field.type === 'select' ? (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">{field.label}</label>
            <select
              value={inputs[field.name] || field.default}
              onChange={e => handleChange(field.name, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none"
            >
              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ) : (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">{field.label}</label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={inputs[field.name] || ''}
              onChange={e => handleChange(field.name, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none focus:border-primary/50"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
        <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Best Price" value={bestCourier?.total} icon={DollarSign} color="text-green-400" />
        <MetricCard label="Fastest Delivery" value={`${bestCourier?.etaDays || 0} days`} icon={Clock} prefix="" color="text-blue-400" />
        <MetricCard label="Couriers Compared" value={result.length} icon={ArrowLeftRight} prefix="" color="text-purple-400" />
        <MetricCard label="Avg. Cost/kg" value={bestCourier ? (bestCourier.total / parseFloat(inputs.weight || 1)).toFixed(2) : 0} icon={TrendingUp} prefix="₹" color="text-orange-400" />
      </div>

      {/* Courier Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {result.map((courier, i) => (
          <CourierCard
            key={courier.courier}
            courier={courier}
            selected={selectedCourier?.courier === courier.courier}
            onSelect={setSelectedCourier}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostDonut data={donutData} title="Cost Breakdown" />
        <ComparisonBar data={comparisonData} title="Total Cost Comparison" />
      </div>

      {/* Speed vs Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Delivery Speed Meter</h4>
          <div className="flex items-center justify-center">
            <AnimatedGauge
              value={displayCourier.etaDays <= 2 ? 95 : displayCourier.etaDays <= 4 ? 70 : 40}
              max={100}
              label="Speed Score"
              color={displayCourier.etaDays <= 2 ? '#10b981' : displayCourier.etaDays <= 4 ? '#f59e0b' : '#ef4444'}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {displayCourier.courier}: {displayCourier.etaDays} day(s) delivery
          </p>
        </div>
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Monthly Projection</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Per shipment</span>
              <span className="font-bold">₹{(displayCourier.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly (20 shipments)</span>
              <span className="font-bold">₹{((displayCourier.total || 0) * 20).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Yearly projection</span>
              <span className="font-bold text-primary">₹{((displayCourier.total || 0) * 240).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 justify-end border-t border-border/50 pt-4">
        <button onClick={() => { copyResult(JSON.stringify(result, null, 2)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5">
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5">
          <Download className="w-3 h-3" /> JSON
        </button>
        <button onClick={() => exportArrayCSV(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>
    </motion.div>
  )
})

export default SmartCourierAnalyzer