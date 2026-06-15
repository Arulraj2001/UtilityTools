/**
 * Premium Seller Math Engine - Complete calculation library for all seller tools
 * Covers Amazon, Flipkart, Profit, COD, Inventory, GST, Pricing, ROI, and Business Performance
 */

// ─── Constants ──────────────────────────────────────────────

export const AMAZON_FEE_TIERS = [
  { min: 0, max: 250, referral: 0.15, closing: 25, weight: 0.5 },
  { min: 250, max: 500, referral: 0.15, closing: 40, weight: 1 },
  { min: 500, max: 1000, referral: 0.15, closing: 55, weight: 1.5 },
  { min: 1000, max: 2000, referral: 0.14, closing: 65, weight: 2 },
  { min: 2000, max: 5000, referral: 0.13, closing: 75, weight: 2.5 },
  { min: 5000, max: Infinity, referral: 0.12, closing: 85, weight: 3 },
]

export const FLIPKART_FEE_RATES = { referral: 0.15, fixed: 35, collection: 0.01, shipping: { min: 20, slab: 0.5 } }
export const GST_RATES = [5, 12, 18, 28]
export const COD_RISK_RATES = { tier1: 0.02, tier2: 0.04, tier3: 0.06 }

// ─── Amazon Fee Calculator ──────────────────────────────────

export function calculateAmazonFees({ sellingPrice, listingPrice, weight, category, gstRate, fba, adsCost, returnRate }) {
  const sp = Number(sellingPrice) || 0
  const lp = Number(listingPrice) || 0
  const w = Number(weight) || 0.5
  const gst = Number(gstRate) || 18
  const ads = Number(adsCost) || 0
  const returns = Number(returnRate) || 0

  // Find fee tier
  const tier = AMAZON_FEE_TIERS.find(t => sp >= t.min && sp <= t.max) || AMAZON_FEE_TIERS[0]

  const referralFee = sp * tier.referral
  const closingFee = tier.closing + (w > 1 ? (w - 1) * 15 : 0)
  const weightHandling = w * (tier.weight || 1) * 10
  const gstAmount = (sp * gst) / (100 + gst)

  // FBA fees
  const fbaPickPack = fba ? 15 : 0
  const fbaStorage = fba ? (w * 5) : 0
  const fbaShipping = fba ? (sp > 500 ? 35 : 25) : 0

  const totalFees = referralFee + closingFee + weightHandling + fbaPickPack + fbaStorage + fbaShipping + ads
  const returnImpact = sp * (returns / 100) * 0.5
  const netProfit = sp - lp - totalFees - returnImpact
  const margin = sp > 0 ? (netProfit / sp) * 100 : 0
  const roi = lp > 0 ? (netProfit / (lp + totalFees)) * 100 : 0

  // Monthly projection
  const monthlyRevenue = sp * 100
  const monthlyFees = totalFees * 100
  const monthlyProfit = netProfit * 100

  // Break-even
  const breakEvenPrice = (lp + totalFees) / (1 - (returns / 100) * 0.5)

  return {
    sellingPrice: sp,
    listingPrice: lp,
    referralFee: round(referralFee),
    closingFee: round(closingFee),
    weightHandling: round(weightHandling),
    gstAmount: round(gstAmount),
    gstRate: gst,
    fbaPickPack: round(fbaPickPack),
    fbaStorage: round(fbaStorage),
    fbaShipping: round(fbaShipping),
    adsCost: round(ads),
    totalFees: round(totalFees),
    returnImpact: round(returnImpact),
    netProfit: round(netProfit),
    margin: round(margin),
    roi: round(roi),
    breakEvenPrice: round(breakEvenPrice),
    monthlyRevenue: round(monthlyRevenue),
    monthlyFees: round(monthlyFees),
    monthlyProfit: round(monthlyProfit),
    fbaTotal: round(fbaPickPack + fbaStorage + fbaShipping),
    easyShipTotal: round(fba ? 0 : 20 + w * 5),
    feeBreakdown: [
      { name: 'Referral Fee', value: round(referralFee) },
      { name: 'Closing Fee', value: round(closingFee) },
      { name: 'Weight Handling', value: round(weightHandling) },
      { name: 'FBA/EasyShip', value: round(fba ? fbaPickPack + fbaStorage + fbaShipping : 20 + w * 5) },
      { name: 'Ads Cost', value: round(ads) },
    ],
    profitDonut: [
      { name: 'Net Profit', value: Math.max(netProfit, 0) },
      { name: 'Amazon Fees', value: totalFees },
      { name: 'Product Cost', value: lp },
      { name: 'Returns Impact', value: returnImpact },
    ],
    revenueTrend: generateMonthlyTrend(sp, netProfit),
  }
}

