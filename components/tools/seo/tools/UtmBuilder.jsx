'use client';
import React, { useState, useMemo } from 'react'
import { Link2, Copy, Check, ExternalLink, HelpCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const PRESETS = [
  { name: 'Google CPC', source: 'google', medium: 'cpc', campaign: 'google_ads' },
  { name: 'Newsletter', source: 'newsletter', medium: 'email', campaign: 'monthly_newsletter' },
  { name: 'Facebook Ad', source: 'facebook', medium: 'paid_social', campaign: 'fb_campaign' },
  { name: 'Twitter/X Post', source: 'twitter', medium: 'social', campaign: 'organic_tweet' },
  { name: 'LinkedIn Share', source: 'linkedin', medium: 'social', campaign: 'organic_share' }
]

export default function UtmBuilder() {
  const [url, setUrl] = useState('https://example.com/product')
  const [source, setSource] = useState('google')
  const [medium, setMedium] = useState('cpc')
  const [campaign, setCampaign] = useState('summer_sale')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const applyPreset = (preset) => {
    setSource(preset.source)
    setMedium(preset.medium)
    setCampaign(preset.campaign)
    toast.success(`Preset "${preset.name}" applied!`)
  }

  const utmUrl = useMemo(() => {
    let cleanUrl = url.trim()
    if (!cleanUrl) return ''

    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl
    }

    try {
      const parsedUrl = new URL(cleanUrl)
      const params = new URLSearchParams(parsedUrl.search)

      if (source) params.set('utm_source', source.trim())
      if (medium) params.set('utm_medium', medium.trim())
      if (campaign) params.set('utm_campaign', campaign.trim())
      if (term) params.set('utm_term', term.trim())
      if (content) params.set('utm_content', content.trim())

      parsedUrl.search = params.toString()
      return parsedUrl.toString()
    } catch {
      // Fallback manual construct if url is invalid URL
      const separator = cleanUrl.includes('?') ? '&' : '?'
      const list = []
      if (source) list.push(`utm_source=${encodeURIComponent(source.trim())}`)
      if (medium) list.push(`utm_medium=${encodeURIComponent(medium.trim())}`)
      if (campaign) list.push(`utm_campaign=${encodeURIComponent(campaign.trim())}`)
      if (term) list.push(`utm_term=${encodeURIComponent(term.trim())}`)
      if (content) list.push(`utm_content=${encodeURIComponent(content.trim())}`)

      return cleanUrl + (list.length > 0 ? separator + list.join('&') : '')
    }
  }, [url, source, medium, campaign, term, content])

  const copyToClipboard = () => {
    if (!utmUrl) return
    navigator.clipboard.writeText(utmUrl)
    setCopied(true)
    toast.success('UTM Campaign Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setUrl('https://example.com/product')
    setSource('')
    setMedium('')
    setCampaign('')
    setTerm('')
    setContent('')
    toast.success('Form reset')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Editor Column */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Link2 className="w-4.5 h-4.5 text-primary" />
              UTM Builder Settings
            </h2>
            <button
              onClick={resetForm}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Quick Presets</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/30 transition-all text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-border/40 pt-4">
            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Website URL (Required)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. https://mywebsite.com/landing"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">Campaign Source</label>
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 p-2 bg-popover border border-border text-[10px] text-popover-foreground rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                      Identify the referrer (e.g. google, newsletter, facebook).
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="e.g. google"
                />
              </div>

              {/* Medium */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-semibold text-muted-foreground">Campaign Medium</label>
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 p-2 bg-popover border border-border text-[10px] text-popover-foreground rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                      Marketing medium (e.g. cpc, email, social).
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="e.g. cpc"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-muted-foreground">Campaign Name</label>
                <div className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 p-2 bg-popover border border-border text-[10px] text-popover-foreground rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                    Product promo code or name (e.g. spring_sale).
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. spring_sale"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Term */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Campaign Term (Optional)</label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="e.g. running+shoes"
                />
              </div>
              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Campaign Content (Optional)</label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="e.g. logolink_header"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output & QR Column */}
      <div className="lg:col-span-5 space-y-6">
        {/* Output Link */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 text-left">
          <h3 className="text-sm font-semibold text-foreground">Campaign Destination URL</h3>
          <div className="p-3 bg-muted/20 border border-border/40 rounded-xl min-h-[50px] break-all text-xs text-muted-foreground leading-relaxed">
            {utmUrl || 'Please enter a website URL...'}
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              disabled={!utmUrl}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Campaign Link'}
            </button>
            {utmUrl && (
              <a
                href={utmUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-all text-xs font-semibold text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
                Test Link
              </a>
            )}
          </div>
        </div>

        {/* QR Code Card */}
        {utmUrl && (
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 text-center">
            <h3 className="text-sm font-semibold text-foreground text-left">Shareable QR Code</h3>
            <div className="mx-auto w-36 h-36 bg-white rounded-xl border border-border/50 p-2 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(utmUrl)}`}
                alt="QR Code"
                loading="lazy"
                className="w-[130px] h-[130px] object-contain"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Scan this QR code with any smartphone camera to open your campaign tracking link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
