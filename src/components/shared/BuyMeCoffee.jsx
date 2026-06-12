import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '@/api/supabaseApi'

/**
 * Shared hook that reads BMAC settings from site_settings.
 * Cached for 5 minutes — no extra network cost across the site.
 */
export function useBmacSettings() {
  const { data: siteSettings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
    staleTime: 1000 * 60 * 5,
  })

  return useMemo(() => {
    const get = (key, fallback) => {
      const s = siteSettings.find(x => x.key === key)
      if (!s) return fallback
      if (s.type === 'boolean') return String(s.value) === 'true'
      return s.value || fallback
    }
    return {
      enabled: get('bmac_enabled', false),
      username: get('bmac_username', ''),
      color: get('bmac_color', '#FFDD00'),
      emoji: get('bmac_emoji', '☕'),
      text: get('bmac_text', 'Buy me a coffee'),
      description: get('bmac_description', 'If you find these tools useful, consider supporting development!'),
      sidebarEnabled: get('bmac_sidebar_enabled', true),
      floatingEnabled: get('bmac_floating_enabled', false),
      widgetPosition: get('bmac_widget_position', 'bottom-right'),
    }
  }, [siteSettings])
}

/**
 * Floating circular Buy Me a Coffee button for the public site.
 * Only renders when bmac_enabled=true, bmac_floating_enabled=true, and a username is set.
 */
export function BmacFloatingButton() {
  const bmac = useBmacSettings()

  if (!bmac.enabled || !bmac.floatingEnabled || !bmac.username) return null

  const positionClass = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6',
  }[bmac.widgetPosition] || 'bottom-6 right-6'

  return (
    <a
      href={`https://www.buymeacoffee.com/${bmac.username}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${bmac.text} — Support QuickUtils`}
      aria-label={bmac.text}
      className={`fixed ${positionClass} z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group`}
      style={{ backgroundColor: bmac.color }}
    >
      <span className="text-xl select-none" role="img" aria-hidden="true">{bmac.emoji}</span>
      {/* Tooltip on hover */}
      <span
        className="absolute bottom-full mb-2 right-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ backgroundColor: bmac.color, color: '#000' }}
      >
        {bmac.text}
      </span>
    </a>
  )
}

/**
 * Compact inline "Support Us" card for the Footer.
 * Only renders when bmac_enabled=true and a username is set.
 */
export function BmacFooterCard() {
  const bmac = useBmacSettings()

  if (!bmac.enabled || !bmac.username) return null

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-gradient-to-br from-card to-background/80 p-4 hover:border-primary/30 transition-colors">
      <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-2 flex items-center gap-1.5">
        <span role="img" aria-hidden="true" style={{ fontSize: '0.75rem' }}>{bmac.emoji}</span>
        Support Us
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {bmac.description}
      </p>
      <a
        href={`https://www.buymeacoffee.com/${bmac.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.03] active:scale-95 shadow-sm"
        style={{ backgroundColor: bmac.color, color: '#000' }}
      >
        <span role="img" aria-hidden="true" style={{ fontSize: '0.75rem' }}>{bmac.emoji}</span>
        {bmac.text}
      </a>
    </div>
  )
}