// ─── Flipkart Fee Calculator ────────────────────────────────

export function calculateFlipkartFees({ sellingPrice, listingPrice, weight, category, shippingSlab, fixedFee, discount, gstRate }) {
  const sp = Number(sellingPrice) || 0
  const lp = Number(listingPrice) || 0
  const w = Number(weight) || 0.5
  const disc = Number(discount) || 0
  const gst = Number(gstRate) || 18

  const referralFee = sp * FLIPKART_FEE_RATES.referral
  const fixed = Number(fixedFee) || FLIPKART_FEE_RATES.fixed
  const collectionFee = sp * FLIPKART_FEE_RATES.collection
  const shippingFee = FLIPKART_FEE_RATES.shipping.min + w * FLIPKART_FEE_RATES.shipping.slab * 10
  const gstAmount = (sp * gst) / (100 + gst)
  const discountImpact = sp * (disc / 100) * 0.3
  const totalFees = referralFee + fixed + collectionFee + shippingFee + gstAmount + discountImpact
  const netProfit = sp - lp - totalFees
  const margin = sp > 0 ? (netProfit / sp) * 100 : 0
  const roi = lp > 0 ? (netProfit / lp) * 100 : 0
  const sellerHealth = calculateHealthScore(margin, roi, 0)

  return {
    sellingPrice: sp,
    listingPrice: lp,
    referralFee: round(referralFee),
    fixedFee: round(fixed),
    collectionFee: round(collectionFee),
    shippingFee: round(shippingFee),
    gstAmount: round(gstAmount),
    discountImpact: round(discountImpact),
    totalFees: round(totalFees),
    netProfit: round(netProfit),
    margin: round(margin),
    roi: round(roi),
    sellerHealth,
    earningsSplit: [
      { name: 'Your Profit', value: Math.max(netProfit, 0) },
      { name: 'Flipkart Fees', value: totalFees },
      { name: 'Product Cost', value: lp },
      { name: 'Discount Impact', value: discountImpact },
    ],
  }
}

// ─── Profit Optimizer ───────────────────────────────────────

export function calculateProfitOptimization({ costPrice, sellingPrice, quantity, operatingExpenses, adsSpend, competitorPrice, targetMargin }) {
  const cp = Number(costPrice) || 0
  const sp = Number(sellingPrice) || 0
  const qty = Number(quantity) || 1
  const opEx = Number(operatingExpenses) || 0
  const ads = Number(adsSpend) || 0
  const compPrice = Number(competitorPrice) || 0
  const target = Number(targetMargin) || 20

  const revenue = sp * qty
  const totalCost = cp * qty + opEx + ads
  const grossProfit = revenue - totalCost
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0

  // Target selling price for desired margin
  const targetPrice = target > 0 ? totalCost / (1 - target / 100) / qty : 0
  const priceGap = targetPrice - sp

  // Ad efficiency
  const adROAS = ads > 0 ? revenue / ads : 0

  // Competitor analysis
  const pricePosition = compPrice > 0 ? ((sp - compPrice) / compPrice) * 100 : 0
  const suggestedPrice = compPrice > 0 ? compPrice * 0.95 : sp * 0.9

  // Operating expense allocation
  const expenseAllocation = [
    { name: 'Product Cost', value: cp * qty },
    { name: 'Operating Expenses', value: opEx },
    { name: 'Ads Spend', value: ads },
  ]

  // Margin optimization suggestions
  const suggestions = []
  if (margin < 10) suggestions.push('Consider reducing operating expenses by 5-10%')
  if (adROAS < 2) suggestions.push('Your ad ROAS is low. Optimize ad targeting')
  if (priceGap > 0) suggestions.push(`Increase selling price by ₹${round(priceGap)} to reach ${target}% margin`)
  if (margin < target) suggestions.push(`Your margin (${round(margin)}%) is below target (${target}%)`)
  if (qty < 100) suggestions.push('Bulk orders (100+) can reduce per-unit cost')

  return {
    revenue: round(revenue),
    totalCost: round(totalCost),
    grossProfit: round(grossProfit),
    margin: round(margin),
    roi: round(roi),
    targetPrice: round(targetPrice),
    priceGap: round(priceGap),
    adROAS: round(adROAS),
    pricePosition: round(pricePosition),
    suggestedPrice: round(suggestedPrice),
    suggestions,
    expenseAllocation,
    marginTrend: generateMarginTrend(margin, target),
  }
}

