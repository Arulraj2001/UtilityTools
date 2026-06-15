function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function calculateProductPricing(inputs) {
  const productCost = toNumber(inputs.product_cost)
  const shippingCost = toNumber(inputs.shipping_cost)
  const packagingCost = toNumber(inputs.packaging_cost)
  const marketplaceFee = toNumber(inputs.marketplace_fee)
  const targetProfitPct = toNumber(inputs.target_profit_pct)

  const totalCost = productCost + shippingCost + packagingCost + marketplaceFee
  if (targetProfitPct >= 100) {
    return { error: 'Target profit percentage must be less than 100.' }
  }

  const recommendedSellingPrice = totalCost / Math.max(1 - targetProfitPct / 100, 0.001)
  const estimatedProfit = recommendedSellingPrice - totalCost

  return {
    type: 'cards',
    cards: [
      { label: 'Total Cost', value: formatCurrency(totalCost), raw: totalCost },
      { label: 'Recommended Selling Price', value: formatCurrency(recommendedSellingPrice), raw: recommendedSellingPrice, highlight: true },
      { label: 'Target Margin', value: `${targetProfitPct.toFixed(2)}%`, raw: targetProfitPct },
      { label: 'Estimated Profit', value: formatCurrency(estimatedProfit), raw: estimatedProfit },
    ],
  }
}
