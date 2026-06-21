'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { FileCode2, Copy, Check, Download, Sliders } from 'lucide-react'
import { toast } from 'sonner'

const LOREM_IPSUM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'ut',
  'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris',
  'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure',
  'dolor', 'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore',
  'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non',
  'proident', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
]

export default function LoremIpsumGenerator() {
  const [type, setType] = useState('paragraphs') // 'paragraphs', 'sentences', 'words'
  const [count, setCount] = useState(5)
  const [startWithLorem, setStartWithLorem] = useState(true)
  const [htmlWrapper, setHtmlWrapper] = useState('none') // 'none', 'p', 'li'
  const [copied, setCopied] = useState(false)

  // Generate paragraphs and words
  const generatedText = useMemo(() => {
    let result = []
    const limit = Math.max(1, Math.min(250, count))

    if (type === 'words') {
      const words = []
      for (let w = 0; w < limit; w++) {
        const wordIdx = (w * 17) % LOREM_IPSUM_WORDS.length
        words.push(LOREM_IPSUM_WORDS[wordIdx])
      }
      if (startWithLorem && words.length > 4) {
        words[0] = 'Lorem'
        words[1] = 'ipsum'
        words[2] = 'dolor'
        words[3] = 'sit'
        words[4] = 'amet,'
      }
      const rawText = words.join(' ')
      if (htmlWrapper === 'p') return `<p>${rawText}</p>`
      if (htmlWrapper === 'li') return `<li>${rawText}</li>`
      return rawText
    }

    if (type === 'sentences') {
      for (let s = 0; s < limit; s++) {
        const sentenceWords = []
        // Deterministic word count per sentence between 8 and 15
        const wCount = ((s * 7) % 8) + 8
        for (let w = 0; w < wCount; w++) {
          const wordIdx = (s * 31 + w * 17) % LOREM_IPSUM_WORDS.length
          sentenceWords.push(LOREM_IPSUM_WORDS[wordIdx])
        }
        const cap = sentenceWords[0].charAt(0).toUpperCase() + sentenceWords[0].slice(1)
        let sentence = [cap, ...sentenceWords.slice(1)].join(' ') + '.'
        if (s === 0 && startWithLorem) {
          sentence = 'Lorem ipsum dolor sit amet, ' + sentence.charAt(0).toLowerCase() + sentence.slice(1)
        }
        result.push(sentence)
      }
      const rawText = result.join(' ')
      if (htmlWrapper === 'p') return `<p>${rawText}</p>`
      if (htmlWrapper === 'li') return `<li>${rawText}</li>`
      return rawText
    }

    // Paragraphs
    for (let p = 0; p < limit; p++) {
      const sentenceList = []
      // Deterministic sentences per paragraph between 4 and 6
      const sCount = ((p * 3) % 3) + 4
      for (let s = 0; s < sCount; s++) {
        const sentenceWords = []
        // Deterministic word count per sentence between 8 and 15
        const wCount = ((p * 13 + s * 7) % 8) + 8
        for (let w = 0; w < wCount; w++) {
          const wordIdx = (p * 79 + s * 31 + w * 17) % LOREM_IPSUM_WORDS.length
          sentenceWords.push(LOREM_IPSUM_WORDS[wordIdx])
        }
        const cap = sentenceWords[0].charAt(0).toUpperCase() + sentenceWords[0].slice(1)
        sentenceList.push([cap, ...sentenceWords.slice(1)].join(' ') + '.')
      }
      let paragraph = sentenceList.join(' ')
      if (p === 0 && startWithLorem) {
        paragraph = 'Lorem ipsum dolor sit amet, ' + paragraph.charAt(0).toLowerCase() + paragraph.slice(1)
      }
      result.push(paragraph)
    }

    if (htmlWrapper === 'p') {
      return result.map((p) => `<p>${p}</p>`).join('\n\n')
    }
    if (htmlWrapper === 'li') {
      return result.map((p) => `<li>${p}</li>`).join('\n')
    }
    return result.join('\n\n')
  }, [type, count, startWithLorem, htmlWrapper])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generatedText)
    setCopied(true)
    toast.success('Lorem Ipsum copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }, [generatedText])

  const downloadText = useCallback(() => {
    const element = document.createElement('a')
    const ext = htmlWrapper !== 'none' ? 'html' : 'txt'
    const mime = htmlWrapper !== 'none' ? 'text/html' : 'text/plain'
    const file = new Blob([generatedText], { type: `${mime};charset=utf-8` })
    element.href = URL.createObjectURL(file)
    element.download = `lorem-ipsum.${ext}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success(`lorem-ipsum.${ext} downloaded!`)
  }, [generatedText, htmlWrapper])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Sliders className="w-4.5 h-4.5 text-primary" />
            Generator Options
          </h2>

          <div className="space-y-4">
            {/* Type selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Generate by</label>
              <div className="grid grid-cols-3 gap-2">
                {['paragraphs', 'sentences', 'words'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`py-2 text-xs font-semibold rounded-lg capitalize border border-border/40 transition-all ${
                      type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Count Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Amount (1 - 250)</label>
              <input
                type="number"
                min={1}
                max={250}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
              />
            </div>

            {/* Wrapper HTML selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">HTML Wrappers</label>
              <select
                value={htmlWrapper}
                onChange={(e) => setHtmlWrapper(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
              >
                <option value="none">Plain Text (No markup)</option>
                <option value="p">Paragraph tags (&lt;p&gt;)</option>
                <option value="li">List tags (&lt;li&gt;)</option>
              </select>
            </div>

            {/* Options flags */}
            <div className="bg-muted/10 border border-border/40 rounded-xl p-3.5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={startWithLorem}
                  onChange={(e) => setStartWithLorem(e.target.checked)}
                  className="rounded border-border/80 accent-primary w-4 h-4 cursor-pointer"
                />
                Start with &quot;Lorem ipsum&quot;
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Generated text preview panel */}
      <div className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCode2 className="w-4.5 h-4.5 text-primary" />
                Placeholder Text Output
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={downloadText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-y-auto text-left text-muted-foreground leading-relaxed min-h-[300px] max-h-[500px] whitespace-pre-wrap select-all">
              <code>{generatedText}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
