import React, { useState, useEffect } from 'react'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

export default function SanitizedHtmlBlock({ html = '', className = '' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!html) return null
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: mounted ? sanitizeHtml(html) : html }}
    />
  )
}