// ─── COD Risk Analyzer ──────────────────────────────────────

export function calculateCODAnalysis({ codAmount, averageOrderValue, returnRate, courierCodFee, prepaidRatio }) {
  const amount = Number(codAmount) || 0
  const aov = Number(averageOrderValue) || 500
  const returns = Number(returnRate) || 10
  const courierFee = Number(courierCodFee) || 30
  const prepaid = Number(prepaidRatio) || 40

  const codFee = amount * 0.02 + courierFee
  const returnProbability = returns / 100
  const rtoCost = returnProbability * (aov * 0.5 + 50)
  const riskScore = Math.min((returns * 2 + (10 - prepaid / 10)) / 3, 100)
  const payoutDelay = 7 + Math.round(returns / 5)

  const totalCodCost = codFee + rtoCost
  const effectiveRevenue = aov - totalCodCost
  const premiumSavings = aov * 0.02 - codFee

  return {
    codAmount: amount,
    aov,
    codFee: round(codFee),
    returnProbability: round(returnProbability * 100),
    rtoCost: round(rtoCost),
    riskScore: round(riskScore),
    payoutDelay,
    totalCodCost: round(totalCodCost),
    effectiveRevenue: round(effectiveRevenue),
    premiumSavings: round(premiumSavings),
    riskLevel: riskScore > 60 ? 'High' : riskScore > 30 ? 'Medium' : 'Low',
    riskMeter: round(riskScore),
    payoutTimeline: generatePayoutTimeline(payoutDelay),
    codVsPrepaid: [
      { name: 'COD Cost', value: Math.max(totalCodCost, 0) },
      { name: 'Prepaid Cost', value: Math.max(aov * 0.01, 0) },
    ],
  }
}

// ─── Inventory Forecast ────────────────────────────────────

export function calculateInventoryForecast({ currentStock, monthlySales, leadTime, reorderPoint, safetyStock, price, cost }) {
  const stock = Number(currentStock) || 0
  const sales = Number(monthlySales) || 100
  const lead = Number(leadTime) || 15
  const reorder = Number(reorderPoint) || 50
  const safety = Number(safetyStock) || 20
  const pr = Number(price) || 0
  const cst = Number(cost) || 0

  const dailySales = sales / 30
  const daysUntilOut = stock / dailySales
  const reorderAlert = stock <= reorder
  const deadStockThreshold = stock > sales * 6
  const fastMoving = sales > 500
  const agingDays = daysUntilOut > 60 ? 'Aging' : 'Healthy'

  const reorderQuantity = Math.max(Math.ceil((lead / 30) * sales + safety - stock), 0)
  const projectedStock = stock + reorderQuantity - sales
  const stockValue = stock * cst
  const projectedRevenue = sales * pr

  const monthlyProjections = Array.from({ length: 6 }, (_, i) => {
    const monthSales = sales * (1 + 0.05 * i)
    const remaining = stock - monthSales * (i + 1) + (reorderQuantity > 0 ? reorderQuantity : 0)
    return {
      month: `M${i + 1}`,
      sales: round(monthSales),
      stock: round(Math.max(remaining, 0)),
      reorder: remaining < safety ? reorderQuantity : 0,
    }
  })

  return {
    currentStock: stock,
    monthlySales: sales,
    dailySales: round(dailySales),
    daysUntilOut: round(daysUntilOut),
    reorderAlert,
    deadStockDetected: deadStockThreshold,
    fastMoving,
    agingDays,
    reorderQuantity: round(reorderQuantity),
    projectedStock: round(Math.max(projectedStock, 0)),
    stockValue: round(stockValue),
    projectedRevenue: round(projectedRevenue),
    healthScore: calculateInventoryHealth(stock, sales, reorder),
    monthlyProjections,
    reorderTimeline: [
      { name: 'Current Stock', value: stock },
      { name: 'Reorder Level', value: reorder },
      { name: 'Safety Stock', value: safety },
      { name: 'Projected Stock', value: Math.max(projectedStock, 0) },
    ],
  }
}

