import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Cookie, ShieldCheck } from 'lucide-react'

const CONSENT_KEY = 'quickutils_cookie_consent'
const CONSENT_VERSION = 1

/**
 * Returns the stored consent object or null if not yet given.
 */
export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Call this to programmatically re-open the consent banner (e.g. from footer link).
 */
export function reopenCookieConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY)
    window.dispatchEvent(new CustomEvent('quickutils:reopen-consent'))
  } catch {}
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getCookieConsent()
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener('quickutils:reopen-consent', handler)
    return () => window.removeEventListener('quickutils:reopen-consent', handler)
  }, [])

  const save = (analytics) => {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          version: CONSENT_VERSION,
          necessary: true,
          analytics,
          timestamp: new Date().toISOString(),
        })
      )
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[9999] animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-sm">We use cookies</p>
          </div>
          <button
            onClick={() => save(false)}
            aria-label="Close without accepting optional cookies"
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          We use <strong>necessary cookies</strong> to make the site work, and optional{' '}
          <strong>analytics cookies</strong> to understand how you use our tools.
          No personal data is sold. See our{' '}
          <Link to="/privacy" className="underline hover:text-primary transition-colors">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link to="/cookie-policy" className="underline hover:text-primary transition-colors">
            Cookie Policy
          </Link>
          .
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span>Necessary cookies are always active</span>
        </div>

        <div className="flex gap-2">
          <button
            id="cookie-accept-all"
            onClick={() => save(true)}
            className="flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2.5 px-3 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Accept all
          </button>
          <button
            id="cookie-necessary-only"
            onClick={() => save(false)}
            className="flex-1 rounded-xl border border-border bg-background text-xs font-semibold py-2.5 px-3 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Necessary only
          </button>
        </div>
      </div>
    </div>
  )
}
