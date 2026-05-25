function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function calculateCODCharges(inputs) {
  const orderValue = toNumber(inputs.order_value)
  const codPct = toNumber(inputs.cod_pct)
  const fixedCodFee = toNumber(inputs.fixed_cod_fee)

  const codFee = (orderValue * codPct) / 100 + fixedCodFee
  const finalPayout = orderValue - codFee

  return {
    type: 'cards',
    cards: [
      { label: 'Order Value', value: formatCurrency(orderValue), raw: orderValue },
      { label: 'COD Percentage', value: `${codPct.toFixed(2)}%`, raw: codPct },
      { label: 'Fixed COD Fee', value: formatCurrency(fixedCodFee), raw: fixedCodFee },
      { label: 'COD Fee', value: formatCurrency(codFee), raw: codFee, highlight: true },
      { label: 'Final Payout', value: formatCurrency(finalPayout), raw: finalPayout },
    ],
  }
}