// ─── GST Invoice ───────────────────────────────────────────

export function generateGSTInvoice({ companyName, companyAddress, gstin, invoiceNo, customerName, customerGstin, items, date, placeOfSupply }) {
  const invoiceNumber = invoiceNo || `INV-${Date.now().toString(36).toUpperCase()}`
  const invoiceDate = date || new Date().toISOString().split('T')[0]
  const itemsList = items || [{ name: 'Product', hsn: '1234', qty: 1, rate: 1000 }]

  const lineItems = itemsList.map((item, i) => {
    const qty = Number(item.qty) || 1
    const rate = Number(item.rate) || 0
    const taxable = qty * rate
    const gstRate = Number(item.gstRate) || 18
    const cgst = taxable * (gstRate / 2 / 100)
    const sgst = taxable * (gstRate / 2 / 100)
    const total = taxable + cgst + sgst
    return { ...item, taxable: round(taxable), cgst: round(cgst), sgst: round(sgst), gstRate, total: round(total) }
  })

  const totalTaxable = lineItems.reduce((s, i) => s + i.taxable, 0)
  const totalCGST = lineItems.reduce((s, i) => s + i.cgst, 0)
  const totalSGST = lineItems.reduce((s, i) => s + i.sgst, 0)
  const totalGST = totalCGST + totalSGST
  const grandTotal = totalTaxable + totalGST
  const gstSummary = calculateGSTSummary(lineItems)

  return {
    invoiceNumber,
    invoiceDate,
    companyName: companyName || 'Your Business',
    companyAddress: companyAddress || 'Address',
    gstin: gstin || 'GSTIN123456',
    customerName: customerName || 'Customer',
    customerGstin: customerGstin || '',
    placeOfSupply: placeOfSupply || 'State',
    lineItems,
    totalTaxable: round(totalTaxable),
    totalCGST: round(totalCGST),
    totalSGST: round(totalSGST),
    totalGST: round(totalGST),
    grandTotal: round(grandTotal),
    gstSummary,
    qrData: `GSTIN:${gstin || 'GSTIN123456'}|INV:${invoiceNumber}|AMT:${round(grandTotal)}`,
  }
}

// ─── Pricing Engine ────────────────────────────────────────

export function calculatePricingEngine({ costPrice, targetMargin, marketplaceFees, competitorPrice, discount, psychologicalPricing }) {
  const cp = Number(costPrice) || 0
  const target = Number(targetMargin) || 20
  const mktFees = Number(marketplaceFees) || 15
  const compPrice = Number(competitorPrice) || 0
  const disc = Number(discount) || 0
  const usePsych = psychologicalPricing !== false

  const basePrice = cp / (1 - target / 100 - mktFees / 100)
  const suggestedPrice = usePsych ? psychologicalPrice(basePrice) : round(basePrice)
  const discountedPrice = disc > 0 ? suggestedPrice * (1 - disc / 100) : suggestedPrice
  const finalMargin = discountedPrice > 0 ? ((discountedPrice - cp - discountedPrice * mktFees / 100) / discountedPrice) * 100 : 0
  const compDiff = compPrice > 0 ? ((suggestedPrice - compPrice) / compPrice) * 100 : 0

  const feeSimulation = [
    { name: 'Cost Price', value: cp },
    { name: 'Marketplace Fees', value: round(suggestedPrice * mktFees / 100) },
    { name: 'Your Margin', value: round(suggestedPrice - cp - suggestedPrice * mktFees / 100) },
  ]

  return {
    basePrice: round(basePrice),
    suggestedPrice: round(suggestedPrice),
    discountedPrice: round(discountedPrice),
    finalMargin: round(finalMargin),
    compDiff: round(compDiff),
    targetMargin: target,
    marketplaceFees: mktFees,
    feeSimulation,
    psychologicalPrice: usePsych ? suggestedPrice : basePrice,
    priceCurve: generatePriceCurve(cp, suggestedPrice),
  }
}

