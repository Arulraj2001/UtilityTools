'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { Link2, Copy, Check, Sliders, Globe } from 'lucide-react'
import { toast } from 'sonner'

export default function SlugGenerator() {
  const [text, setText] = useState('')
  const [separator, setSeparator] = useState('-')
  const [lowercase, setLowercase] = useState(true)
  const [removeStopwords, setRemoveStopwords] = useState(false)
  const [copied, setCopied] = useState(false)

  const slug = useMemo(() => {
    if (!text) return ''

    let clean = text.trim()

    // Optionally remove stop words
    if (removeStopwords) {
      const stopwords = new Set([
        'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of',
        'in', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
        'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'
      ])
      const words = clean.split(/\s+/)
      clean = words.filter((w) => !stopwords.has(w.toLowerCase())).join(' ')
    }

    if (lowercase) {
      clean = clean.toLowerCase()
    }

    // Replace accented/diacritics characters
    clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Replace non-alphanumeric chars (excluding spaces)
    clean = clean.replace(/[^a-zA-Z0-9\s-_]/g, '')

    // Replace spaces and existing dashes/underscores with chosen separator
    clean = clean.replace(/[\s\-_]+/g, separator)

    // Trim separators from start and end
    const escapedSep = separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const startRegex = new RegExp(`^${escapedSep}+`)
    const endRegex = new RegExp(`${escapedSep}+$`)
    clean = clean.replace(startRegex, '').replace(endRegex, '')

    return clean
  }, [text, separator, lowercase, removeStopwords])

  const copySlug = useCallback(() => {
    if (!slug) {
      toast.error('No slug generated to copy!')
      return
    }
    navigator.clipboard.writeText(slug)
    setCopied(true)
    toast.success('Slug copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }, [slug])

  const loadSample = useCallback(() => {
    setText('Introduction to Next.js 16 & Advanced Tailwind CSS Styling!')
    toast.success('Sample loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Column */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Link2 className="w-4.5 h-4.5 text-primary" />
              Slug Generator
            </h2>
            <button
              onClick={loadSample}
              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            {/* Input Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title or Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y placeholder:text-muted-foreground/60"
                placeholder="e.g. 10 Tips for Writing Clean Code"
              />
            </div>

            {/* Separator select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Word Separator</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="">None (Concatenate)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Casing</label>
                <select
                  value={lowercase ? 'lower' : 'preserve'}
                  onChange={(e) => setLowercase(e.target.value === 'lower')}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="lower">Lowercase Slug (Recommended)</option>
                  <option value="preserve">Preserve Original Casing</option>
                </select>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Parameters
              </span>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeStopwords}
                  onChange={(e) => setRemoveStopwords(e.target.checked)}
                  className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                />
                Filter common SEO stop words (a, an, the, is, for...)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* URL Preview mockup */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-5 shadow-sm h-full flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Slug Output</h3>
            
            {/* Address Bar mockup */}
            <div className="border border-border/60 rounded-xl bg-background overflow-hidden">
              <div className="bg-muted/20 border-b border-border/30 px-3 py-2 flex items-center gap-2 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 max-w-md mx-auto bg-muted/40 border border-border/20 rounded-md py-0.5 px-3.5 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <Globe className="w-3 h-3 text-muted-foreground/60" />
                  <span>https://example.com/</span>
                  <span className="text-foreground truncate select-all">{slug || 'your-slug-here'}</span>
                </div>
              </div>
              <div className="p-4 font-mono text-xs text-foreground select-all break-all min-h-[80px] flex items-center justify-center bg-muted/5">
                {slug || <span className="text-muted-foreground/30 italic">Generated slug preview...</span>}
              </div>
            </div>
          </div>

          <button
            disabled={!slug}
            onClick={copySlug}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:brightness-105 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy SEO Slug
          </button>
        </div>
      </div>
    </div>
  )
}
