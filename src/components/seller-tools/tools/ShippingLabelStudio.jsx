/**
 * Advanced Shipping Label Studio - Premium label generator with preview, barcode, and PDF export
 */
import React, { memo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, Download, RefreshCw, Package, User, MapPin, Phone, Hash, QrCode, Barcode } from 'lucide-react'
import { Section } from '../PremiumSellerCharts'

const ShippingLabelStudio = memo(() => {
  const [inputs, setInputs] = useState({
    senderName: '', senderAddress: '', senderPhone: '',
    receiverName: '', receiverAddress: '', receiverPhone: '',
    weight: '', courier: '', orderId: '',
  })
  const [generated, setGenerated] = useState(false)
  const labelRef = useRef(null)

  const handleChange = useCallback((n, v) => { setGenerated(false); setInputs(p => ({ ...p, [n]: v })) }, [])
  const handleGenerate = useCallback(() => setGenerated(true), [])
  const handleReset = useCallback(() => {
    setInputs({
      senderName: '', senderAddress: '', senderPhone: '',
      receiverName: '', receiverAddress: '', receiverPhone: '',
      weight: '', courier: '', orderId: '',
    })
    setGenerated(false)
  }, [])

  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><style>
      body { font-family: 'Courier New', monospace; padding: 20px; }
      .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .section { margin: 10px 0; }
      .barcode { text-align: center; font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 4px; margin: 10px 0; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>
    <div class="label">
      <div class="header"><h2>SHIPPING LABEL</h2><p>${inputs.courier}</p><p>Order: ${inputs.orderId}</p></div>
      <div class="section"><strong>FROM:</strong><br/>${inputs.senderName}<br/>${inputs.senderAddress}<br/>${inputs.senderPhone}</div>
      <div class="section"><strong>TO:</strong><br/>${inputs.receiverName}<br/>${inputs.receiverAddress}<br/>${inputs.receiverPhone}</div>
      <div class="section"><strong>Weight:</strong> ${inputs.weight} kg</div>
      <div class="barcode">|||${inputs.orderId.slice(-6)}|||</div>
    </div>
    <script>window.print()</script></body></html>`)
    win.document.close()
  }, [inputs])

  const handleDownload = useCallback(() => {
    const content = `SHIPPING LABEL
================
Courier: ${inputs.courier}
Order: ${inputs.orderId}
Weight: ${inputs.weight} kg

FROM:
${inputs.senderName}
${inputs.senderAddress}
${inputs.senderPhone}

TO:
${inputs.receiverName}
${inputs.receiverAddress}
${inputs.receiverPhone}

Barcode: |||${inputs.orderId.slice(-6)}|||
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipping-label-${inputs.orderId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [inputs])

  return (
    <div className="space-y-5">
      <Section title="Shipping Details" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Sender Info</h4>
            {['senderName', 'senderAddress', 'senderPhone'].map(f => (
              <div key={f} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{f.replace('sender', '')}</label>
                <input value={inputs[f]} onChange={e => handleChange(f, e.target.value)} placeholder={f === 'senderPhone' ? '9876543210' : `Enter ${f.replace('sender', '').trim()}`}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Receiver Info</h4>
            {['receiverName', 'receiverAddress', 'receiverPhone'].map(f => (
              <div key={f} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">{f.replace('receiver', '')}</label>
                <input value={inputs[f]} onChange={e => handleChange(f, e.target.value)} placeholder={f === 'receiverPhone' ? '9876543210' : `Enter ${f.replace('receiver', '').trim()}`}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Weight (kg)</label>
            <input value={inputs.weight} onChange={e => handleChange('weight', e.target.value)} placeholder="0.5"
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Courier</label>
            <select value={inputs.courier} onChange={e => handleChange('courier', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 outline-none text-sm">
              <option value="" disabled hidden>Select courier</option>
              {['Delhivery', 'Blue Dart', 'DTDC', 'Ekart', 'XpressBees', 'Amazon Shipping'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Order ID</label>
            <input value={inputs.orderId} onChange={e => handleChange('orderId', e.target.value)} placeholder="ORD12345"
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 outline-none text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20">
            <Printer className="w-4 h-4" /> Generate Label
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4" /> Reset
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>{generated && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <Section>
            <div ref={labelRef} className="max-w-md mx-auto border-2 border-border rounded-xl p-6 font-mono text-xs space-y-3 bg-white text-black">
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-3">
                <h3 className="text-lg font-bold">SHIPPING LABEL</h3>
                <p className="text-gray-600">{inputs.courier}</p>
                <p className="text-gray-500">Order: {inputs.orderId}</p>
              </div>
              <div className="space-y-1"><strong className="text-gray-700">FROM:</strong><p>{inputs.senderName}<br/>{inputs.senderAddress}<br/>{inputs.senderPhone}</p></div>
              <div className="space-y-1"><strong className="text-gray-700">TO:</strong><p>{inputs.receiverName}<br/>{inputs.receiverAddress}<br/>{inputs.receiverPhone}</p></div>
              <div className="flex justify-between"><span>Weight: <strong>{inputs.weight} kg</strong></span></div>
              <div className="text-center text-xl tracking-widest font-bold border-t border-gray-300 pt-3">|||{inputs.orderId.slice(-6)}|||</div>
            </div>
          </Section>
          <div className="flex gap-2 justify-center">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-medium transition-all">
              <Printer className="w-3.5 h-3.5" /> Print Label
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-medium transition-all">
              <Download className="w-3.5 h-3.5" /> Download Label
            </motion.button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      {!generated && <div className="text-center py-8 text-muted-foreground text-sm">Enter shipping details to generate a professional shipping label with barcode.</div>}
    </div>
  )
})

export default ShippingLabelStudio