// ─── ROI Intelligence ──────────────────────────────────────

export function calculateROI({ investment, monthlyReturn, months, compoundGrowth, marketingSpend, campaignRevenue }) {
  const inv = Number(investment) || 0
  const mReturn = Number(monthlyReturn) || 0
  const m = Number(months) || 12
  const compound = compoundGrowth !== false
  const mktSpend = Number(marketingSpend) || 0
  const campRev = Number(campaignRevenue) || 0

  let totalReturn = 0
  let currentValue = inv
  const timeline = []

  for (let i = 1; i <= m; i++) {
    if (compound) {
      currentValue += currentValue * (mReturn / 100)
    } else {
      currentValue += inv * (mReturn / 100)
    }
    totalReturn = currentValue - inv
    timeline.push({ month: `M${i}`, value: round(currentValue), profit: round(currentValue - inv) })
  }

  const roi = inv > 0 ? (totalReturn / inv) * 100 : 0
  const recoveryMonths = mReturn > 0 ? Math.ceil(inv / (inv * mReturn / 100)) : m
  const marketingROI = mktSpend > 0 ? ((campRev - mktSpend) / mktSpend) * 100 : 0
  const campaignScore = calculateCampaignScore(marketingROI, campRev, mktSpend)

  return {
    investment: inv,
    monthlyReturn: mReturn,
    totalReturn: round(totalReturn),
    roi: round(roi),
    recoveryMonths,
    finalValue: round(currentValue),
    marketingROI: round(marketingROI),
    campaignScore: round(campaignScore),
    timeline,
    recoveryProgress: [
      { name: 'Investment', value: inv },
      { name: 'Returns', value: Math.max(totalReturn, 0) },
      { name: 'Total Value', value: round(currentValue) },
    ],
  }
}

// ─── Seller Performance Dashboard ──────────────────────────

export function calculateSellerPerformance({ monthlyRevenue, monthlyCosts, returns, adSpend, operatingExpenses, months, taxRate }) {
  const rev = Number(monthlyRevenue) || 0
  const costs = Number(monthlyCosts) || 0
  const ret = Number(returns) || 5
  const ads = Number(adSpend) || 0
  const opEx = Number(operatingExpenses) || 0
  const m = Number(months) || 12
  const tax = Number(taxRate) || 18

  const annualRevenue = rev * m
  const annualCosts = costs * m
  const returnImpact = annualRevenue * (ret / 100)
  const annualAds = ads * m
  const annualOpEx = opEx * m
  const grossProfit = annualRevenue - annualCosts - returnImpact
  const taxLiability = grossProfit * (tax / 100)
  const netProfit = grossProfit - annualAds - annualOpEx - taxLiability
  const margin = annualRevenue > 0 ? (netProfit / annualRevenue) * 100 : 0
  const adsROI = annualAds > 0 ? (annualRevenue - annualCosts - returnImpact) / annualAds : 0

  const expenseCategories = [
    { name: 'Product Costs', value: annualCosts },
    { name: 'Returns Impact', value: returnImpact },
    { name: 'Ads Spend', value: annualAds },
    { name: 'Operating Expenses', value: annualOpEx },
    { name: 'Tax Liability', value: Math.max(taxLiability, 0) },
  ]

  const monthlyData = Array.from({ length: m }, (_, i) => ({
    month: `M${i + 1}`,
    revenue: round(rev * (1 + 0.03 * i)),
    profit: round((rev - costs - ret / 100 * rev - ads - opEx) * (1 + 0.03 * i)),
    costs: round((costs + ads + opEx) * (1 + 0.02 * i)),
  }))

  const growthScore = calculateGrowthScore(margin, adsROI, netProfit)

  return {
    annualRevenue: round(annualRevenue),
    annualCosts: round(annualCosts),
    returnImpact: round(returnImpact),
    annualAds: round(annualAds),
    annualOpEx: round(annualOpEx),
    grossProfit: round(grossProfit),
    taxLiability: round(Math.max(taxLiability, 0)),
    netProfit: round(netProfit),
    margin: round(margin),
    adsROI: round(adsROI),
    growthScore,
    monthlyData,
    expenseCategories,
  }
}

