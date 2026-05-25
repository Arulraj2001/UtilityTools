/**
 * Smart GST Invoice Builder - Premium invoice generator with GST breakdown and PDF export
 */
import React, { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, RefreshCw, Plus, Trash2, Receipt } from 'lucide-react'
import { useGSTInvoice } from '@/hooks/seller/useSellerCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { KpiCard, Section, CopyButton } from '../PremiumSellerCharts'

const SmartGSTInvoiceBuilder = memo(() => {
  const [inputs, setInputs] = useState({
    companyName: 'Your Business', companyAddress: '123 Business St, City - 600001', gstin: '33ABCDE1234F1Z5',
    invoiceNo: `INV-${Date.now().toString(36).toUpperCase()}`, customerName: '', customerGstin: '',
    placeOfSupply: 'Tamil Nadu', date: new Date().toISOString().split('T')[0],
    items: [{ name: 'Product 1', hsn: '1234', qty: 1, rate: 1000, gstRate: 18 }],
  })
  // user-friendly multiline items input (one item per line)
  const [itemsText, setItemsText] = useState('Product 1,1234,1,1000,18')
  const [hasRun, setHasRun] = useState(false)
  const result = useGSTInvoice(inputs)
  const activeResult = hasRun && result ? result : null

  const handleChange = useCallback((n, v) => { setHasRun(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const parseItemsText = useCallback((text) => {
    if (!text) return []
    const trimmed = text.trim()
    if (trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed) } catch { /* fallthrough to line parse */ }
    }
    return trimmed.split('\n').map(line => {
      const parts = line.split(/[,|\t;]+/).map(p => p.trim())
      const [name = 'Item', hsn = '', qty = '1', rate = '0', gstRate = '18'] = parts
      return { name, hsn, qty: Number(qty) || 0, rate: Number(rate) || 0, gstRate: Number(gstRate) || 0 }
    }).filter(i => i && i.name)
  }, [])

  const handleCalc = useCallback(() => {
    // parse itemsText into structured items and update inputs before running
    setInputs(p => ({ ...p, items: parseItemsText(itemsText) }))
    setHasRun(true)
  }, [itemsText, parseItemsText])
  const handleReset = useCallback(() => {
    setInputs({
      companyName: 'Your Business', companyAddress: '123 Business St, City - 600001', gstin: '33ABCDE1234F1Z5',
      invoiceNo: `INV-${Date.now().toString(36).toUpperCase()}`, customerName: '', customerGstin: '',
      placeOfSupply: 'Tamil Nadu', date: new Date().toISOString().split('T')[0],
      items: [{ name: 'Product 1', hsn: '1234', qty: 1, rate: 1000, gstRate: 18 }],
    })
    setItemsText('Product 1,1234,1,1000,18')
    setHasRun(false)
  }, [])

  const handleDownloadPDF = useCallback(() => {
    if (!activeResult) return
    const content = `
TAX INVOICE
===========
Invoice: ${activeResult.invoiceNumber}
Date: ${activeResult.invoiceDate}

Seller:
${activeResult.companyName}
${activeResult.companyAddress}
GSTIN: ${activeResult.gstin}

Buyer:
${activeResult.customerName}
GSTIN: ${activeResult.customerGstin || 'N/A'}
Place of Supply: ${activeResult.placeOfSupply}

Items:
${activeResult.lineItems?.map(i => `${i.name} x${i.qty} @ ₹${i.rate} - Taxable: ₹${i.taxable} | CGST: ₹${i.cgst} | SGST: ₹${i.sgst} | Total: ₹${i.total}`).join('\n')}

Summary:
Total Taxable: ₹${activeResult.totalTaxable}
Total CGST: ₹${activeResult.totalCGST}
Total SGST: ₹${activeResult.totalSGST}
Total GST: ₹${activeResult.totalGST}
Grand Total: ₹${activeResult.grandTotal}

QR: ${activeResult.qrData}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${activeResult.invoiceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeResult])

  return (
    <div className="space-y-5">
      <Section title="Invoice Details" icon={Receipt}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Your Business</h4>
            {['companyName', 'companyAddress', 'gstin'].map(f => (
              <div key={f} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{f.replace('company', '').replace('gstin', 'GSTIN')}</label>
                <input value={inputs[f]} onChange={e => handleChange(f, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Customer & Invoice</h4>
            {['customerName', 'customerGstin', 'placeOfSupply', 'date', 'invoiceNo'].map(f => (
              <div key={f} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{f.replace('customer', '').replace('Gstin', ' GSTIN').replace('invoiceNo', 'Invoice No')}</label>
                <input value={inputs[f]} onChange={e => handleChange(f, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <label className="text-xs text-muted-foreground">Items (one per line: <span className="font-medium">name,hsn,qty,rate,gstRate</span>)</label>
          <textarea value={itemsText} onChange={e => setItemsText(e.target.value)} rows={4}
            placeholder={"Example:\nProduct 1,1234,1,1000,18\nProduct 2,5678,2,499.5,12"}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm font-mono" />
          <p className="text-xs text-muted-foreground">You can also paste a JSON array or use commas, pipes or tabs as separators.</p>
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCalc}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20">
            <FileText className="w-4 h-4" /> Generate Invoice
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>{activeResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <Section>
            <div className="max-w-2xl mx-auto border border-border rounded-xl p-6 space-y-4 text-sm bg-white text-black">
              <div className="text-center border-b pb-4"><h2 className="text-xl font-bold">TAX INVOICE</h2><p className="text-gray-500">{activeResult.invoiceNumber} | {activeResult.invoiceDate}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><strong className="text-gray-700">Seller:</strong><p className="text-gray-600 text-xs">{activeResult.companyName}<br/>{activeResult.companyAddress}<br/>GSTIN: {activeResult.gstin}</p></div>
                <div><strong className="text-gray-700">Buyer:</strong><p className="text-gray-600 text-xs">{activeResult.customerName}<br/>GSTIN: {activeResult.customerGstin || 'N/A'}<br/>{activeResult.placeOfSupply}</p></div>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Rate</th><th className="text-right py-1">Taxable</th><th className="text-right py-1">CGST</th><th className="text-right py-1">SGST</th><th className="text-right py-1">Total</th></tr></thead>
                <tbody>{activeResult.lineItems?.map((item, i) => (
                  <tr key={i} className="border-b border-dashed"><td className="py-1">{item.name}</td><td className="text-right py-1">{item.qty}</td><td className="text-right py-1">₹{item.rate}</td><td className="text-right py-1">₹{item.taxable.toFixed(2)}</td><td className="text-right py-1">₹{item.cgst.toFixed(2)}</td><td className="text-right py-1">₹{item.sgst.toFixed(2)}</td><td className="text-right py-1 font-bold">₹{item.total.toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
              <div className="border-t pt-3 space-y-1 text-right text-xs">
                <div><span className="text-gray-500">Total Taxable: </span><strong>₹{activeResult.totalTaxable.toFixed(2)}</strong></div>
                <div><span className="text-gray-500">CGST: </span><strong>₹{activeResult.totalCGST.toFixed(2)}</strong></div>
                <div><span className="text-gray-500">SGST: </span><strong>₹{activeResult.totalSGST.toFixed(2)}</strong></div>
                <div className="text-base border-t pt-2"><span className="text-gray-700">Grand Total: </span><strong className="text-lg">₹{activeResult.grandTotal.toFixed(2)}</strong></div>
              </div>
            </div>
          </Section>

          {activeResult.gstSummary?.length > 0 && (
            <Section title="GST Summary">
              <div className="grid grid-cols-3 gap-3">
                {activeResult.gstSummary.map((s, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-primary">{s.rate}%</p>
                    <p className="text-xs text-muted-foreground">Taxable: ₹{s.taxable.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">GST: ₹{s.gst.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="flex gap-2 justify-center">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-medium transition-all">
              <Download className="w-3.5 h-3.5" /> Download Invoice
            </motion.button>
            <CopyButton text={activeResult.qrData} label="Copy QR Data" />
          </div>
        </motion.div>
      )}</AnimatePresence>
      {!hasRun && <div className="text-center py-8 text-muted-foreground text-sm">Enter business details and items to generate a professional GST invoice.</div>}
    </div>
  )
})

export default SmartGSTInvoiceBuilder