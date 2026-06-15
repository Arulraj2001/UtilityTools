import React, { useState, useMemo } from 'react'
import { Copy, Check, Download, Minimize2, Maximize2, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import useIntersectionLoad from '../../hooks/useIntersectionLoad'

const JSON_TOKEN_PATTERN = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g

const getTokenClass = (match) => {
  if (/^"/.test(match)) {
    return /:$/.test(match) ? 'text-purple-400' : 'text-green-400'
  }
  if (/true|false/.test(match)) return 'text-yellow-400'
  if (/null/.test(match)) return 'text-red-400'
  return 'text-blue-400'
}

// Simple JSON syntax highlighter (NO logic change)
function highlight(json) {
  const source = String(json || '')
  const parts = []
  let lastIndex = 0

  source.replace(JSON_TOKEN_PATTERN, (match, _escaped, _plain, _key, _literal, offset) => {
    if (offset > lastIndex) parts.push(source.slice(lastIndex, offset))
    parts.push({ text: match, className: getTokenClass(match) })
    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < source.length) parts.push(source.slice(lastIndex))
  return parts
}

export default function ResultJSON({ value, label = 'JSON Output' }) {
  const [minified, setMinified] = useState(false)
  const [copied, setCopied] = useState(false)

  const [ref, isVisible] = useIntersectionLoad({ rootMargin: '200px', once: true })

  const display = useMemo(() => {
    if (!value) return ''
    if (minified) {
      try {
        return JSON.stringify(JSON.parse(value))
      } catch {
        return value
      }
    }
    return value
  }, [value, minified])

  const copy = () => {
    navigator.clipboard.writeText(display)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([display], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'output.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        rounded-3xl
        border
        border-border/60
        bg-card/95
        shadow-sm
        overflow-hidden
        backdrop-blur
      "
    >

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-muted/30">

        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs hover:bg-primary/10"
            onClick={() => setMinified(m => !m)}
          >
            {minified ? (
              <Maximize2 className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 mr-1" />
            )}
            {minified ? 'Beautify' : 'Minify'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs hover:bg-primary/10"
            onClick={copy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 mr-1 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs hover:bg-primary/10"
            onClick={download}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>

        </div>
      </div>

      {/* CODE AREA */}
      <div ref={ref}>
        {!isVisible && (
          <div className="p-6 bg-[#0b1220] rounded-lg animate-pulse h-40" />
        )}

        {isVisible && (
          <pre
            className="
              p-5
              text-sm
              font-mono
              leading-relaxed
              max-h-96
              overflow-auto
              bg-[#0b1220]
            "
          >
            {highlight(display).map((part, index) => (
              typeof part === 'string'
                ? part
                : <span key={`${part.text}-${index}`} className={part.className}>{part.text}</span>
            ))}
          </pre>
        )}
      </div>
    </motion.div>
  )
}
