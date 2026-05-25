/**
 * Amazon Seller Profit Intelligence - Premium Amazon fee analyzer with charts, KPIs, and forecasting
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, Package, BarChart3, Calculator, Download, RefreshCw, Truck, AlertTriangle } from 'lucide-react'
import { useAmazonAnalysis } from '@/hooks/seller/useSellerCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { KpiCard, DonutChart, LineChartComponent, BarChartComponent, GaugeMeter, ProgressBar, SuggestionCard, Section, CardSkeleton, Shimmer } from '../PremiumSellerCharts'

// Local KPI card for Amazon tool only — avoids global truncation styles
const AmazonKpiCard = ({ label, value, icon: Icon, color, prefix = '₹', suffix = '' }) => (
  <div className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1 break-words">{label}</p>
        <p className={`text-base lg:text-xl xl:text-2xl font-bold ${color || 'text-foreground'} break-words`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value}{suffix}
        </p>
      </div>
      {Icon && (
        <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  </div>
)

const INPUT_FIELDS = [
  { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', placeholder: '1500', default: '' },
  { name: 'listingPrice', label: 'Your Cost / Listing Price (₹)', type: 'number', placeholder: '800', default: '' },
  { name: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '0.5', default: '0.5' },
  { name: 'gstRate', label: 'GST Rate (%)', type: 'select', options: ['5', '12', '18', '28'], default: '18' },
  { name: 'fba', label: 'Fulfillment (FBA)', type: 'select', options: ['true', 'false'], default: 'false' },
  { name: 'adsCost', label: 'Ads Cost per Unit (₹)', type: 'number', placeholder: '50', default: '' },
  { name: 'returnRate', label: 'Return Rate (%)', type: 'number', placeholder: '5', default: '' },
]

const AmazonSellerProfitIntelligence = memo(() => {
  const [inputs, setInputs] = useState({ gstRate: '18', fba: 'false' })
  const [hasRun, setHasRun] = useState(false)
  const result = useAmazonAnalysis(inputs)
  const activeResult = hasRun && result ? result : null
  const { exportJSON, exportArrayCSV } = useExportTools('amazon-profit-intelligence')

  const handleChange = useCallback((name, value) => {
    setHasRun(false)
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleCalculate = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({ gstRate: '18', fba: 'false' }); setHasRun(false) }, [])

  const handleExport = useCallback(() => {
    if (!activeResult) return
    exportJSON(activeResult, 'amazon-profit-report')
  }, [activeResult, exportJSON])

  const handleExportCSV = useCallback(() => {
    if (!activeResult?.feeBreakdown) return
    exportArrayCSV(activeResult.feeBreakdown, 'amazon-fee-breakdown')
  }, [activeResult, exportArrayCSV])

  const suggestions = useMemo(() => {
    if (!activeResult) return []
    const s = []
    if (activeResult.margin < 10) s.push('Profit margin is below 10%. Consider reducing costs or increasing price.')
    if (activeResult.roi < 20) s.push('ROI is low. Optimize ad spend and reduce fulfillment costs.')
    if (activeResult.fbaTotal > activeResult.easyShipTotal) s.push('Easy Ship might be cheaper than FBA for this product.')
    if (activeResult.returnImpact > 100) s.push('High return impact. Review product quality and descriptions.')
    if (activeResult.margin > 25) s.push('Healthy margin! Consider expanding this product line.')
    return s
  }, [activeResult])

  return (
    <div className="space-y-5">
      {/* Input Section */}
      <Section title="Product Details" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {INPUT_FIELDS.slice(0, 2).map(field => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>
          ))}
          {INPUT_FIELDS.slice(2).map(field => field.type === 'select' ? (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <select value={inputs[field.name] || field.default} onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm">
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ) : (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleCalculate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Calculator className="w-4 h-4" /> Calculate Profit
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/70 transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      {/* Results */}
      <AnimatePresence>
        {activeResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* KPI Cards (Amazon-specific layout to avoid truncation on desktop) */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <AmazonKpiCard label="Net Profit" value={activeResult.netProfit} icon={DollarSign} color={activeResult.netProfit > 0 ? 'text-green-400' : 'text-red-400'} />
              <AmazonKpiCard label="Margin %" value={activeResult.margin} icon={Percent} color={activeResult.margin > 15 ? 'text-green-400' : 'text-yellow-400'} suffix="%" />
              <AmazonKpiCard label="Amazon Fees" value={activeResult.totalFees} icon={BarChart3} color="text-red-400" />
              <AmazonKpiCard label="GST" value={activeResult.gstAmount} icon={Package} color="text-blue-400" />
              <AmazonKpiCard label="ROI" value={activeResult.roi} icon={TrendingUp} color={activeResult.roi > 20 ? 'text-green-400' : 'text-yellow-400'} suffix="%" />
              <AmazonKpiCard label="Break-even Price" value={activeResult.breakEvenPrice} icon={Calculator} color="text-purple-400" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DonutChart data={activeResult.profitDonut} title="Profit Distribution" />
              {activeResult.feeBreakdown && (
                <BarChartComponent data={activeResult.feeBreakdown.map(f => ({ ...f, color: f.name === 'Referral Fee' ? '#ef4444' : f.name === 'Closing Fee' ? '#f97316' : f.name === 'Weight Handling' ? '#f59e0b' : '#8b5cf6' }))} title="Fee Breakdown" />
              )}
            </div>

            {/* Revenue Trend */}
            {activeResult.revenueTrend && (
              <LineChartComponent data={activeResult.revenueTrend} title="6-Month Revenue & Profit Forecast" />
            )}

            {/* Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Section title="FBA vs Easy Ship" icon={Truck}>
                <div className="space-y-3">
                  <ProgressBar value={activeResult.fbaTotal} label="FBA Total" max={Math.max(activeResult.fbaTotal, activeResult.easyShipTotal, 1)} />
                  <ProgressBar value={activeResult.easyShipTotal} label="Easy Ship Total" color="#3b82f6" max={Math.max(activeResult.fbaTotal, activeResult.easyShipTotal, 1)} />
                  <p className="text-xs text-muted-foreground mt-2">
                    {activeResult.fbaTotal < activeResult.easyShipTotal ? 'FBA is cheaper' : 'Easy Ship is cheaper'}
                  </p>
                </div>
              </Section>
              <Section title="Return Impact">
                <div className="text-center py-2">
                  <p className="text-2xl font-bold text-red-400">₹{activeResult.returnImpact.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">Lost to returns per unit</p>
                </div>
              </Section>
              <Section title="Monthly Projection">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Revenue</span><span className="font-medium">₹{activeResult.monthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fees</span><span className="font-medium text-red-400">₹{activeResult.monthlyFees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Profit</span><span className={`font-medium ${activeResult.monthlyProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>₹{activeResult.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                </div>
              </Section>
            </div>

            {/* Smart Recommendations */}
            {suggestions.length > 0 && <SuggestionCard suggestions={suggestions} />}

            {/* Export */}
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition-all">
                <Download className="w-3.5 h-3.5" /> Export Report (JSON)
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-medium hover:bg-secondary/20 transition-all">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasRun && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Enter your product details and click "Calculate Profit" to see Amazon fee analysis, profit breakdown, and business intelligence.
        </div>
      )}
    </div>
  )
})

export default AmazonSellerProfitIntelligence