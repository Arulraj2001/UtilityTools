'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Type, Copy, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CaseConverter() {
  const [text, setText] = useState('')
  const [copiedKey, setCopiedKey] = useState(null)

  const toSentenceCase = useCallback((str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .replace(/(^\s*|[.!?]\s+)([a-z])/g, (m) => m.toUpperCase())
  }, [])

  const toTitleCase = useCallback((str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }, [])

  const toCamelCase = useCallback((str) => {
    if (!str) return ''
    const words = str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0)
    if (words.length === 0) return ''
    return words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
  }, [])

  const toPascalCase = useCallback((str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  }, [])

  const toSnakeCase = useCallback((str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .join('_')
  }, [])

  const toKebabCase = useCallback((str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .join('-')
  }, [])

  const conversions = useMemo(() => {
    const raw = text.trim()
    return [
      { key: 'sentence', label: 'Sentence Case', value: toSentenceCase(text) },
      { key: 'title', label: 'Title Case', value: toTitleCase(text) },
      { key: 'upper', label: 'UPPERCASE', value: text.toUpperCase() },
      { key: 'lower', label: 'lowercase', value: text.toLowerCase() },
      { key: 'camel', label: 'camelCase', value: toCamelCase(raw) },
      { key: 'pascal', label: 'PascalCase', value: toPascalCase(raw) },
      { key: 'snake', label: 'snake_case', value: toSnakeCase(raw) },
      { key: 'kebab', label: 'kebab-case', value: toKebabCase(raw) },
    ]
  }, [text, toSentenceCase, toTitleCase, toCamelCase, toPascalCase, toSnakeCase, toKebabCase])

  const handleCopy = useCallback((val, key) => {
    if (!val) {
      toast.error('No converted text to copy!')
      return
    }
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    toast.success('Converted text copied!')
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const clearText = useCallback(() => {
    setText('')
    toast.success('Cleared input')
  }, [])

  const loadSampleText = useCallback(() => {
    setText('convert my text to various cases easily!')
    toast.success('Sample loaded')
  }, [])

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Type className="w-4.5 h-4.5 text-primary" />
            Input Text to Convert
          </h2>
          <div className="flex gap-2">
            <button
              onClick={loadSampleText}
              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-semibold transition-all"
            >
              Sample Text
            </button>
            <button
              onClick={clearText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y placeholder:text-muted-foreground/60 font-mono"
          placeholder="Enter text to automatically convert across multiple casing standards..."
        />
      </div>

      {/* Grid output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conversions.map(({ key, label, value }) => (
          <div
            key={key}
            className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between space-y-2 shadow-xs transition-all hover:border-border"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
              <button
                disabled={!value}
                onClick={() => handleCopy(value, key)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              >
                {copiedKey === key ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border/40 font-mono text-sm break-all select-all min-h-[46px] flex items-center text-foreground">
              {value || <span className="text-muted-foreground/40 italic">Casing preview will appear here</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
