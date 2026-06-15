function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(1)
}

export function calculateInventory(inputs) {
  const dailySales = Math.max(toNumber(inputs.daily_sales), 0)
  const stockQuantity = Math.max(toNumber(inputs.stock_quantity), 0)
  const leadTime = Math.max(toNumber(inputs.lead_time), 0)
  const reorderThreshold = Math.max(toNumber(inputs.reorder_threshold), 0)

  const daysRemaining = dailySales > 0 ? stockQuantity / dailySales : Infinity
  const reorderAlert = daysRemaining <= reorderThreshold ? 'Yes' : 'No'
  const suggestedReorderQuantity = dailySales > 0
    ? Math.max(0, Math.ceil((dailySales * (leadTime + reorderThreshold)) - stockQuantity))
    : 0

  return {
    type: 'cards',
    cards: [
      { label: 'Days Remaining', value: Number.isFinite(daysRemaining) ? `${formatNumber(daysRemaining)} days` : 'Unlimited', raw: daysRemaining, highlight: true },
      { label: 'Reorder Alert', value: reorderAlert, raw: reorderAlert },
      { label: 'Suggested Reorder Quantity', value: suggestedReorderQuantity.toLocaleString(), raw: suggestedReorderQuantity },
    ],
  }
}
