import { buildInvoiceModel, formatInvoiceText } from '../utils/invoiceUtils'

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '₹0.00'
  return '₹' + value.toFixed(2)
}

export function generateGSTInvoice(inputs) {
  const sellerDetails = inputs.seller_details || ''
  const buyerDetails = inputs.buyer_details || ''
  const productList = inputs.product_list || ''
  const gstPct = Number(inputs.gst_pct || 0)

  if (!sellerDetails.trim() || !buyerDetails.trim() || !productList.trim()) {
    return { error: 'Seller details, buyer details, and product list are required.' }
  }

  const invoice = buildInvoiceModel({ sellerDetails, buyerDetails, productList, gstPct })
  if (invoice.items.length === 0) {
    return { error: 'Product list could not be parsed. Provide JSON or comma-separated lines.' }
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Taxable Total', value: formatCurrency(invoice.totals.taxableTotal), raw: invoice.totals.taxableTotal },
      { label: `GST (${invoice.totals.gstRate}%)`, value: formatCurrency(invoice.totals.gstAmount), raw: invoice.totals.gstAmount },
      { label: 'Invoice Total', value: formatCurrency(invoice.totals.invoiceTotal), raw: invoice.totals.invoiceTotal, highlight: true },
      { label: 'Line Items', value: `${invoice.items.length} items`, raw: invoice.items.length },
    ],
    table: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: formatCurrency(item.unit_price),
      total: formatCurrency(item.total),
    })),
    extra: {
      printableInvoice: formatInvoiceText(invoice),
      invoiceModel: invoice,
    },
  }
}
