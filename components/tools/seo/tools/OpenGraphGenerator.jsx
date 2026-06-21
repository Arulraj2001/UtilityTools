'use client';
import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Share2, Copy, Check, Facebook, Twitter, Image as ImageIcon, Link2 } from 'lucide-react'
import { toast } from 'sonner'

export default function OpenGraphGenerator() {
  const [title, setTitle] = useState('Explore Our Services and Products')
  const [description, setDescription] = useState('We build premium utilities and applications designed to accelerate workflows. Join thousands of users worldwide.')
  const [url, setUrl] = useState('https://quickutils.com')
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80')
  const [siteName, setSiteName] = useState('QuickUtils')
  const [type, setType] = useState('website')
  const [locale, setLocale] = useState('en_US')
  const [twitterCard, setTwitterCard] = useState('summary_large_image')
  const [previewPlatform, setPreviewPlatform] = useState('facebook') // facebook | twitter
  const [copied, setCopied] = useState(false)

  const ogHtml = useMemo(() => {
    let tags = `<!-- Open Graph / Facebook -->\n`
    tags += `<meta property="og:type" content="${type}">\n`
    if (url) tags += `<meta property="og:url" content="${url}">\n`
    if (title) tags += `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">\n`
    if (description) tags += `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}">\n`
    if (imageUrl) tags += `<meta property="og:image" content="${imageUrl}">\n`
    if (siteName) tags += `<meta property="og:site_name" content="${siteName.replace(/"/g, '&quot;')}">\n`
    if (locale) tags += `<meta property="og:locale" content="${locale}">\n\n`

    tags += `<!-- Twitter -->\n`
    tags += `<meta name="twitter:card" content="${twitterCard}">\n`
    if (url) tags += `<meta name="twitter:url" content="${url}">\n`
    if (title) tags += `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">\n`
    if (description) tags += `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">\n`
    if (imageUrl) tags += `<meta name="twitter:image" content="${imageUrl}">\n`

    return tags.trim()
  }, [title, description, url, imageUrl, siteName, type, locale, twitterCard])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ogHtml)
    setCopied(true)
    toast.success('Open Graph tags copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return 'example.com'
    }
  }, [url])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Column */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Share2 className="w-4.5 h-4.5 text-primary" />
            Social Media Meta Data
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="Enter sharing title..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-none"
                placeholder="Enter sharing description..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Share URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. https://mywebsite.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Image Preview URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                placeholder="e.g. https://mywebsite.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Site Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="My Site Name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="website">website</option>
                  <option value="article">article</option>
                  <option value="book">book</option>
                  <option value="profile">profile</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Locale</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="es_ES">Spanish (Spain)</option>
                  <option value="fr_FR">French (France)</option>
                  <option value="de_DE">German</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Twitter Card type</label>
                <select
                  value={twitterCard}
                  onChange={(e) => setTwitterCard(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="summary_large_image">Summary Large Image</option>
                  <option value="summary">Summary Card (Small Image)</option>
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
            <h3 className="text-sm font-semibold text-foreground">Interactive Card Mockup</h3>
            <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <button
                onClick={() => setPreviewPlatform('facebook')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${previewPlatform === 'facebook' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Facebook className="w-3.5 h-3.5 text-blue-500 fill-current" />
                Facebook
              </button>
              <button
                onClick={() => setPreviewPlatform('twitter')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${previewPlatform === 'twitter' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400 fill-current" />
                Twitter/X
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border/40 font-sans">
            {previewPlatform === 'facebook' ? (
              // Facebook Feed Mockup
              <div className="border border-border/50 bg-card rounded-xl overflow-hidden text-left max-w-[500px] mx-auto text-sm">
                <div className="p-3 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    {siteName ? siteName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground leading-none">{siteName || 'Site Name'}</h5>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">Sponsored • 🌐</span>
                  </div>
                </div>

                <p className="px-3 pb-3 text-xs text-muted-foreground">Check this out!</p>

                {/* FB Card */}
                <div className="border-t border-border/40 hover:bg-muted/10 cursor-pointer">
                  {imageUrl ? (
                    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
                      <img src={imageUrl} alt="Open Graph Card Image" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[1.91/1] w-full bg-muted flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-xs">No image provided</span>
                    </div>
                  )}

                  <div className="p-3 bg-muted/20 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{hostname}</span>
                    <h4 className="font-bold text-foreground line-clamp-1 mt-0.5">{title || 'Page Title'}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{description || 'Page description will appear here when configured.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Twitter Card Mockup
              <div className="border border-border/50 bg-card rounded-2xl overflow-hidden text-left max-w-[480px] mx-auto text-sm cursor-pointer hover:bg-muted/10">
                {twitterCard === 'summary_large_image' ? (
                  // Large Image Card
                  <div>
                    {imageUrl ? (
                      <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
                        <img src={imageUrl} alt="Twitter Card Large Image" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[1.91/1] w-full bg-muted flex flex-col items-center justify-center text-muted-foreground gap-1">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-xs">No image provided</span>
                      </div>
                    )}
                    <div className="p-3 border-t border-border/40">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Link2 className="w-3 h-3" />
                        <span>{hostname}</span>
                      </div>
                      <h4 className="font-semibold text-foreground line-clamp-1 mt-0.5">{title || 'Page Title'}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{description || 'Page description goes here.'}</p>
                    </div>
                  </div>
                ) : (
                  // Small Image Summary Card
                  <div className="flex items-center p-3 gap-3">
                    {imageUrl ? (
                      <img src={imageUrl} alt="preview" className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <ImageIcon className="w-5 h-5 opacity-40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-muted-foreground">{hostname}</span>
                      <h4 className="font-semibold text-foreground truncate mt-0.5">{title || 'Page Title'}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{description || 'Page description.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Output tags */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Generated Open Graph Code</h3>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy HTML'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed max-h-[220px]">
            <code>{ogHtml}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
