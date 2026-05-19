import React from 'react'
import { Link } from 'react-router-dom'

export default function KeywordSuggestions({ items = [], title = 'Suggested links' }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
      <div className="flex flex-col gap-2">
        {items.map(it => (
          <Link key={it.slug || it.id} to={it.slug ? (it.type === 'tool' ? `/tool/${encodeURIComponent(it.slug)}` : `/blog/${encodeURIComponent(it.slug)}`) : '#'} className="text-sm hover:text-primary truncate">
            {it.title || it.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
