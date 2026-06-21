'use client';
import React, { useState, useMemo } from 'react'
import { BarChart2, CheckCircle2, Info, EyeOff } from 'lucide-react'

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

export default function WordDensityChecker() {
  const [text, setText] = useState('Creating high-quality content is vital for SEO success. Search engine crawlers scan your pages to identify key terms. Writing structured paragraphs, adding relevant headers, and focusing on readability will make your content stand out. Ensure you cover related topics comprehensively so that search engines perceive your page as authoritative. High relevance and reader value are the ultimate SEO goals.')
  const [minWordLength, setMinWordLength] = useState('4')
  const [excludeStopWords, setExcludeStopWords] = useState(true)

  const analytics = useMemo(() => {
    if (!text.trim()) {
      return { totalWords: 0, uniqueWords: 0, diversity: '0.0', list: [] }
    }

    const normalizedText = text
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[“”‘’]/g, "'")
      .replace(/[^\w\s']/g, ' ')

    const rawWords = normalizedText.split(/\s+/).filter(w => w.length > 0)
    const totalWords = rawWords.length

    const wordCounts = {}
    let uniqueCount = 0

    rawWords.forEach((word) => {
      // Check filters
      if (word.length < Number(minWordLength)) return
      if (excludeStopWords && STOP_WORDS.has(word)) return

      if (!wordCounts[word]) {
        wordCounts[word] = 0
        uniqueCount++
      }
      wordCounts[word]++
    })

    const totalFilteredWords = Object.values(wordCounts).reduce((a, b) => a + b, 0) || 1

    const list = Object.entries(wordCounts)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / totalWords) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    const uniqueWords = new Set(rawWords).size
    const diversity = totalWords > 0 ? ((uniqueWords / totalWords) * 100).toFixed(1) : '0.0'

    return { totalWords, uniqueWords, diversity, list, totalFilteredWords }
  }, [text, minWordLength, excludeStopWords])

  const maxCount = analytics.list[0]?.count || 1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Configuration & Inputs */}
      <div className="lg:col-span-6 space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <BarChart2 className="w-4.5 h-4.5 text-primary" />
            Term Frequency Config
          </h2>

          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Min Word Length</label>
                <select
                  value={minWordLength}
                  onChange={(e) => setMinWordLength(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="2">2+ letters</option>
                  <option value="3">3+ letters</option>
                  <option value="4">4+ letters (Default)</option>
                  <option value="5">5+ letters</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Stop Words (and, the, a...)</label>
                <select
                  value={excludeStopWords ? 'yes' : 'no'}
                  onChange={(e) => setExcludeStopWords(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="yes">Exclude Stop Words (Recommended)</option>
                  <option value="no">Include Stop Words</option>
                </select>
              </div>
            </div>

            {/* Input content */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Content Document</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-xs leading-relaxed transition-all focus:border-primary/50 resize-y min-h-[200px]"
                placeholder="Paste your content here..."
              />
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Lexical Analysis Summary</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl text-center">
              <span className="text-xl font-bold text-foreground font-mono">{analytics.totalWords}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Total Words</span>
            </div>
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl text-center">
              <span className="text-xl font-bold text-foreground font-mono">{analytics.uniqueWords}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Unique Words</span>
            </div>
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl text-center">
              <span className="text-xl font-bold text-foreground font-mono">{analytics.diversity}%</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Lexical Richness</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Report */}
      <div className="lg:col-span-6 space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 text-left">
          <h3 className="text-sm font-semibold text-foreground">Top Words Frequency</h3>

          {analytics.list.length > 0 ? (
            <div className="space-y-4">
              {analytics.list.map((item, idx) => {
                const widthPercent = Math.max(8, (item.count / maxCount) * 100)
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="font-mono text-foreground font-medium">{item.word}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">{item.count} times ({item.density}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted/30 border border-border/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <EyeOff className="w-8 h-8 opacity-40" />
              <p className="text-xs">No matching words found. Try reducing the minimum word length or adding more text.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
