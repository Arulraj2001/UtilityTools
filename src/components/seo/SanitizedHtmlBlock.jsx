import React from 'react'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

export default function SanitizedHtmlBlock({ html = '', className = '' }) {
  if (!html) return null
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}
