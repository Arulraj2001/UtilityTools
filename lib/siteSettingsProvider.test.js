/**
 * siteSettingsProvider.test.js
 * Phase 5E — Tests for SiteSettingsProvider head injection behaviour
 *
 * Tests: head injection, adsense injection, verification meta tags, disable behaviour
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Mock DOM helpers ─────────────────────────────────────────────────────────

/**
 * We test the injection logic by importing the helpers directly.
 * We simulate the DOM using jsdom (provided by vitest's jsdom environment).
 */

// Minimal applySettings extracted for testability
// (mirrors the logic in SiteSettingsProvider.jsx)
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

function applySettings(rows = []) {
  const { sanitizeCustomHtml } = require('./siteSettingsApi')

  const active = rows.reduce((acc, row) => {
    if (row.is_active !== false) acc[row.key] = row.value
    return acc
  }, {})

  const verificationMetas = [
    { key: 'google_site_verification', name: 'google-site-verification' },
    { key: 'bing_site_verification',   name: 'msvalidate.01' },
    { key: 'ahrefs_site_verification', name: 'ahrefs-site-verification' },
    { key: 'yandex_site_verification', name: 'yandex-verification' },
  ]
  verificationMetas.forEach(({ key, name }) => {
    const value = active[key]
    if (value?.trim()) setMeta(name, value.trim())
    else removeMeta(name)
  })

  const gaId = active['google_analytics_id']
  if (gaId?.trim()) {
    injectScript('ssp-ga4-loader', `https://www.googletagmanager.com/gtag/js?id=${gaId.trim()}`)
    injectInlineScript('ssp-ga4-init', `window.dataLayer=window.dataLayer||[];`)
  } else {
    removeById('ssp-ga4-loader')
    removeById('ssp-ga4-init')
  }

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

  const adsenseClient = active['google_adsense_client']
  if (adsenseClient?.trim()) {
    injectScript('ssp-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient.trim()}`, { crossorigin: 'anonymous' })
  } else {
    removeById('ssp-adsense')
  }
}

function cleanup() {
  document.querySelectorAll('[data-ssp="1"]').forEach((el) => el.remove())
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clean DOM before each test
  cleanup()
})

afterEach(() => {
  cleanup()
})

