function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function calculateFlipkartFees(inputs) {
  const productPrice = toNumber(inputs.product_price)
  const commissionPct = toNumber(inputs.commission_pct)
  const shippingFee = toNumber(inputs.shipping_fee)
  const fixedFee = toNumber(inputs.fixed_fee)
  const gstPct = toNumber(inputs.gst_pct)

  const commissionFee = (productPrice * commissionPct) / 100
  const subtotalCharges = commissionFee + shippingFee + fixedFee
  const gstAmount = (subtotalCharges * gstPct) / 100
  const totalCharges = subtotalCharges + gstAmount
  const netPayout = productPrice - totalCharges
  const profitMargin = productPrice > 0 ? (netPayout / productPrice) * 100 : 0

  return {
    type: 'cards',
    cards: [
      { label: 'Product Price', value: formatCurrency(productPrice), raw: productPrice },
      { label: 'Commission', value: formatCurrency(commissionFee), raw: commissionFee },
      { label: 'Fixed Fee', value: formatCurrency(fixedFee), raw: fixedFee },
      { label: 'GST on Charges', value: formatCurrency(gstAmount), raw: gstAmount },
      { label: 'Total Flipkart Charges', value: formatCurrency(totalCharges), raw: totalCharges, highlight: true },
      { label: 'Net Payout', value: formatCurrency(netPayout), raw: netPayout },
      { label: 'Profit Margin', value: `${profitMargin.toFixed(2)}%`, raw: profitMargin },
    ],
  }
}
