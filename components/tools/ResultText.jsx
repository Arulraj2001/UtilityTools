import React, { useMemo, useState } from 'react'
import { Copy, Check, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default React.memo(function ResultText({ value, label = 'Result', type = 'text' }) {
  const [copied, setCopied] = useState(false)
  const textValue = useMemo(() => String(value ?? ''), [value])

  const copy = () => {
    navigator.clipboard.writeText(textValue)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([textValue], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `result.${type === 'json' ? 'json' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 shadow-2xl shadow-slate-950/20 overflow-hidden"
    >
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Text Output</p>
            <h3 className="text-lg font-semibold text-white">{label}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" className="rounded-2xl gap-2 text-xs" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="secondary" className="rounded-2xl gap-2 text-xs" onClick={download}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="p-5">
        <pre className="max-h-[24rem] overflow-auto rounded-[1.5rem] border border-white/10 bg-slate-950 px-4 py-4 text-sm leading-6 font-mono text-gray-300">
          {textValue}
        </pre>
      </div>
    </motion.div>
  )
})
