/**
 * Flipkart Seller Earnings Analyzer - Premium Flipkart fee analyzer
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Percent, TrendingUp, ShoppingCart, Download, RefreshCw, Calculator, AlertTriangle } from 'lucide-react'
import { useFlipkartAnalysis } from '@/hooks/seller/useSellerCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { KpiCard, DonutChart, BarChartComponent, GaugeMeter, SuggestionCard, Section } from '../PremiumSellerCharts'

const INPUT_FIELDS = [
  { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', placeholder: '1200', default: '' },
  { name: 'listingPrice', label: 'Your Cost (₹)', type: 'number', placeholder: '600', default: '' },
  { name: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '0.5', default: '0.5' },
  { name: 'gstRate', label: 'GST Rate (%)', type: 'select', options: ['5', '12', '18', '28'], default: '18' },
  { name: 'fixedFee', label: 'Fixed Fee (₹)', type: 'number', placeholder: '35', default: '35' },
  { name: 'discount', label: 'Discount (%)', type: 'number', placeholder: '10', default: '' },
]

const FlipkartSellerEarningsAnalyzer = memo(() => {
  const [inputs, setInputs] = useState(/** @type {Record<string, string>} */ ({}))
  const [hasRun, setHasRun] = useState(false)
  const result = useFlipkartAnalysis(inputs)
  const activeResult = hasRun && result ? result : null

  const handleChange = useCallback(
    /** @param {string} name @param {string} value */
    (name, value) => { setHasRun(false); setInputs(prev => ({ ...prev, [name]: value })) }, [])
  const handleCalculate = useCallback(() => setHasRun(true), [])
  const handleReset = useCallback(() => { setInputs({}); setHasRun(false) }, [])

  const suggestions = useMemo(() => {
    if (!activeResult) return []
    const s = []
    if (activeResult.margin < 10) s.push('Profit margin is low. Consider selling higher-margin products.')
    if (activeResult.discountImpact > 100) s.push('Discount impact is high. Review your pricing strategy.')
    if (activeResult.sellerHealth < 50) s.push('Seller health score is low. Improve profitability metrics.')
    return s
  }, [activeResult])

  return (
    <div className="space-y-5">
      <Section title="Product & Fee Details" icon={ShoppingCart}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {INPUT_FIELDS.map(field => field.type === 'select' ? (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <select value={inputs[field.name] || ''} onChange={e => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none transition-all text-sm">
                <option value="" disabled hidden>Select</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
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
            <Calculator className="w-4 h-4" /> Analyze Earnings
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/70 transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>
        {activeResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Net Profit" value={activeResult.netProfit} icon={DollarSign} color={activeResult.netProfit > 0 ? 'text-green-400' : 'text-red-400'} />
              <KpiCard label="Margin %" value={activeResult.margin} icon={Percent} suffix="%" color={activeResult.margin > 15 ? 'text-green-400' : 'text-yellow-400'} />
              <KpiCard label="Total Fees" value={activeResult.totalFees} icon={ShoppingCart} color="text-red-400" />
              <KpiCard label="ROI %" value={activeResult.roi} icon={TrendingUp} suffix="%" color={activeResult.roi > 20 ? 'text-green-400' : 'text-yellow-400'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DonutChart data={activeResult.earningsSplit} title="Earnings Split" />
              <Section title="Seller Health Score">
                <GaugeMeter value={activeResult.sellerHealth} label="Health Score" color={activeResult.sellerHealth > 60 ? '#10b981' : activeResult.sellerHealth > 30 ? '#f59e0b' : '#ef4444'} />
              </Section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Fee Breakdown">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Referral Fee</span><span className="font-medium">₹{activeResult.referralFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fixed Fee</span><span className="font-medium">₹{activeResult.fixedFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Collection Fee</span><span className="font-medium">₹{activeResult.collectionFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Shipping Fee</span><span className="font-medium">₹{activeResult.shippingFee.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">GST</span><span className="font-medium">₹{activeResult.gstAmount.toFixed(2)}</span></div>
                  {activeResult.discountImpact > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Discount Impact</span><span className="font-medium text-red-400">₹{activeResult.discountImpact.toFixed(2)}</span></div>}
                </div>
              </Section>
              <SuggestionCard suggestions={suggestions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasRun && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Enter product details to analyze Flipkart marketplace fees, net earnings, and seller health score.
        </div>
      )}
    </div>
  )
})

export default FlipkartSellerEarningsAnalyzer