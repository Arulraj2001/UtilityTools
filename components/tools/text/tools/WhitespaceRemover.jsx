'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Copy, Check, Trash2, Sliders, Eraser } from 'lucide-react'
import { toast } from 'sonner'

export default function WhitespaceRemover() {
  const [text, setText] = useState('')
  const [removeEmptyLines, setRemoveEmptyLines] = useState(true)
  const [trimStarts, setTrimStarts] = useState(true)
  const [trimEnds, setTrimEnds] = useState(true)
  const [collapseSpaces, setCollapseSpaces] = useState(false)
  const [collapseNewlines, setCollapseNewlines] = useState(false)
  const [removeTabs, setRemoveTabs] = useState(false)
  const [copied, setCopied] = useState(false)

  const cleanResult = useMemo(() => {
    if (!text) {
      return { output: '', origLen: 0, newLen: 0, savedBytes: 0 }
    }

    let processed = text

    // Tab handling
    if (removeTabs) {
      processed = processed.replace(/\t/g, ' ')
    }

    // Collapse multiple spaces
    if (collapseSpaces) {
      processed = processed.replace(/ {2,}/g, ' ')
    }

    // Line by line processing
    let lines = processed.split('\n')

    if (trimStarts) {
      lines = lines.map((l) => l.replace(/^\s+/, ''))
    }

    if (trimEnds) {
      lines = lines.map((l) => l.replace(/\s+$/, ''))
    }

    if (removeEmptyLines) {
      lines = lines.filter((l) => l.length > 0)
    }

    processed = lines.join('\n')

    // Collapse multiple newlines
    if (collapseNewlines) {
      processed = processed.replace(/\n{3,}/g, '\n\n')
    }

    const origLen = text.length
    const newLen = processed.length
    const savedBytes = Math.max(0, origLen - newLen)

    return {
      output: processed,
      origLen,
      newLen,
      savedBytes
    }
  }, [text, removeEmptyLines, trimStarts, trimEnds, collapseSpaces, collapseNewlines, removeTabs])

  const copyResult = useCallback(() => {
    if (!cleanResult.output) {
      toast.error('No cleaned text to copy!')
      return
    }
    navigator.clipboard.writeText(cleanResult.output)
    setCopied(true)
    toast.success('Cleaned text copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [cleanResult.output])

  const loadSample = useCallback(() => {
    setText(
      '   Indented line starts\n\n\n' +
      'Line with trailing spaces     \n' +
      'Normal line\twith\ttabs\n\n' +
      'Extra     spaces      here'
    )
    toast.success('Sample loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Settings Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Eraser className="w-4.5 h-4.5 text-primary" />
              Whitespace Options
            </h2>
            <button
              onClick={loadSample}
              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            {/* Toggles */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Cleanup Rules
              </span>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeEmptyLines}
                    onChange={(e) => setRemoveEmptyLines(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Remove All Blank Lines
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trimStarts}
                    onChange={(e) => setTrimStarts(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Trim Line Starts (Indentations)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trimEnds}
                    onChange={(e) => setTrimEnds(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Trim Line Ends (Trailing Spaces)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={collapseSpaces}
                    onChange={(e) => setCollapseSpaces(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Collapse Multiple Spaces (2+ &rarr; 1)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={collapseNewlines}
                    onChange={(e) => setCollapseNewlines(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Collapse Multiple Breaks (3+ &rarr; 2)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeTabs}
                    onChange={(e) => setRemoveTabs(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Convert Tabs to Spaces
                </label>
              </div>
            </div>

            {/* Savings Report */}
            {text ? (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Original Characters:</span>
                  <span className="font-bold text-foreground">{cleanResult.origLen}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cleaned Characters:</span>
                  <span className="font-bold text-foreground">{cleanResult.newLen}</span>
                </div>
                <div className="flex justify-between text-primary font-semibold border-t border-border/20 pt-1 mt-1">
                  <span>Characters (Bytes) Saved:</span>
                  <span>{cleanResult.savedBytes}</span>
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
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dirty Source Input</label>
            <button
              onClick={() => {
                setText('')
                toast.success('Cleared input')
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
            placeholder="Type or paste text with whitespace errors here..."
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clean Output</label>
            <button
              disabled={!cleanResult.output}
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Cleaned
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[140px] whitespace-pre select-all">
            <code>{cleanResult.output || <span className="text-muted-foreground/30 italic">Cleaned text will display here...</span>}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
