'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Search, Copy, Check, Trash2, Sliders, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function FindReplace() {
  const [text, setText] = useState('')
  const [findStr, setFindStr] = useState('')
  const [replaceStr, setReplaceStr] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [copied, setCopied] = useState(false)

  // Safe regex compile and replace
  const replacementResult = useMemo(() => {
    if (!text) {
      return { output: '', count: 0, error: null }
    }
    if (!findStr) {
      return { output: text, count: 0, error: null }
    }

    try {
      let regex
      if (useRegex) {
        let flags = 'g'
        if (!caseSensitive) flags += 'i'
        regex = new RegExp(findStr, flags)
      } else {
        // Escape special regex chars if not using regex mode but we need global matching
        const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        let flags = 'g'
        if (!caseSensitive) flags += 'i'
        regex = new RegExp(escaped, flags)
      }

      // Count occurrences
      const matches = text.match(regex)
      const count = matches ? matches.length : 0

      const output = text.replace(regex, replaceStr)
      return { output, count, error: null }
    } catch (err) {
      return { output: text, count: 0, error: err.message }
    }
  }, [text, findStr, replaceStr, caseSensitive, useRegex])

  const copyResult = useCallback(() => {
    if (!replacementResult.output) {
      toast.error('No result to copy!')
      return
    }
    navigator.clipboard.writeText(replacementResult.output)
    setCopied(true)
    toast.success('Replaced text copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [replacementResult.output])

  const clearAll = useCallback(() => {
    setText('')
    setFindStr('')
    setReplaceStr('')
    toast.success('Cleared all fields')
  }, [])

  const loadSample = useCallback(() => {
    setText(
      'The quick brown fox jumps over the lazy dog. ' +
      'Cats are nice, but dogs are more loyal. ' +
      'Every developer loves writing code in javascript.'
    )
    setFindStr('dog')
    setReplaceStr('wolf')
    toast.success('Sample text loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left panel: Config and Input */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Search className="w-4.5 h-4.5 text-primary" />
              Find &amp; Replace
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadSample}
                className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
              >
                Load Sample
              </button>
              <button
                onClick={clearAll}
                className="px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-[11px] font-semibold transition-all text-destructive"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Input textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Source Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-xs transition-all focus:border-primary/50 resize-y placeholder:text-muted-foreground/60"
                placeholder="Type or paste your text here..."
              />
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Find Text</label>
                <input
                  type="text"
                  value={findStr}
                  onChange={(e) => setFindStr(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 font-mono"
                  placeholder="e.g. dog"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Replace With</label>
                <input
                  type="text"
                  value={replaceStr}
                  onChange={(e) => setReplaceStr(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 font-mono"
                  placeholder="e.g. wolf"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Parameters
              </span>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Case Sensitive
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={(e) => setUseRegex(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Use Regular Expressions
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Results Output */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">Replaced Output</h3>
              <div className="flex items-center gap-3">
                {replacementResult.error ? (
                  <span className="flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    Invalid Regex
                  </span>
                ) : text && findStr ? (
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                    {replacementResult.count} replaced
                  </span>
                ) : null}
                <button
                  disabled={!!replacementResult.error || !replacementResult.output}
                  onClick={copyResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Result
                </button>
              </div>
            </div>

            {replacementResult.error ? (
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-mono">
                {replacementResult.error}
              </div>
            ) : (
              <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[220px] max-h-[400px] whitespace-pre-wrap break-all">
                <code>{replacementResult.output || <span className="text-muted-foreground/30 italic">Modified text output will render here...</span>}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
