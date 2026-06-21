'use client';
import React, { useState, useMemo } from 'react'
import { Code2, Copy, Check, Download, Minimize2, Info } from 'lucide-react'
import { toast } from 'sonner'

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Common Wrapper for Minifiers
function MinifierBase({ title, label, placeholder, defaultValue, minifyFn, fileExtension, mimeType }) {
  const [code, setCode] = useState(defaultValue)
  const [copied, setCopied] = useState(false)

  const minifiedData = useMemo(() => {
    if (!code.trim()) {
      return { minified: '', originalSize: 0, minifiedSize: 0, savings: 0, percent: 0 }
    }

    try {
      const minified = minifyFn(code)
      // Calculate sizes using Blob for exact byte length
      const originalSize = new Blob([code]).size
      const minifiedSize = new Blob([minified]).size
      const savings = Math.max(0, originalSize - minifiedSize)
      const percent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0

      return { minified, originalSize, minifiedSize, savings, percent }
    } catch (err) {
      console.error(err)
      return { error: 'Minification failed: ' + err.message, minified: '', originalSize: 0, minifiedSize: 0, savings: 0, percent: 0 }
    }
  }, [code, minifyFn])

  const copyToClipboard = () => {
    if (!minifiedData.minified) return
    navigator.clipboard.writeText(minifiedData.minified)
    setCopied(true)
    toast.success('Minified code copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    if (!minifiedData.minified) return
    const element = document.createElement('a')
    const file = new Blob([minifiedData.minified], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = `minified.${fileExtension}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success(`Downloaded minified.${fileExtension}!`)
  }

  return (
    <div className="space-y-5 font-sans text-left">
      {/* Analytics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/60 bg-card text-center sm:col-span-1">
          <span className="text-sm font-semibold text-muted-foreground block">Original Size</span>
          <span className="text-xl font-bold text-foreground font-mono mt-1 block">
            {formatBytes(minifiedData.originalSize)}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-card text-center sm:col-span-1">
          <span className="text-sm font-semibold text-muted-foreground block">Minified Size</span>
          <span className="text-xl font-bold text-primary font-mono mt-1 block">
            {formatBytes(minifiedData.minifiedSize)}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-card sm:col-span-2 text-center sm:text-left flex flex-col justify-center space-y-1">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Size Reduction: {minifiedData.percent}%</span>
            <span>Saved {formatBytes(minifiedData.savings)}</span>
          </div>
          <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${minifiedData.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Editor grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary" />
              Source {label}
            </h3>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-xs font-mono transition-all focus:border-primary/50 resize-y min-h-[300px] max-h-[500px]"
            placeholder={placeholder}
          />
        </div>

        {/* Output */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Minimize2 className="w-4 h-4 text-primary" />
              Minified Output
            </h3>
            <div className="flex gap-2">
              <button
                disabled={!minifiedData.minified}
                onClick={copyToClipboard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
              <button
                disabled={!minifiedData.minified}
                onClick={downloadFile}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={minifiedData.minified || minifiedData.error || ''}
            className="w-full px-3 py-2 bg-muted/20 border border-border/40 rounded-xl outline-none text-xs font-mono transition-all resize-y min-h-[300px] max-h-[500px] text-muted-foreground"
            placeholder="Minified output will appear here..."
          />
        </div>
      </div>
    </div>
  )
}

// 1. HTML Minifier
export function HtmlMinifier() {
  const defaultHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>My Test Page</title>
    <!-- Page description tags -->
    <meta name="description" content="This is my description">
  </head>
  <body>
    <h1>Welcome to My Website</h1>
    <p>
      Minification strips comments and extra spaces, improving website performance.
    </p>
  </body>
</html>`

  const minifyHtml = (html) => {
    return html
      .replace(/>\s+</g, '><') // Remove space between tags
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\s*>\s*/g, '>') // Spaces around >
      .replace(/\s*<\s*/g, '<') // Spaces around <
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .trim()
  }

  return (
    <MinifierBase
      title="HTML Minifier"
      label="HTML"
      placeholder="Paste HTML here..."
      defaultValue={defaultHtml}
      minifyFn={minifyHtml}
      fileExtension="html"
      mimeType="text/html"
    />
  )
}

// 2. CSS Minifier
export function CssMinifier() {
  const defaultCss = `/* Main styling sheet */
body {
  background-color: #f3f4f6;
  color: #111827;
  font-family: sans-serif;
}

.card {
  margin: 20px;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}`

  const minifyCss = (css) => {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\s*{\s*/g, '{') // Spaces around {
      .replace(/\s*}\s*/g, '}') // Spaces around }
      .replace(/\s*;\s*/g, ';') // Spaces around ;
      .replace(/\s*:\s*/g, ':') // Spaces around :
      .replace(/;\s*}/g, '}') // Remove final semicolon inside block
      .replace(/,\s*/g, ',') // Spaces around commas
      .trim()
  }

  return (
    <MinifierBase
      title="CSS Minifier"
      label="CSS"
      placeholder="Paste CSS here..."
      defaultValue={defaultCss}
      minifyFn={minifyCss}
      fileExtension="css"
      mimeType="text/css"
    />
  )
}

// 3. JavaScript Minifier
export function JavascriptMinifier() {
  const defaultJs = `// Simple mathematical function
function calculateTotal(price, taxRate) {
  /* Calculate sales tax amount
     and sum it with principal */
  const tax = price * taxRate;
  console.log("Adding tax amount:", tax);
  return price + tax;
}`

  const minifyJs = (js) => {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\s+/g, ' ') // Collapse spaces
      .replace(/\s*{\s*/g, '{') // Spaces around {
      .replace(/\s*}\s*/g, '}') // Spaces around }
      .replace(/\s*\(\s*/g, '(') // Spaces around (
      .replace(/\s*\)\s*/g, ')') // Spaces around )
      .replace(/\s*;\s*/g, ';') // Spaces around ;
      .replace(/\s*,\s*/g, ',') // Spaces around ,
      .replace(/\s*=\s*/g, '=') // Spaces around =
      .replace(/\s*\+\s*/g, '+') // Spaces around +
      .replace(/\s*-\s*/g, '-') // Spaces around -
      .trim()
  }

  return (
    <MinifierBase
      title="JavaScript Minifier"
      label="JavaScript"
      placeholder="Paste JavaScript here..."
      defaultValue={defaultJs}
      minifyFn={minifyJs}
      fileExtension="js"
      mimeType="application/javascript"
    />
  )
}
