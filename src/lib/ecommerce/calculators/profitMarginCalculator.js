function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function calculateProfitMargin(inputs) {
  const costPrice = toNumber(inputs.cost_price)
  const sellingPrice = toNumber(inputs.selling_price)
  const shipping = toNumber(inputs.shipping)
  const adsSpend = toNumber(inputs.ads_spend)
  const marketplaceFees = toNumber(inputs.marketplace_fees)

  const grossProfit = sellingPrice - costPrice
  const netProfit = sellingPrice - costPrice - shipping - adsSpend - marketplaceFees
  const profitMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0

  return {
    type: 'cards',
    cards: [
      { label: 'Gross Profit', value: formatCurrency(grossProfit), raw: grossProfit },
      { label: 'Net Profit', value: formatCurrency(netProfit), raw: netProfit, highlight: true },
      { label: 'Profit Margin', value: `${profitMargin.toFixed(2)}%`, raw: profitMargin },
    ],
  }
}
