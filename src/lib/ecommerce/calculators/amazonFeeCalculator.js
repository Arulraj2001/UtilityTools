function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function calculateAmazonFees(inputs) {
  const sellingPrice = toNumber(inputs.selling_price)
  const referralPct = toNumber(inputs.referral_fee_pct)
  const closingFee = toNumber(inputs.closing_fee)
  const shippingFee = toNumber(inputs.shipping_fee)
  const fbaFee = toNumber(inputs.fba_fee)
  const gstPct = toNumber(inputs.gst_pct)

  const referralFee = (sellingPrice * referralPct) / 100
  const subtotalFees = referralFee + closingFee + shippingFee + fbaFee
  const gstAmount = (subtotalFees * gstPct) / 100
  const totalFees = subtotalFees + gstAmount
  const estimatedProfit = sellingPrice - totalFees
  const netMargin = sellingPrice > 0 ? (estimatedProfit / sellingPrice) * 100 : 0

  return {
    type: 'cards',
    cards: [
      { label: 'Selling Price', value: formatCurrency(sellingPrice), raw: sellingPrice },
      { label: 'Referral Fee', value: formatCurrency(referralFee), raw: referralFee },
      { label: 'FBA Fee', value: formatCurrency(fbaFee), raw: fbaFee },
      { label: 'GST on Fees', value: formatCurrency(gstAmount), raw: gstAmount },
      { label: 'Total Fees', value: formatCurrency(totalFees), raw: totalFees, highlight: true },
      { label: 'Estimated Profit', value: formatCurrency(estimatedProfit), raw: estimatedProfit },
      { label: 'Net Margin', value: `${netMargin.toFixed(2)}%`, raw: netMargin },
    ],
  }
}
