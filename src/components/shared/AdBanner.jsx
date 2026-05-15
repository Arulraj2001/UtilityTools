import React, { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdPlacements } from '@/api/supabaseApi'

/**
 * @param {string} placement
 * @param {string} pathname
 * @returns {string}
 */
const inferPageType = (placement, pathname) => {
  if (placement.startsWith('tool_')) return 'tool'
  if (placement.startsWith('blog_')) return 'blog'
  if (placement.startsWith('homepage_')) return 'home'
  if (pathname.startsWith('/tool')) return 'tool'
  if (pathname.startsWith('/blog')) return 'blog'
  if (pathname.startsWith('/category')) return 'category'
  if (pathname === '/' || pathname === '') return 'home'
  return 'all'
}

/**
 * @param {{code:string}} props
 */
function AdHtml({ code }) {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = code || ''

    const scripts = Array.from(containerRef.current.querySelectorAll('script'))
    scripts.forEach((oldScript) => {
      const script = document.createElement('script')
      Array.from(oldScript.attributes).forEach(attr => script.setAttribute(attr.name, attr.value))
      if (oldScript.src) {
        script.src = oldScript.src
      } else {
        script.textContent = oldScript.textContent
      }
      if (oldScript.parentNode) {
        oldScript.parentNode.replaceChild(script, oldScript)
      }
    })
  }, [code])

  return <div ref={containerRef} className="w-full" />
}

/**
 * @param {{placement?:string,pageType?:string,className?:string}} props
 */
export default function AdBanner({ placement = 'in_content', pageType, className = '' }) {
  const location = useLocation()
  const targetPageType = useMemo(() => pageType || inferPageType(placement, location.pathname), [placement, pageType, location.pathname])

  const { data: ads = [] } = useQuery({
    queryKey: ['ad-placements', placement, targetPageType],
    queryFn: () => getAdPlacements({ orderBy: 'created_at', ascending: false, limit: 50, isActive: true }),
    retry: false,
  })

  const matchingAd = useMemo(() => {
    return ads.find((/** @type {{placement:string,page_type:string,is_active:boolean}} */ ad) => {
      const pageMatch = ad.page_type === 'all' || ad.page_type === targetPageType
      return ad.placement === placement && pageMatch && ad.is_active
    })
  }, [ads, placement, targetPageType])

  return (
    <div className={`w-full flex items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl rounded-xl p-6 border border-border/50 bg-card shadow-sm">
        {matchingAd?.ad_code ? (
          <AdHtml code={matchingAd.ad_code} />
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Advertisement</p>
            <p className="mt-3 text-sm text-muted-foreground">Ad Space — {placement}</p>
          </div>
        )}
      </div>
    </div>
  )
}