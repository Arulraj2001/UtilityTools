'use client';
import React, { useState, useMemo } from 'react'
import { Code, Copy, Check, Download, Plus, Trash2, Info, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export default function SchemaGenerator() {
  const [schemaType, setSchemaType] = useState('Article')
  const [copied, setCopied] = useState(false)

  // Article States
  const [artTitle, setArtTitle] = useState('Catchy Article Headline')
  const [artAuthor, setArtAuthor] = useState('Jane Doe')
  const [artPublisher, setArtPublisher] = useState('Tech News Hub')
  const [artPubLogo, setArtPubLogo] = useState('https://example.com/logo.png')
  const [artDate, setArtDate] = useState('2026-06-21')
  const [artImage, setArtImage] = useState('https://example.com/cover.jpg')

  // Product States
  const [prodName, setProdName] = useState('Modern Desk Lamp')
  const [prodDesc, setProdDesc] = useState('Premium LED desk lamp with adjustable brightness and warm lighting settings.')
  const [prodImage, setProdImage] = useState('https://example.com/lamp.jpg')
  const [prodBrand, setProdBrand] = useState('Lumina')
  const [prodSku, setProdSku] = useState('LUM-1029')
  const [prodPrice, setProdPrice] = useState('49.99')
  const [prodCurrency, setProdCurrency] = useState('USD')
  const [prodAvail, setProdAvail] = useState('https://schema.org/InStock')

  // FAQ States
  const [faqs, setFaqs] = useState([
    { question: 'Is shipping free?', answer: 'Yes, we offer free shipping worldwide on all orders above $50.' },
    { question: 'What is the return policy?', answer: 'You can return any product within 30 days of purchase for a full refund.' }
  ])

  // LocalBusiness States
  const [busName, setBusName] = useState('Corner Cafe')
  const [busDesc, setBusDesc] = useState('Cozy neighborhood cafe serving organic coffee and fresh house baked pastries.')
  const [busImage, setBusImage] = useState('https://example.com/cafe.jpg')
  const [busPhone, setBusPhone] = useState('+1-555-0199')
  const [busUrl, setBusUrl] = useState('https://cornercafe.com')
  const [busStreet, setBusStreet] = useState('123 Espresso Blvd')
  const [busCity, setBusCity] = useState('Seattle')
  const [busRegion, setBusRegion] = useState('WA')
  const [busZip, setBusZip] = useState('98101')
  const [busCountry, setBusCountry] = useState('US')

  // JSON LD Construction
  const jsonLdData = useMemo(() => {
    const base = {
      '@context': 'https://schema.org',
    }

    if (schemaType === 'Article') {
      return {
        ...base,
        '@type': 'NewsArticle',
        headline: artTitle,
        image: artImage ? [artImage] : [],
        datePublished: artDate ? `${artDate}T08:00:00+00:00` : '',
        dateModified: artDate ? `${artDate}T09:30:00+00:00` : '',
        author: {
          '@type': 'Person',
          name: artAuthor
        },
        publisher: {
          '@type': 'Organization',
          name: artPublisher,
          logo: {
            '@type': 'ImageObject',
            url: artPubLogo
          }
        }
      }
    }

    if (schemaType === 'Product') {
      return {
        ...base,
        '@type': 'Product',
        name: prodName,
        image: prodImage ? [prodImage] : [],
        description: prodDesc,
        sku: prodSku,
        brand: {
          '@type': 'Brand',
          name: prodBrand
        },
        offers: {
          '@type': 'Offer',
          url: '',
          priceCurrency: prodCurrency,
          price: prodPrice,
          availability: prodAvail,
          priceValidUntil: '2027-12-31'
        }
      }
    }

    if (schemaType === 'FAQPage') {
      return {
        ...base,
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer
          }
        }))
      }
    }

    if (schemaType === 'LocalBusiness') {
      return {
        ...base,
        '@type': 'Cafe', // default subtype
        name: busName,
        image: busImage ? [busImage] : [],
        '@id': `${busUrl}/#cafe`,
        url: busUrl,
        telephone: busPhone,
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: busStreet,
          addressLocality: busCity,
          addressRegion: busRegion,
          postalCode: busZip,
          addressCountry: busCountry
        },
        description: busDesc
      }
    }

    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schemaType,
    artTitle, artAuthor, artPublisher, artPubLogo, artDate, artImage,
    prodName, prodDesc, prodImage, prodBrand, prodSku, prodPrice, prodCurrency, prodAvail,
    faqs,
    busName, busDesc, busImage, busPhone, busUrl, busStreet, busCity, busRegion, busZip, busCountry
  ])

  const schemaCode = useMemo(() => {
    return `<script type="application/ld+json">\n${JSON.stringify(jsonLdData, null, 2)}\n</script>`
  }, [jsonLdData])

  // FAQ handlers
  const handleFaqChange = (index, field, val) => {
    setFaqs(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  const addFaq = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }])
  }

  const deleteFaq = (index) => {
    setFaqs(prev => prev.filter((_, i) => i !== index))
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(schemaCode)
    setCopied(true)
    toast.success('JSON-LD script copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const element = document.createElement('a')
    const file = new Blob([schemaCode], { type: 'text/html;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = 'schema.json'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Schema markup script downloaded!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Settings Form */}
      <div className="lg:col-span-6 space-y-5">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Code className="w-4.5 h-4.5 text-primary" />
              Structured Data Builder
            </h2>
            <select
              value={schemaType}
              onChange={(e) => setSchemaType(e.target.value)}
              className="px-2 py-1.5 bg-muted border border-border/50 rounded-lg outline-none text-xs font-semibold focus:border-primary/50"
            >
              <option value="Article">Article (News/Blog)</option>
              <option value="Product">Product Offerings</option>
              <option value="FAQPage">FAQ Page</option>
              <option value="LocalBusiness">Local Business Details</option>
            </select>
          </div>

          <div className="space-y-4">
            {schemaType === 'Article' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Article Headline</label>
                  <input type="text" value={artTitle} onChange={e => setArtTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Author Name</label>
                  <input type="text" value={artAuthor} onChange={e => setArtAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Publisher Organization</label>
                  <input type="text" value={artPublisher} onChange={e => setArtPublisher(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Date Published</label>
                    <input type="date" value={artDate} onChange={e => setArtDate(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Publisher Logo URL</label>
                    <input type="url" value={artPubLogo} onChange={e => setArtPubLogo(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Featured Cover Image URL</label>
                  <input type="url" value={artImage} onChange={e => setArtImage(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                </div>
              </div>
            )}

            {schemaType === 'Product' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Product Name</label>
                    <input type="text" value={prodName} onChange={e => setProdName(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Brand Name</label>
                    <input type="text" value={prodBrand} onChange={e => setProdBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Product Description</label>
                  <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Price</label>
                    <input type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                    <select value={prodCurrency} onChange={e => setProdCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Availability</label>
                    <select value={prodAvail} onChange={e => setProdAvail(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50">
                      <option value="https://schema.org/InStock">In Stock</option>
                      <option value="https://schema.org/OutOfStock">Out of Stock</option>
                      <option value="https://schema.org/PreOrder">Pre Order</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">SKU Number</label>
                    <input type="text" value={prodSku} onChange={e => setProdSku(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Product Image URL</label>
                    <input type="url" value={prodImage} onChange={e => setProdImage(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                </div>
              </div>
            )}

            {schemaType === 'FAQPage' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground">FAQ Question/Answer Blocks</label>
                  <button
                    onClick={addFaq}
                    className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {faqs.map((faq, index) => (
                    <div key={index} className="p-3 rounded-xl border border-border/50 bg-muted/10 space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Q&A Item #{index + 1}</span>
                        {faqs.length > 1 && (
                          <button
                            onClick={() => deleteFaq(index)}
                            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                        placeholder="Question content..."
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                        placeholder="Answer text..."
                        rows={2}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {schemaType === 'LocalBusiness' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Business Name</label>
                    <input type="text" value={busName} onChange={e => setBusName(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Website URL</label>
                    <input type="url" value={busUrl} onChange={e => setBusUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Telephone</label>
                    <input type="tel" value={busPhone} onChange={e => setBusPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Feature Image URL</label>
                    <input type="url" value={busImage} onChange={e => setBusImage(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Business Description</label>
                  <textarea value={busDesc} onChange={e => setBusDesc(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50 resize-none" />
                </div>
                {/* Address block */}
                <div className="border border-border/40 bg-muted/10 rounded-xl p-3 space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Address Coordinates</span>
                  <div className="space-y-2">
                    <input type="text" value={busStreet} onChange={e => setBusStreet(e.target.value)} placeholder="Street address"
                      className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={busCity} onChange={e => setBusCity(e.target.value)} placeholder="City"
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50" />
                      <input type="text" value={busRegion} onChange={e => setBusRegion(e.target.value)} placeholder="State/Region"
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={busZip} onChange={e => setBusZip(e.target.value)} placeholder="Postal Code"
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50" />
                      <input type="text" value={busCountry} onChange={e => setBusCountry(e.target.value)} placeholder="Country Code (e.g. US)"
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg outline-none text-xs focus:border-primary/50" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-muted-foreground text-xs leading-relaxed">
          <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
          <p>
            Structured schemas help Google identify key details and yield Rich Snippet representations (stars, pricing, FAQs) in search results.
          </p>
        </div>
      </div>

      {/* Code Block */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Generated JSON-LD Schema</h3>
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
            <code>{schemaCode}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
