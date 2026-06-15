'use client';
/**
 * SiteSettingsProvider.jsx
 * Phase 5E — Injects active SEO/verification/analytics/advertising settings
 * dynamically into <head> without editing index.html or redeploying.
 *
 * Architecture constraints respected:
 * - Does NOT modify AI pipeline, queue, review, monitoring, or publishing
 * - Reads from existing site_settings table via siteSettingsApi
 * - Renders null (no visible UI)
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSeoSettings, sanitizeCustomHtml } from '@/api/siteSettingsApi'

// ─── Injection helpers ────────────────────────────────────────────────────────

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  el.setAttribute('data-ssp', '1')
}

function removeMeta(name) {
  const el = document.querySelector(`meta[name="${name}"][data-ssp="1"]`)
  if (el) el.remove()
}

function removeById(id) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

function injectScript(id, src, extra = {}) {
  removeById(id)
  const script = document.createElement('script')
  script.id = id
  script.src = src
  script.async = true
  Object.entries(extra).forEach(([k, v]) => script.setAttribute(k, v))
  script.setAttribute('data-ssp', '1')
  document.head.appendChild(script)
}

function injectInlineScript(id, code) {
  removeById(id)
  const script = document.createElement('script')
  script.id = id
  script.textContent = code
  script.setAttribute('data-ssp', '1')
  document.head.appendChild(script)
}

function injectRawHtml(containerId, html) {
  removeById(containerId)
  if (!html) return
  const wrapper = document.createElement('div')
  wrapper.id = containerId
  wrapper.setAttribute('data-ssp', '1')
  // Use a document fragment for safe DOM insertion
  const range = document.createRange()
  range.selectNode(document.head)
  try {
    const frag = range.createContextualFragment(html)
    wrapper.appendChild(frag)
  } catch {
    // If fragment parsing fails, treat as text (safe fallback)
    wrapper.textContent = html
  }
  document.head.appendChild(wrapper)
}

function injectFooterHtml(containerId, html) {
  removeById(containerId)
  if (!html) return
  const wrapper = document.createElement('div')
  wrapper.id = containerId
  wrapper.setAttribute('data-ssp', '1')
  const range = document.createRange()
  range.selectNode(document.body)
  try {
    const frag = range.createContextualFragment(html)
    wrapper.appendChild(frag)
  } catch {
    wrapper.textContent = html
  }
  document.body.appendChild(wrapper)
}

// ─── Main injection function ─────────────────────────────────────────────────

function applySettings(rows = []) {
  // Build a lookup: key → row (only active rows are applied)
  const active = rows.reduce((acc, row) => {
    if (row.is_active !== false) acc[row.key] = row.value
    return acc
  }, {})

  // ── Verification meta tags ────────────────────────────────────────────────
  const verificationMetas = [
    { key: 'google_site_verification', name: 'google-site-verification' },
    { key: 'bing_site_verification',   name: 'msvalidate.01' },
    { key: 'ahrefs_site_verification', name: 'ahrefs-site-verification' },
    { key: 'yandex_site_verification', name: 'yandex-verification' },
  ]
  verificationMetas.forEach(({ key, name }) => {
    const value = active[key]
    if (value?.trim()) {
      setMeta(name, value.trim())
    } else {
      removeMeta(name)
    }
  })

  // ── Google Analytics 4 ───────────────────────────────────────────────────
  const gaId = active['google_analytics_id']
  if (gaId?.trim()) {
    injectScript('ssp-ga4-loader', `https://www.googletagmanager.com/gtag/js?id=${gaId.trim()}`)
    injectInlineScript('ssp-ga4-init', `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId.trim()}');
    `.trim())
  } else {
    removeById('ssp-ga4-loader')
    removeById('ssp-ga4-init')
  }

  // ── Google Tag Manager ───────────────────────────────────────────────────
  const gtmId = active['google_tag_manager_id']
  if (gtmId?.trim()) {
    injectInlineScript('ssp-gtm-head', `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId.trim()}');
    `.trim())

    // GTM noscript — inject into body
    const noscriptId = 'ssp-gtm-noscript'
    removeById(noscriptId)
    const noscript = document.createElement('noscript')
    noscript.id = noscriptId
    noscript.setAttribute('data-ssp', '1')
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId.trim()}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.cssText = 'display:none;visibility:hidden'
    noscript.appendChild(iframe)
    if (document.body) {
      document.body.insertBefore(noscript, document.body.firstChild)
    }
  } else {
    removeById('ssp-gtm-head')
    removeById('ssp-gtm-noscript')
  }

  // ── Microsoft Clarity ────────────────────────────────────────────────────
  const clarityId = active['microsoft_clarity_id']
  if (clarityId?.trim()) {
    injectInlineScript('ssp-clarity', `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${clarityId.trim()}");
    `.trim())
  } else {
    removeById('ssp-clarity')
  }

  // ── Facebook Pixel ───────────────────────────────────────────────────────
  const fbId = active['facebook_pixel_id']
  if (fbId?.trim()) {
    injectInlineScript('ssp-fbpixel', `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${fbId.trim()}');fbq('track','PageView');
    `.trim())
  } else {
    removeById('ssp-fbpixel')
  }

  // ── Google AdSense ───────────────────────────────────────────────────────
  const adsenseClient = active['google_adsense_client']
  if (adsenseClient?.trim()) {
    injectScript(
      'ssp-adsense',
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient.trim()}`,
      { crossorigin: 'anonymous' }
    )
  } else {
    removeById('ssp-adsense')
  }

  // ── Custom Head HTML ─────────────────────────────────────────────────────
  const headHtml = active['custom_head_html']
  if (headHtml?.trim()) {
    injectRawHtml('ssp-custom-head', sanitizeCustomHtml(headHtml))
  } else {
    removeById('ssp-custom-head')
  }

  // ── Custom Footer HTML ───────────────────────────────────────────────────
  const footerHtml = active['custom_footer_html']
  if (footerHtml?.trim()) {
    injectFooterHtml('ssp-custom-footer', sanitizeCustomHtml(footerHtml))
  } else {
    removeById('ssp-custom-footer')
  }
}

function cleanupAllSspElements() {
  document.querySelectorAll('[data-ssp="1"]').forEach((el) => el.remove())
}

// ─── React component ─────────────────────────────────────────────────────────

/**
 * SiteSettingsProvider
 *
 * Mounts once in App.jsx. Loads active SEO settings after idle time
 * (non-blocking) and injects them into the document <head>.
 * Re-injects whenever settings are invalidated (e.g. after admin save).
 */
export function SiteSettingsProvider() {
  const { data: rows = [] } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: getSeoSettings,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined',
  })

  useEffect(() => {
    if (!rows.length) return
    applySettings(rows)
    return () => {
      // Cleanup on unmount (hot-reload safety)
      cleanupAllSspElements()
    }
  }, [rows])

  return null
}

export default SiteSettingsProvider
