'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Copy, Check, Trash2, ListChecks, ArrowDownWideNarrow } from 'lucide-react'
import { toast } from 'sonner'

export default function DuplicateRemover() {
  const [text, setText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [trimLines, setTrimLines] = useState(true)
  const [removeEmpty, setRemoveEmpty] = useState(true)
  const [copied, setCopied] = useState(false)

  const deduplicated = useMemo(() => {
    if (!text) {
      return { output: '', originalCount: 0, uniqueCount: 0, duplicatesRemoved: 0, percentage: 0 }
    }

    const lines = text.split('\n')
    const originalCount = lines.length

    const seen = new Set()
    const result = []

    lines.forEach((line) => {
      let cleanLine = line
      if (trimLines) {
        cleanLine = cleanLine.trim()
      }

      if (removeEmpty && cleanLine === '') {
        return
      }

      const matchKey = caseSensitive ? cleanLine : cleanLine.toLowerCase()
      if (!seen.has(matchKey)) {
        seen.add(matchKey)
        result.push(line) // Keep original formatting
      }
    })

    const uniqueCount = result.length
    const duplicatesRemoved = originalCount - uniqueCount
    const percentage = originalCount > 0 ? ((duplicatesRemoved / originalCount) * 100).toFixed(1) : 0

    return {
      output: result.join('\n'),
      originalCount,
      uniqueCount,
      duplicatesRemoved,
      percentage
    }
  }, [text, caseSensitive, trimLines, removeEmpty])

  const copyResult = useCallback(() => {
    if (!deduplicated.output) {
      toast.error('No deduplicated list to copy!')
      return
    }
    navigator.clipboard.writeText(deduplicated.output)
    setCopied(true)
    toast.success('Deduplicated list copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [deduplicated.output])

  const loadSample = useCallback(() => {
    setText(
      'developer@example.com\n' +
      'admin@example.com\n' +
      'developer@example.com\n' +
      '  admin@example.com  \n' +
      'support@example.com\n' +
      'ADMIN@example.com'
    )
    toast.success('Sample list loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameter Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <ListChecks className="w-4.5 h-4.5 text-primary" />
              Deduplicator Settings
            </h2>
            <button
              onClick={loadSample}
              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            {/* Parameters checkboxes */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                Comparison Rules
              </span>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Case Sensitive (&quot;A&quot; &ne; &quot;a&quot;)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trimLines}
                    onChange={(e) => setTrimLines(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Trim Whitespace before matching
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeEmpty}
                    onChange={(e) => setRemoveEmpty(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Remove Empty Lines
                </label>
              </div>
            </div>

            {/* Deduplication Statistics */}
            {text ? (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5">
                  <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                  Redundancy Report
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex flex-col bg-background/50 border border-border/30 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground">Original Entries</span>
                    <span className="font-bold text-foreground mt-0.5">{deduplicated.originalCount}</span>
                  </div>
                  <div className="flex flex-col bg-background/50 border border-border/30 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground">Unique Entries</span>
                    <span className="font-bold text-foreground mt-0.5">{deduplicated.uniqueCount}</span>
                  </div>
                  <div className="flex flex-col bg-background/50 border border-border/30 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground">Removed</span>
                    <span className="font-bold text-rose-500 mt-0.5">-{deduplicated.duplicatesRemoved}</span>
                  </div>
                  <div className="flex flex-col bg-background/50 border border-border/30 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground">Redundancy %</span>
                    <span className="font-bold text-primary mt-0.5">{deduplicated.percentage}%</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Editor & Output Column */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original List</label>
            <button
              onClick={() => {
                setText('')
                toast.success('Cleared input list')
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y font-mono placeholder:text-muted-foreground/60"
            placeholder="Paste your line list here to deduplicate..."
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clean Unique List</label>
            <button
              disabled={!deduplicated.output}
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Clean List
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[140px] whitespace-pre select-all">
            <code>{deduplicated.output || <span className="text-muted-foreground/30 italic">Cleaned list will show here...</span>}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
