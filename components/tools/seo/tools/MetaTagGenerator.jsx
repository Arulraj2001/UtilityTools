'use client';
import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Globe, Copy, Check, Info, Layout, Smartphone, Laptop } from 'lucide-react'
import { toast } from 'sonner'

export default function MetaTagGenerator() {
  const [title, setTitle] = useState('My Awesome Website Title')
  const [description, setDescription] = useState('This is a description of my website. It should be concise and contain relevant keywords to attract search clicks.')
  const [canonicalUrl, setCanonicalUrl] = useState('https://example.com/page')
  const [keywords, setKeywords] = useState('seo, metadata, tags')
  const [author, setAuthor] = useState('Author Name')
  const [robots, setRobots] = useState('index,follow')
  const [previewDevice, setPreviewDevice] = useState('desktop') // desktop | mobile
  const [copied, setCopied] = useState(false)

  // Calculations
  const titleLength = title.length
  const descLength = description.length

  const titleProgress = Math.min(100, (titleLength / 60) * 100)
  const descProgress = Math.min(100, (descLength / 160) * 100)

  const isTitleOver = titleLength > 60
  const isDescOver = descLength > 160

  const metaHtml = useMemo(() => {
    let tags = `<!-- Primary Meta Tags -->\n`
    if (title) tags += `<title>${title.replace(/"/g, '&quot;')}</title>\n`
    if (title) tags += `<meta name="title" content="${title.replace(/"/g, '&quot;')}">\n`
    if (description) tags += `<meta name="description" content="${description.replace(/"/g, '&quot;')}">\n`
    if (keywords) tags += `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}">\n`
    if (author) tags += `<meta name="author" content="${author.replace(/"/g, '&quot;')}">\n`
    if (robots) tags += `<meta name="robots" content="${robots}">\n`
    if (canonicalUrl) tags += `\n<!-- Canonical URL -->\n<link rel="canonical" href="${canonicalUrl}">\n`
    return tags.trim()
  }, [title, description, keywords, author, robots, canonicalUrl])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(metaHtml)
    setCopied(true)
    toast.success('Meta tags copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Editor Column */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Layout className="w-4.5 h-4.5 text-primary" />
            Meta Tag Details
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">SEO Title</label>
                <span className={`text-[10px] font-mono ${isTitleOver ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {titleLength} / 60 chars
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="Enter page title..."
              />
              <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isTitleOver ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${titleProgress}%` }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">SEO Description</label>
                <span className={`text-[10px] font-mono ${isDescOver ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {descLength} / 160 chars
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-none"
                placeholder="Enter description..."
              />
              <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isDescOver ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${descProgress}%` }}
                />
              </div>
            </div>

            {/* Canonical URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Canonical URL</label>
              <input
                type="url"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. https://mywebsite.com/page"
              />
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. fashion, clothes, store"
              />
            </div>

            {/* Author & Robots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Robots Directive</label>
                <select
                  value={robots}
                  onChange={(e) => setRobots(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="index,follow">index, follow (Default)</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="index,nofollow">index, nofollow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Column */}
      <div className="lg:col-span-6 space-y-6">
        {/* Mockup */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Search className="w-4 h-4 text-primary" />
              Google Snippet Preview
            </h3>
            <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border/40 font-sans">
            {previewDevice === 'desktop' ? (
              // Desktop Preview
              <div className="max-w-[600px] text-left">
                <div className="flex items-center gap-1.5 text-xs text-[#202124] dark:text-[#bdc1c6] mb-1">
                  <Globe className="w-3.5 h-3.5 text-[#202124]/70 dark:text-muted-foreground" />
                  <span className="truncate">{canonicalUrl || 'https://example.com'}</span>
                </div>
                <h4 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium leading-tight truncate mb-1">
                  {title || 'Please enter a title'}
                </h4>
                <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-2">
                  {description || 'Please enter a description to view snippet representation.'}
                </p>
              </div>
            ) : (
              // Mobile Preview
              <div className="max-w-[360px] text-left">
                <div className="flex items-center gap-2 text-xs text-[#202124] dark:text-[#bdc1c6] mb-1">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Globe className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold truncate leading-none">Example Site</span>
                    <span className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">{canonicalUrl || 'https://example.com'}</span>
                  </div>
                </div>
                <h4 className="text-base text-[#15c] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug font-medium line-clamp-2 mb-1">
                  {title || 'Please enter a title'}
                </h4>
                <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-3">
                  {description || 'Please enter a description to view snippet representation.'}
                </p>
              </div>
            )}
          </div>

          {(isTitleOver || isDescOver) && (
            <div className="flex gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Length Warnings Detected</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  {isTitleOver && <li>Your title exceeds 60 characters and may get cut off on search engines.</li>}
                  {isDescOver && <li>Your description exceeds 160 characters and may get truncated.</li>}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Code Block */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Generated HTML Code</h3>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy HTML'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed max-h-[220px]">
            <code>{metaHtml}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
