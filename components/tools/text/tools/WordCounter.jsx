'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { FileText, Copy, Check, Trash2, Clock, Volume2, BookOpen, Hash } from 'lucide-react'
import { toast } from 'sonner'

export default function WordCounter() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const charCount = text.length
    const charNoSpaces = text.replace(/\s/g, '').length
    
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    const wordCount = words.length

    // Sentences count: split by sentence ending punctuation
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)
    const sentenceCount = sentences.length

    // Paragraphs count: split by double line breaks or single line breaks with content
    const paragraphs = text
      .split(/\n+/)
      .filter((p) => p.trim().length > 0)
    const paragraphCount = paragraphs.length

    // Reading time: ~225 WPM
    const readingTime = Math.ceil(wordCount / 225)
    // Speaking time: ~150 WPM
    const speakingTime = Math.ceil(wordCount / 150)

    // Keyword density logic
    const wordFreq = {}
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of',
      'in', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'
    ])

    words.forEach((w) => {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (cleanWord && !stopwords.has(cleanWord) && cleanWord.length > 1) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1
      }
    })

    const keywordDensity = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        density: wordCount > 0 ? ((count / wordCount) * 100).toFixed(1) : '0.0'
      }))

    return {
      charCount,
      charNoSpaces,
      wordCount,
      sentenceCount,
      paragraphCount,
      readingTime,
      speakingTime,
      keywordDensity
    }
  }, [text])

  const copyToClipboard = useCallback(() => {
    if (!text) {
      toast.error('No text to copy!')
      return
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Text copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  const clearText = useCallback(() => {
    setText('')
    toast.success('Cleared text area')
  }, [])

  const loadSampleText = useCallback(() => {
    setText(
      'Advanced AI tools enable developers to build robust systems quickly. ' +
      'By streamlining repetitive developer workflows, modern platforms allow teams to spend more time ' +
      'solving complex business challenges. Designing software with premium user interfaces not only ' +
      'delivers high satisfaction but also significantly increases retention rates.'
    )
    toast.success('Sample text loaded')
  }, [])

  return (
    <div className="space-y-6">
      {/* Editor & Actions */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <FileText className="w-4.5 h-4.5 text-primary" />
            Enter Text to Analyze
          </h2>
          <div className="flex gap-2">
            <button
              onClick={loadSampleText}
              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-semibold transition-all"
            >
              Load Sample Text
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
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
          rows={8}
          className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-y placeholder:text-muted-foreground/60"
          placeholder="Type or paste your text here to get real-time analysis..."
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Words</span>
          <span className="text-2xl font-bold text-foreground mt-1">{stats.wordCount}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Characters</span>
          <span className="text-2xl font-bold text-foreground mt-1">{stats.charCount}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sentences</span>
          <span className="text-2xl font-bold text-foreground mt-1">{stats.sentenceCount}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paragraphs</span>
          <span className="text-2xl font-bold text-foreground mt-1">{stats.paragraphCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Additional metrics */}
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Reading & Speaking Estimates
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Reading Time</span>
              </div>
              <span className="text-sm font-semibold text-foreground">~{stats.readingTime} min</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Speaking Time</span>
              </div>
              <span className="text-sm font-semibold text-foreground">~{stats.speakingTime} min</span>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground px-1">
              <span>Chars (no spaces): {stats.charNoSpaces}</span>
              <span>Avg word length: {stats.wordCount > 0 ? (stats.charNoSpaces / stats.wordCount).toFixed(1) : 0} chars</span>
            </div>
          </div>
        </div>

        {/* Keyword Density */}
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            Top Keywords Density
          </h3>
          <div className="space-y-3">
            {stats.keywordDensity.length > 0 ? (
              stats.keywordDensity.map(({ word, count, density }) => (
                <div key={word} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground font-mono">{word}</span>
                    <span className="text-muted-foreground">{count} occurrences ({density}%)</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(parseFloat(density) * 3, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Enter longer text to show keyword density charts. Stop words are automatically excluded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