// ─── Helper Functions ──────────────────────────────────────

function round(n) { return Math.round((n || 0) * 100) / 100 }

function psychologicalPrice(price) {
  const p = Math.round(price)
  if (p > 1000) return Math.floor(p / 100) * 100 - 1
  if (p > 100) return Math.floor(p / 10) * 10 - 1
  return p - 1
}

function calculateHealthScore(margin, roi, returns) {
  let score = 50
  if (margin > 20) score += 20
  else if (margin > 10) score += 10
  else score -= 10
  if (roi > 30) score += 15
  else if (roi > 15) score += 5
  else score -= 5
  score = Math.max(0, Math.min(100, score))
  return score
}

function calculateInventoryHealth(stock, sales, reorder) {
  const ratio = sales > 0 ? stock / sales : 0
  if (ratio > 6) return 30
  if (ratio > 3) return 60
  if (ratio > 1) return 85
  if (ratio > 0.5) return 95
  return 100
}

function calculateCampaignScore(roi, revenue, spend) {
  let score = 50
  if (roi > 200) score += 25
  else if (roi > 100) score += 15
  else if (roi > 50) score += 10
  if (revenue > spend * 5) score += 15
  if (revenue > spend * 10) score += 10
  return Math.min(score, 100)
}

function calculateGrowthScore(margin, adsROI, profit) {
  let score = 40
  if (margin > 15) score += 15
  if (margin > 25) score += 10
  if (adsROI > 3) score += 15
  if (adsROI > 5) score += 5
  if (profit > 0) score += 15
  return Math.min(score, 100)
}

function generateMonthlyTrend(price, profit) {
  return Array.from({ length: 6 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
    revenue: round(price * 100 * (1 + 0.05 * i)),
    profit: round(profit * 100 * (1 + 0.05 * i)),
  }))
}

function generateMarginTrend(current, target) {
  return Array.from({ length: 6 }, (_, i) => ({
    month: `M${i + 1}`,
    current: round(current + i * 2),
    target: target,
  }))
}

function generatePayoutTimeline(delay) {
  return Array.from({ length: 5 }, (_, i) => ({
    day: `Day ${(i + 1) * delay / 5}`,
    status: i < 2 ? 'Processing' : i < 4 ? 'In Transit' : 'Completed',
  }))
}

function generatePriceCurve(cost, maxPrice) {
  return Array.from({ length: 10 }, (_, i) => {
    const p = cost + (maxPrice - cost) * (i / 9)
    const margin = ((p - cost) / p) * 100
    return { price: round(p), margin: round(margin), profit: round(p - cost) }
  })
}

function calculateGSTSummary(items) {
  const rates = {}
  items.forEach(item => {
    const rate = item.gstRate || 18
    if (!rates[rate]) rates[rate] = { taxable: 0, gst: 0 }
    rates[rate].taxable += item.taxable || 0
    rates[rate].gst += (item.cgst || 0) + (item.sgst || 0)
  })
  return Object.entries(rates).map(([rate, data]) => ({
    rate: Number(rate),
    taxable: round(data.taxable),
    gst: round(data.gst),
  }))
}