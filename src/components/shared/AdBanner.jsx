import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdPlacements } from '@/api/supabaseApi'

const ADSENSE_CLIENT = 'ca-pub-1603942692726452'
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
let adsenseScriptLoadPromise = null

const loadAdsenseScript = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.adsbygoogle) return Promise.resolve()
  if (adsenseScriptLoadPromise) return adsenseScriptLoadPromise

  adsenseScriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = ADSENSE_SRC
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load AdSense script'))
    document.head.appendChild(script)
  })

  return adsenseScriptLoadPromise
}

const scheduleIdle = (callback) => {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => callback(), { timeout: 2000 })
  } else {
    window.setTimeout(callback, 1500)
  }
}

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
 * @param {{code:string,active:boolean}} props
 */
function AdHtml({ code, active }) {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    if (!containerRef.current || !active) return
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
  }, [code, active])

  return <div ref={containerRef} className="w-full" />
}

/**
 * @param {{placement?:string,pageType?:string,className?:string}} props
 */
export default function AdBanner({ placement = 'in_content', pageType, className = '' }) {
  const location = useLocation()
  const targetPageType = useMemo(() => pageType || inferPageType(placement, location.pathname), [placement, pageType, location.pathname])
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [shouldLoadAd, setShouldLoadAd] = useState(false)
  const [activeAdRender, setActiveAdRender] = useState(false)

  const { data: ads = [] } = useQuery({
    queryKey: ['ad-placements', placement, targetPageType],
    queryFn: () => getAdPlacements({ orderBy: 'created_at', ascending: false, limit: 50, isActive: true }),
    retry: false,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  })

  const matchingAd = useMemo(() => {
    return ads.find((/** @type {{placement:string,page_type:string,is_active:boolean}} */ ad) => {
      const pageMatch = ad.page_type === 'all' || ad.page_type === targetPageType
      return ad.placement === placement && pageMatch && ad.is_active
    })
  }, [ads, placement, targetPageType])

  useEffect(() => {
    if (!matchingAd?.ad_code || shouldLoadAd) return
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setShouldLoadAd(true)
      return
    }

    const node = containerRef.current
    if (!node) {
      setShouldLoadAd(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadAd(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [matchingAd?.ad_code, shouldLoadAd])

  useEffect(() => {
    if (!shouldLoadAd || !matchingAd?.ad_code) return
    scheduleIdle(() => {
      loadAdsenseScript()
        .catch(() => {
          // If AdSense fails, still render lightweight ad markup below.
        })
        .finally(() => setActiveAdRender(true))
    })
  }, [shouldLoadAd, matchingAd?.ad_code])

  if (!matchingAd?.ad_code) {
    return null
  }

  return (
    <div ref={containerRef} className={`w-full flex items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl rounded-xl p-6 border border-border/50 bg-card shadow-sm">
        {shouldLoadAd ? (
          <AdHtml code={matchingAd.ad_code} active={activeAdRender} />
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Advertisement</p>
            <p className="mt-3 text-sm text-muted-foreground">Ad space loading soon</p>
          </div>
        )}
      </div>
    </div>
  )
}