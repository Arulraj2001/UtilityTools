'use client';
import React, { useState, useMemo } from 'react'
import { FileCode, Copy, Check, Download, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function SitemapGenerator() {
  const [baseUrl, setBaseUrl] = useState('https://example.com')
  const [paths, setPaths] = useState('/\n/about\n/services\n/contact\n/blog')
  const [changefreq, setChangefreq] = useState('weekly')
  const [priority, setPriority] = useState('0.8')
  const [copied, setCopied] = useState(false)

  // Calculations
  const urlList = useMemo(() => {
    return paths
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  }, [paths])

  const sitemapXml = useMemo(() => {
    let cleanBase = baseUrl.trim()
    if (cleanBase && !cleanBase.startsWith('http')) {
      cleanBase = 'https://' + cleanBase
    }
    if (cleanBase.endsWith('/')) {
      cleanBase = cleanBase.slice(0, -1)
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    urlList.forEach((path) => {
      let cleanPath = path
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath
      }
      const fullUrl = cleanBase + cleanPath
      xml += '  <url>\n'
      xml += `    <loc>${fullUrl}</loc>\n`
      xml += `    <changefreq>${changefreq}</changefreq>\n`
      xml += `    <priority>${priority}</priority>\n`
      xml += '  </url>\n'
    })

    xml += '</urlset>'
    return xml
  }, [baseUrl, urlList, changefreq, priority])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sitemapXml)
    setCopied(true)
    toast.success('XML Sitemap copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const element = document.createElement('a')
    const file = new Blob([sitemapXml], { type: 'application/xml;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = 'sitemap.xml'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('sitemap.xml downloaded!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Inputs Column */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <FileCode className="w-4.5 h-4.5 text-primary" />
            Configure XML Sitemap
          </h2>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Website Base URL</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. https://mywebsite.com"
              />
            </div>

            {/* List of paths */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">URL Paths (One per line)</label>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {urlList.length} pages
                </span>
              </div>
              <textarea
                value={paths}
                onChange={(e) => setPaths(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-xs font-mono transition-all focus:border-primary/50 resize-y"
                placeholder="e.g.&#10;/&#10;/about&#10;/contact"
              />
            </div>

            {/* Freq and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Change Frequency</label>
                <select
                  value={changefreq}
                  onChange={(e) => setChangefreq(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="always">always</option>
                  <option value="hourly">hourly</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly (Recommended)</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                  <option value="never">never</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Priority (0.0 to 1.0)</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="1.0">1.0 (Homepage)</option>
                  <option value="0.9">0.9</option>
                  <option value="0.8">0.8 (Main subpages)</option>
                  <option value="0.7">0.7</option>
                  <option value="0.6">0.6</option>
                  <option value="0.5">0.5 (Default/Articles)</option>
                  <option value="0.4">0.4</option>
                  <option value="0.3">0.3</option>
                  <option value="0.2">0.2</option>
                  <option value="0.1">0.1</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground text-xs leading-relaxed">
          <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
          <p>
            XML sitemaps provide crawler roadmaps for search bots. Once generated, download the `sitemap.xml` file, host it on your site root, and submit it to Google Search Console or Bing Webmaster Tools.
          </p>
        </div>
      </div>

      {/* Preview Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Generated XML Code</h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[300px] max-h-[500px]">
            <code>{sitemapXml}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
