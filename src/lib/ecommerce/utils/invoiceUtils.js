export function parseInvoiceItems(input) {
  if (!input || typeof input !== 'string') return []

  try {
    const parsed = JSON.parse(input)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        description: String(item.description || item.name || '').trim(),
        quantity: Number(item.quantity || item.qty || 1),
        unit_price: Number(item.unit_price || item.price || item.rate || 0),
      })).filter(i => i.description)
    }
  } catch {
    // Continue to line parsing
  }

  return input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(part => part.trim())
      return {
        description: parts[0] || '',
        quantity: Number(parts[1] || 1),
        unit_price: Number(parts[2] || 0),
      }
    })
    .filter(item => item.description)
}

export function buildInvoiceModel({ sellerDetails, buyerDetails, productList, gstPct }) {
  const items = parseInvoiceItems(productList).map(item => ({
    description: item.description,
    quantity: Number(isFinite(item.quantity) ? item.quantity : 1),
    unit_price: Number(isFinite(item.unit_price) ? item.unit_price : 0),
  }))

  const taxableTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const gstRate = Number(gstPct || 0) / 100
  const gstAmount = taxableTotal * gstRate
  const invoiceTotal = taxableTotal + gstAmount

  return {
    sellerDetails: String(sellerDetails || '').trim(),
    buyerDetails: String(buyerDetails || '').trim(),
    items: items.map(item => ({
      ...item,
      total: item.quantity * item.unit_price,
    })),
    totals: {
      taxableTotal,
      gstRate: gstPct,
      gstAmount,
      invoiceTotal,
    },
  }
}

export function formatInvoiceText(model) {
  const lines = []
  lines.push('GST INVOICE')
  lines.push('==============================')
  if (model.sellerDetails) {
    lines.push('Seller Details:')
    lines.push(model.sellerDetails)
    lines.push('')
  }
  if (model.buyerDetails) {
    lines.push('Buyer Details:')
    lines.push(model.buyerDetails)
    lines.push('')
  }
  lines.push('Items:')
  model.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.description}`)
    lines.push(`   Qty: ${item.quantity}, Rate: ${item.unit_price.toFixed(2)}, Total: ${item.total.toFixed(2)}`)
  })
  lines.push('')
  lines.push(`Taxable Total: ${model.totals.taxableTotal.toFixed(2)}`)
  lines.push(`GST (${model.totals.gstRate}%): ${model.totals.gstAmount.toFixed(2)}`)
  lines.push(`Invoice Total: ${model.totals.invoiceTotal.toFixed(2)}`)
  return lines.join('\n')
}
