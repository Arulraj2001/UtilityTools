'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { SortAsc, Copy, Check, Trash2, Sliders } from 'lucide-react'
import { toast } from 'sonner'

export default function LineSorter() {
  const [text, setText] = useState('')
  const [sortType, setSortType] = useState('asc') // 'asc', 'desc', 'length-asc', 'length-desc', 'shuffle', 'reverse'
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true)
  const [removeEmpty, setRemoveEmpty] = useState(true)
  const [copied, setCopied] = useState(false)

  const sortedText = useMemo(() => {
    if (!text) return ''

    let lines = text.split('\n')

    // Filter out empty lines if option is checked
    if (removeEmpty) {
      lines = lines.filter((l) => l.trim().length > 0)
    }

    // Apply sorting
    if (sortType === 'reverse') {
      lines.reverse()
    } else if (sortType === 'shuffle') {
      // Fisher-Yates Shuffle with a pure deterministic generator
      const arr = [...lines]
      let seed = 987654321
      const pureRandom = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
      }
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(pureRandom() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      lines = arr
    } else {
      lines.sort((a, b) => {
        let strA = ignoreWhitespace ? a.trim() : a
        let strB = ignoreWhitespace ? b.trim() : b

        if (!caseSensitive) {
          strA = strA.toLowerCase()
          strB = strB.toLowerCase()
        }

        if (sortType === 'asc') {
          return strA.localeCompare(strB)
        } else if (sortType === 'desc') {
          return strB.localeCompare(strA)
        } else if (sortType === 'length-asc') {
          return strA.length - strB.length || strA.localeCompare(strB)
        } else if (sortType === 'length-desc') {
          return strB.length - strA.length || strB.localeCompare(strA)
        }
        return 0
      })
    }

    return lines.join('\n')
  }, [text, sortType, caseSensitive, ignoreWhitespace, removeEmpty])

  const copyResult = useCallback(() => {
    if (!sortedText) {
      toast.error('No sorted text to copy!')
      return
    }
    navigator.clipboard.writeText(sortedText)
    setCopied(true)
    toast.success('Sorted lines copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [sortedText])

  const loadSample = useCallback(() => {
    setText(
      'Orange\n' +
      'apple\n' +
      '  Banana\n' +
      'watermelon\n' +
      'Grape'
    )
    toast.success('Sample lines loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Config Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <SortAsc className="w-4.5 h-4.5 text-primary" />
              Line Sorter
            </h2>
            <button
              onClick={loadSample}
              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            {/* Sorting criteria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Sorting Mode</label>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
              >
                <option value="asc">Alphabetical (A - Z)</option>
                <option value="desc">Alphabetical (Z - A)</option>
                <option value="length-asc">Length (Shortest to Longest)</option>
                <option value="length-desc">Length (Longest to Shortest)</option>
                <option value="reverse">Reverse Line Order</option>
                <option value="shuffle">Shuffle (Randomize)</option>
              </select>
            </div>

            {/* Parameter toggles */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Parameters
              </span>
              <div className="flex flex-col gap-2.5">
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
                    checked={ignoreWhitespace}
                    onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                    className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                  />
                  Ignore Leading Whitespace
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
          </div>
        </div>
      </div>

      {/* Editor & Output Column */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unsorted Input Lines</label>
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
            placeholder="Enter lines of text here, one line per entry..."
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sorted Output</label>
            <button
              disabled={!sortedText}
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Sorted
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[140px] whitespace-pre select-all">
            <code>{sortedText || <span className="text-muted-foreground/30 italic">Sorted list will display here...</span>}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
