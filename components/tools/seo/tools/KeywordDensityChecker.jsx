'use client';
import React, { useState, useMemo } from 'react'
import { Scale, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is',
  'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
  'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt',
  'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which',
  'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
  'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
])

export default function KeywordDensityChecker() {
  const [text, setText] = useState('Search engine optimization (SEO) is the process of improving the quality and quantity of website traffic. SEO targets unpaid traffic rather than direct traffic or paid traffic. Effective SEO strategies focus on keyword placement, content value, and technical site performance to increase search rankings. Applying solid SEO methods helps search engines index and rank your pages appropriately.')
  const [keyword, setKeyword] = useState('SEO')

  // Word & Keyword density calculations
  const stats = useMemo(() => {
    if (!text.trim()) {
      return { wordsCount: 0, charsCount: 0, keywordCount: 0, density: 0, topWords: [] }
    }

    const cleanText = text
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[“”‘’]/g, "'")
      .replace(/[^\w\s']/g, ' ')

    const words = cleanText.split(/\s+/).filter((w) => w.length > 0)
    const wordsCount = words.length
    const charsCount = text.length

    // Keyword Match (can be multi-word keywords)
    let keywordCount = 0
    const cleanKw = keyword.toLowerCase().trim()
    if (cleanKw) {
      const escapedKw = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
      const regex = new RegExp(`\\b${escapedKw}\\b`, 'g')
      const matches = cleanText.match(regex)
      keywordCount = matches ? matches.length : 0
    }

    const density = wordsCount > 0 ? (keywordCount / wordsCount) * 100 : 0

    // Top words list (filter out stop words)
    const wordFreq = {}
    words.forEach((w) => {
      if (w.length > 2 && !STOP_WORDS.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1
      }
    })

    const topWords = Object.entries(wordFreq)
      .map(([word, count]) => ({
        word,
        count,
        percent: ((count / wordsCount) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return { wordsCount, charsCount, keywordCount, density, topWords }
  }, [text, keyword])

  const densityScore = stats.density
  const statusDetails = useMemo(() => {
    if (densityScore === 0) {
      return { label: 'Not Found', color: 'text-muted-foreground border-border bg-muted/10', icon: AlertCircle, text: 'The target keyword was not found in the article text.' }
    }
    if (densityScore < 1.0) {
      return { label: 'Under-optimized', color: 'text-sky-500 border-sky-500/20 bg-sky-500/5', icon: Info, text: 'Keyword density is below 1%. Try introducing your keyword naturally in key paragraphs.' }
    }
    if (densityScore <= 3.0) {
      return { label: 'Optimal Density', color: 'text-green-500 border-green-500/20 bg-green-500/5', icon: Check, text: 'Excellent! Keyword density is within the optimal 1% - 3% range for safe, solid rankings.' }
    }
    return { label: 'Over-optimized (Stuffing)', color: 'text-amber-500 border-amber-500/20 bg-amber-500/5', icon: AlertTriangle, text: 'Warning: Keyword stuffing detected (exceeds 3%). Reduce keyword repetition to avoid search crawler penalties.' }
  }, [densityScore])

  const StatusIcon = statusDetails.icon

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Input Form Column */}
      <div className="lg:col-span-7 space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Scale className="w-4.5 h-4.5 text-primary" />
            Article Content Analyzer
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Target Focus Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. SEO"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Article Draft</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-xs leading-relaxed transition-all focus:border-primary/50 resize-y min-h-[220px]"
                placeholder="Paste or write your content here..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Column */}
      <div className="lg:col-span-5 space-y-5">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-border/60 bg-card text-center">
            <span className="text-2xl font-bold text-foreground font-mono">{stats.wordsCount}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Total Words</span>
          </div>
          <div className="p-4 rounded-xl border border-border/60 bg-card text-center">
            <span className="text-2xl font-bold text-foreground font-mono">{stats.keywordCount}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Keyword Matches</span>
          </div>
        </div>

        {/* Status card */}
        <div className={`p-4 rounded-2xl border ${statusDetails.color} space-y-3`}>
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5 shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider leading-none">Status</span>
              <h4 className="font-bold text-sm mt-0.5">{statusDetails.label} ({densityScore.toFixed(2)}%)</h4>
            </div>
          </div>
          <p className="text-xs leading-relaxed opacity-90">{statusDetails.text}</p>

          {/* Visual Bar */}
          <div className="space-y-1 pt-1.5">
            <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
              <span>0%</span>
              <span>1% (Optimal Min)</span>
              <span>3% (Optimal Max)</span>
              <span>5%+</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, (densityScore / 4.5) * 100)}%` }}
              />
              {/* Optimal zone overlay indicator */}
              <div className="absolute top-0 bottom-0 left-[22.2%] right-[33.3%] border-x border-dashed border-muted-foreground/30 bg-green-500/10 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Top Words Table */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Top Supporting Terms</h3>
          {stats.topWords.length > 0 ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-12 text-muted-foreground font-semibold pb-1.5 border-b border-border/40 text-left">
                <span className="col-span-6">Term</span>
                <span className="col-span-3 text-center">Matches</span>
                <span className="col-span-3 text-right">Density</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[190px] overflow-y-auto pr-1">
                {stats.topWords.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-2 text-muted-foreground font-medium hover:text-foreground">
                    <span className="col-span-6 truncate font-mono text-foreground">{item.word}</span>
                    <span className="col-span-3 text-center font-mono">{item.count}</span>
                    <span className="col-span-3 text-right font-mono font-bold text-foreground">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Paste text to extract term frequencies.</p>
          )}
        </div>
      </div>
    </div>
  )
}
