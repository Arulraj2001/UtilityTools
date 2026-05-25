function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function calculateSellerProfit(inputs) {
  const salesVolume = toNumber(inputs.sales_volume)
  const productCost = toNumber(inputs.product_cost)
  const adsCost = toNumber(inputs.ads_cost)
  const shipping = toNumber(inputs.shipping)
  const returnsPct = toNumber(inputs.returns_pct)
  const platformFees = toNumber(inputs.platform_fees)

  const netSales = salesVolume * Math.max(0, 1 - returnsPct / 100)
  const totalCosts = productCost + adsCost + shipping + platformFees
  const monthlyProfit = netSales - totalCosts
  const yearlyProjection = monthlyProfit * 12
  const breakEvenRevenue = Math.max(0, totalCosts / Math.max(1 - returnsPct / 100, 0.001))

  return {
    type: 'cards',
    cards: [
      { label: 'Monthly Revenue', value: `₹${salesVolume.toFixed(2)}`, raw: salesVolume },
      { label: 'Net Sales After Returns', value: `₹${netSales.toFixed(2)}`, raw: netSales },
      { label: 'Monthly Profit', value: `₹${monthlyProfit.toFixed(2)}`, raw: monthlyProfit, highlight: true },
      { label: 'Yearly Projection', value: `₹${yearlyProjection.toFixed(2)}`, raw: yearlyProjection },
      { label: 'Break-even Revenue', value: `₹${breakEvenRevenue.toFixed(2)}`, raw: breakEvenRevenue },
    ],
  }
}
