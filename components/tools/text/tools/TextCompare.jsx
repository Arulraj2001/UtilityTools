'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Columns, Eye, GitPullRequest, Copy, Check, Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function TextCompare() {
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [viewMode, setViewMode] = useState('unified') // 'unified' or 'split'
  const [copied, setCopied] = useState(false)

  const diffResult = useMemo(() => {
    const origLines = original.split('\n')
    const modLines = modified.split('\n')
    const n = origLines.length
    const m = modLines.length

    // Dynamic Programming table for LCS
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (origLines[i - 1] === modLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        }
      }
    }

    let i = n
    let j = m
    const items = []

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
        items.unshift({
          type: 'unchanged',
          text: origLines[i - 1],
          origLineNum: i,
          modLineNum: j,
        })
        i--
        j--
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        items.unshift({
          type: 'added',
          text: modLines[j - 1],
          modLineNum: j,
        })
        j--
      } else {
        items.unshift({
          type: 'removed',
          text: origLines[i - 1],
          origLineNum: i,
        })
        i--
      }
    }

    const addedCount = items.filter((x) => x.type === 'added').length
    const removedCount = items.filter((x) => x.type === 'removed').length
    const unchangedCount = items.filter((x) => x.type === 'unchanged').length

    return {
      items,
      addedCount,
      removedCount,
      unchangedCount,
    }
  }, [original, modified])

  const loadSample = useCallback(() => {
    setOriginal(
      'Premium UI utility library\n' +
      'Provides modern styling systems.\n' +
      'Works with React and TailwindCSS.\n' +
      'Version 1.0.0 released.'
    )
    setModified(
      'Premium UI utility library\n' +
      'Provides modern, beautiful styling systems.\n' +
      'Works with React, Next.js and TailwindCSS.\n' +
      'Supports HSL color palettes.\n' +
      'Version 1.1.0 updated.'
    )
    toast.success('Sample texts loaded')
  }, [])

  const clearAll = useCallback(() => {
    setOriginal('')
    setModified('')
    toast.success('Cleared both panels')
  }, [])

  const copyDiff = useCallback(() => {
    if (diffResult.items.length === 0) return
    const textToCopy = diffResult.items
      .map((item) => {
        if (item.type === 'added') return `+ ${item.text}`
        if (item.type === 'removed') return `- ${item.text}`
        return `  ${item.text}`
      })
      .join('\n')
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success('Diff copied in patch format!')
    setTimeout(() => setCopied(false), 2000)
  }, [diffResult])

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Interactive Text Comparer</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSample}
            className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-semibold transition-all"
          >
            Load Sample Diff
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-all"
          >
            Clear Inputs
          </button>
        </div>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-xs">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Text (Left/Old)</label>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y font-mono placeholder:text-muted-foreground/60"
            placeholder="Type or paste the original version here..."
          />
        </div>

        {/* Modified */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-xs">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modified Text (Right/New)</label>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y font-mono placeholder:text-muted-foreground/60"
            placeholder="Type or paste the modified version here..."
          />
        </div>
      </div>

      {/* Control panel and Results */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-foreground">Difference Analysis</h3>
            {original || modified ? (
              <div className="flex gap-2 text-xs">
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  +{diffResult.addedCount} additions
                </span>
                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                  -{diffResult.removedCount} deletions
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'unified' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'split' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Side-by-Side
            </button>
            <button
              disabled={diffResult.items.length === 0}
              onClick={copyDiff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Patch
            </button>
          </div>
        </div>

        {/* Diff view screen */}
        {original || modified ? (
          <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
            {viewMode === 'unified' ? (
              <div className="p-4 font-mono text-xs overflow-x-auto space-y-1">
                {diffResult.items.map((item, idx) => {
                  let cls = 'text-muted-foreground py-0.5 px-2 rounded-sm'
                  let indicator = ' '
                  if (item.type === 'added') {
                    cls = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 border-l-2 border-emerald-500 rounded-sm'
                    indicator = '+'
                  } else if (item.type === 'removed') {
                    cls = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 py-0.5 px-2 border-l-2 border-rose-500 rounded-sm line-through'
                    indicator = '-'
                  }
                  return (
                    <div key={idx} className={`${cls} flex gap-2 select-all whitespace-pre`}>
                      <span className="text-muted-foreground/40 select-none w-4 text-center">{indicator}</span>
                      <span>{item.text || ' '}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 border-t border-border/40 divide-x divide-border/40">
                {/* Left panel (Original deletions) */}
                <div className="p-4 font-mono text-xs overflow-x-auto space-y-1 bg-muted/10">
                  <div className="text-[10px] text-muted-foreground font-semibold pb-2 border-b border-border/20 mb-2 uppercase select-none">
                    Original Version
                  </div>
                  {diffResult.items.map((item, idx) => {
                    if (item.type === 'added') {
                      // Empty spacing spacer line to align lines side by side
                      return (
                        <div key={`spacer-l-${idx}`} className="py-0.5 text-transparent select-none bg-muted/5 rounded-sm">
                          &nbsp;
                        </div>
                      )
                    }
                    const cls = item.type === 'removed'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 py-0.5 px-2 border-l-2 border-rose-500 rounded-sm line-through'
                      : 'text-muted-foreground py-0.5 px-2 rounded-sm'
                    return (
                      <div key={`l-${idx}`} className={`${cls} select-all whitespace-pre`}>
                        {item.text || ' '}
                      </div>
                    )
                  })}
                </div>

                {/* Right panel (Modified additions) */}
                <div className="p-4 font-mono text-xs overflow-x-auto space-y-1 bg-muted/10">
                  <div className="text-[10px] text-muted-foreground font-semibold pb-2 border-b border-border/20 mb-2 uppercase select-none">
                    Modified Version
                  </div>
                  {diffResult.items.map((item, idx) => {
                    if (item.type === 'removed') {
                      // Spacer line to align lines side by side
                      return (
                        <div key={`spacer-r-${idx}`} className="py-0.5 text-transparent select-none bg-muted/5 rounded-sm">
                          &nbsp;
                        </div>
                      )
                    }
                    const cls = item.type === 'added'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 border-l-2 border-emerald-500 rounded-sm'
                      : 'text-muted-foreground py-0.5 px-2 rounded-sm'
                    return (
                      <div key={`r-${idx}`} className={`${cls} select-all whitespace-pre`}>
                        {item.text || ' '}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-border/40 border-dashed rounded-xl bg-background py-16 flex flex-col items-center justify-center text-center text-muted-foreground text-xs space-y-2">
            <Columns className="w-8 h-8 text-muted-foreground/50 animate-pulse" />
            <p>Enter text in the panels above to see dynamic changes compared side-by-side.</p>
          </div>
        )}

        <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground text-xs leading-relaxed">
          <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
          <p>
            This comparison utility checks lines sequentially using an LCS algorithm. Copy the unified patch or side-by-side layouts above for versioning references.
          </p>
        </div>
      </div>
    </div>
  )
}
