'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { RefreshCw, Copy, Check, Trash2, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

const FLIP_MAP = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ',
  n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  A: '∀', B: 'ᗺ', C: 'Ɔ', D: '◖', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ', K: 'ʞ', L: '˥', M: 'W',
  N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᗱ', S: 'S', T: '⊥', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
  1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6', 0: '0',
  '.': '˙', ',': "'", '\'': ',', '"': '„', '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[',
  '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋', '_': '‾'
}

export default function TextReverser() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('chars') // 'chars', 'words', 'lines', 'flip'
  const [copied, setCopied] = useState(false)

  const reversedOutput = useMemo(() => {
    if (!text) return ''

    switch (mode) {
      case 'chars':
        return text.split('').reverse().join('')
      case 'words':
        return text
          .split(/(\s+)/)
          .map((part) => (/\s+/.test(part) ? part : part.split('').reverse().join('')))
          .join('')
      case 'lines':
        return text.split('\n').reverse().join('\n')
      case 'flip':
        return text
          .split('')
          .map((c) => FLIP_MAP[c] || c)
          .reverse()
          .join('')
      default:
        return text
    }
  }, [text, mode])

  const copyResult = useCallback(() => {
    if (!reversedOutput) {
      toast.error('No text to copy!')
      return
    }
    navigator.clipboard.writeText(reversedOutput)
    setCopied(true)
    toast.success('Transformed text copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [reversedOutput])

  const loadSample = useCallback(() => {
    setText('Hello World! Next.js is absolutely amazing.')
    toast.success('Sample loaded')
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Settings Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <RefreshCw className="w-4.5 h-4.5 text-primary" />
              Reverser Settings
            </h2>
            <button
              onClick={loadSample}
              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold transition-all text-muted-foreground"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reversing Mode</label>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'chars', label: 'Reverse Entire Text', desc: 'Reverses the sequence of all characters' },
                  { key: 'words', label: 'Reverse Each Word', desc: 'Reverses individual words leaving spaces' },
                  { key: 'lines', label: 'Reverse Line Order', desc: 'Reverses the list order of lines' },
                  { key: 'flip', label: 'Flip Text (Upside Down)', desc: 'Converts to flipped unicode strings' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMode(item.key)}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-0.5 ${
                      mode === item.key
                        ? 'bg-primary/5 border-primary text-primary'
                        : 'bg-muted/20 border-border/40 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor & Output Column */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source Input</label>
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
            className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y placeholder:text-muted-foreground/60"
            placeholder="Type your text to see it reversed in real-time..."
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              Transformed Output
            </label>
            <button
              disabled={!reversedOutput}
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Transformed
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[140px] whitespace-pre-wrap select-all">
            <code>{reversedOutput || <span className="text-muted-foreground/30 italic">Converted string will display here...</span>}</code>
          </pre>
        </div>

        <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground text-xs leading-relaxed">
          <HelpCircle className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
          <p>
            Flip mode uses upside-down Unicode characters. Some characters or emojis might not have an exact upside-down representation.
          </p>
        </div>
      </div>
    </div>
  )
}
