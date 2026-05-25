/**
 * Shipment Transit Intelligence - Premium delivery time estimator with timeline, reliability gauge, and delay simulations
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Cloud, Calendar, ShieldAlert, TrendingUp } from 'lucide-react'
import { useDeliveryIntelligence } from '@/hooks/logistics/useLogisticsCalculations'
import { ProgressTimeline, AnimatedGauge, MetricCard, AreaTrend, CardSkeleton } from '../PremiumCharts'
import { SHIPPING_MODES } from '@/lib/logistics/premiumLogisticsMath'

const ShipmentTransitIntelligence = memo(() => {
  const [inputs, setInputs] = useState({})
  const [hasRun, setHasRun] = useState(false)
  const computedResult = useDeliveryIntelligence(inputs)
  const result = hasRun ? computedResult : null

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

  const timelineSteps = useMemo(() => {
    if (!result?.timeline) return []
    return result.timeline.map((stop, i) => ({
      label: stop.label,
      subtext: `${stop.distance} km - ${stop.hours}h`,
      completed: i < Math.floor(result.timeline.length / 2),
    }))
  }, [result])

  if (!hasRun) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Distance (km) *</label>
            <input type="number" placeholder="e.g., 1000" value={inputs.distance || ''} onChange={e => handleChange('distance', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Shipping Mode</label>
            <select value={inputs.mode || 'ground'} onChange={e => handleChange('mode', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 outline-none text-sm">
              {Object.entries(SHIPPING_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Weather Delay (hours)</label>
            <input type="number" placeholder="0" value={inputs.weatherDelay || 0} onChange={e => handleChange('weatherDelay', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 outline-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Peak Season Delay (hours)</label>
            <input type="number" placeholder="0" value={inputs.peakSeason || 0} onChange={e => handleChange('peakSeason', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 outline-none text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded-lg bg-muted/70 text-foreground hover:bg-muted/90 transition-colors">Reset</button>
          <button onClick={handleCalculate} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Start Analysis</button>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter distance to get transit intelligence
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
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter valid distance and retry Start Analysis
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="ETA" value={`${result.etaDays} days`} icon={Clock} prefix="" color="text-blue-400" />
        <MetricCard label="Reliability" value={`${result.reliability}%`} icon={ShieldAlert} prefix="" color="text-green-400" />
        <MetricCard label="Confidence" value={`${result.confidenceScore}%`} icon={TrendingUp} prefix="" color="text-purple-400" />
        <MetricCard label="Delivery Mode" value={result.mode} icon={MapPin} prefix="" color="text-orange-400" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="md:col-span-2 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Transit Timeline
          </h4>
          <ProgressTimeline steps={timelineSteps} currentStep={Math.floor(timelineSteps.length / 2)} />
        </div>

        {/* Gauges */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Reliability Score</h4>
            <AnimatedGauge value={result.reliability} max={100} label="Reliability" color={result.reliability > 85 ? '#10b981' : result.reliability > 70 ? '#f59e0b' : '#ef4444'} />
          </div>
          <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Delay Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Weather</span><span>{result.weatherDelay}h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Holiday</span><span>{result.holidayDelay}h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Peak Season</span><span>{result.peakDelay}h</span></div>
              <div className="flex justify-between font-medium border-t border-border/50 pt-2"><span>Total Delay</span><span>{(result.weatherDelay + result.holidayDelay + result.peakDelay).toFixed(1)}h</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Tracker UI */}
      <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Live Shipment Tracker
        </h4>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {result.timeline?.filter((_, i) => i % 2 === 0).map((stop, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className={`w-3 h-3 rounded-full ${i < Math.floor(result.timeline.length / 2) ? 'bg-primary' : 'bg-muted'}`} />
              <div className="text-xs">
                <p className="font-medium">{stop.label}</p>
                <p className="text-muted-foreground">{stop.distance} km</p>
              </div>
              {i < result.timeline.length - 1 && <div className="w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
})

export default ShipmentTransitIntelligence