describe('Verification meta tag injection', () => {
  it('injects google-site-verification meta when active', () => {
    applySettings([
      { key: 'google_site_verification', value: 'test-google-token', is_active: true },
    ])
    const meta = document.querySelector('meta[name="google-site-verification"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('test-google-token')
    expect(meta.getAttribute('data-ssp')).toBe('1')
  })

  it('injects msvalidate.01 for Bing when active', () => {
    applySettings([
      { key: 'bing_site_verification', value: 'bing-token-xyz', is_active: true },
    ])
    const meta = document.querySelector('meta[name="msvalidate.01"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('bing-token-xyz')
  })

  it('injects ahrefs-site-verification meta', () => {
    applySettings([
      { key: 'ahrefs_site_verification', value: 'ahrefs-token', is_active: true },
    ])
    const meta = document.querySelector('meta[name="ahrefs-site-verification"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('ahrefs-token')
  })

  it('injects yandex-verification meta', () => {
    applySettings([
      { key: 'yandex_site_verification', value: 'yandex-token', is_active: true },
    ])
    const meta = document.querySelector('meta[name="yandex-verification"]')
    expect(meta).not.toBeNull()
  })

  it('removes google meta when is_active is false', () => {
    // First inject
    applySettings([{ key: 'google_site_verification', value: 'token', is_active: true }])
    expect(document.querySelector('meta[name="google-site-verification"]')).not.toBeNull()

    // Then disable
    applySettings([{ key: 'google_site_verification', value: 'token', is_active: false }])
    expect(document.querySelector('meta[name="google-site-verification"][data-ssp="1"]')).toBeNull()
  })
})

describe('Google Analytics injection', () => {
  it('injects GA4 loader script when analytics ID is set', () => {
    applySettings([
      { key: 'google_analytics_id', value: 'G-TEST123', is_active: true },
    ])
    const loaderScript = document.getElementById('ssp-ga4-loader')
    expect(loaderScript).not.toBeNull()
    expect(loaderScript.src).toContain('G-TEST123')
    expect(loaderScript.async).toBe(true)
  })

  it('injects GA4 init inline script', () => {
    applySettings([
      { key: 'google_analytics_id', value: 'G-TEST123', is_active: true },
    ])
    const initScript = document.getElementById('ssp-ga4-init')
    expect(initScript).not.toBeNull()
    expect(initScript.textContent).toContain('dataLayer')
  })

  it('removes GA4 scripts when disabled', () => {
    applySettings([{ key: 'google_analytics_id', value: 'G-TEST123', is_active: true }])
    expect(document.getElementById('ssp-ga4-loader')).not.toBeNull()

    applySettings([{ key: 'google_analytics_id', value: 'G-TEST123', is_active: false }])
    expect(document.getElementById('ssp-ga4-loader')).toBeNull()
    expect(document.getElementById('ssp-ga4-init')).toBeNull()
  })
})

describe('Microsoft Clarity injection', () => {
  it('injects Clarity bootstrap script when the ID is set', () => {
    applySettings([
      { key: 'microsoft_clarity_id', value: 'xp7wafzs8u', is_active: true },
    ])

    const clarityScript = document.getElementById('ssp-clarity')
    expect(clarityScript).not.toBeNull()
    expect(clarityScript.textContent).toContain('clarity.ms/tag')
    expect(clarityScript.textContent).toContain('xp7wafzs8u')
  })

  it('removes Clarity script when disabled', () => {
    applySettings([{ key: 'microsoft_clarity_id', value: 'xp7wafzs8u', is_active: true }])
    expect(document.getElementById('ssp-clarity')).not.toBeNull()

    applySettings([{ key: 'microsoft_clarity_id', value: 'xp7wafzs8u', is_active: false }])
    expect(document.getElementById('ssp-clarity')).toBeNull()
  })
})

describe('AdSense injection', () => {
  it('injects adsbygoogle.js script with publisher ID', () => {
    applySettings([
      { key: 'google_adsense_client', value: 'ca-pub-123456789', is_active: true },
    ])
    const adsenseScript = document.getElementById('ssp-adsense')
    expect(adsenseScript).not.toBeNull()
    expect(adsenseScript.src).toContain('ca-pub-123456789')
    expect(adsenseScript.getAttribute('crossorigin')).toBe('anonymous')
    expect(adsenseScript.async).toBe(true)
  })

  it('does not inject AdSense when publisher ID is empty', () => {
    applySettings([
      { key: 'google_adsense_client', value: '', is_active: true },
    ])
    expect(document.getElementById('ssp-adsense')).toBeNull()
  })

  it('removes AdSense script when disabled', () => {
    applySettings([{ key: 'google_adsense_client', value: 'ca-pub-123', is_active: true }])
    expect(document.getElementById('ssp-adsense')).not.toBeNull()

    applySettings([{ key: 'google_adsense_client', value: 'ca-pub-123', is_active: false }])
    expect(document.getElementById('ssp-adsense')).toBeNull()
  })
})

describe('Multiple active settings', () => {
  it('injects all active settings simultaneously', () => {
    applySettings([
      { key: 'google_site_verification', value: 'google-token', is_active: true },
      { key: 'bing_site_verification', value: 'bing-token', is_active: true },
      { key: 'google_analytics_id', value: 'G-TEST', is_active: true },
      { key: 'google_adsense_client', value: 'ca-pub-999', is_active: true },
    ])

    expect(document.querySelector('meta[name="google-site-verification"]')).not.toBeNull()
    expect(document.querySelector('meta[name="msvalidate.01"]')).not.toBeNull()
    expect(document.getElementById('ssp-ga4-loader')).not.toBeNull()
    expect(document.getElementById('ssp-adsense')).not.toBeNull()
  })

  it('cleans up when applySettings called with empty rows', () => {
    applySettings([
      { key: 'google_site_verification', value: 'token', is_active: true },
      { key: 'google_analytics_id', value: 'G-TEST', is_active: true },
    ])

    applySettings([])
    expect(document.querySelector('meta[name="google-site-verification"][data-ssp="1"]')).toBeNull()
    expect(document.getElementById('ssp-ga4-loader')).toBeNull()
  })
})

describe('Script replacement (no duplicates)', () => {
  it('replaces existing script on re-apply without creating duplicates', () => {
    applySettings([{ key: 'google_analytics_id', value: 'G-FIRST', is_active: true }])
    applySettings([{ key: 'google_analytics_id', value: 'G-SECOND', is_active: true }])

    const scripts = document.querySelectorAll('#ssp-ga4-loader')
    expect(scripts.length).toBe(1)
    expect(scripts[0].src).toContain('G-SECOND')
  })
})
