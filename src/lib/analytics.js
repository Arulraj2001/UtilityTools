import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { logAnalyticsEvent } from '@/api/supabaseApi'

const SESSION_STORAGE_KEY = 'analytics_session_id'
const PAGE_VIEW_DEDUPE_KEY = 'analytics_page_viewed'
const TOOL_OPEN_DEDUPE_KEY = 'analytics_tool_opened'
const SEARCH_DEDUPE_KEY = 'analytics_search_logged'

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-session'
  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) return stored
  const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, newId)
  return newId
}

const getTrafficSource = (referrer = '') => {
  const lower = (referrer || '').toLowerCase()
  if (!lower) return 'direct'
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(lower)) return 'organic'
  if (/\bfacebook\.com|twitter\.com|linkedin\.com|pinterest\.com|instagram\.com|t\.co\b/.test(lower)) return 'social'
  if (/\/t\//.test(lower)) return 'referral'
  if (/localhost|127\.0\.0\.1/.test(lower)) return 'internal'
  return 'referral'
}

const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'desktop', browser: 'unknown' }
  }

  const ua = navigator.userAgent || ''
  const browser = /(Edg|Edge)\//.test(ua)
    ? 'edge'
    : /\b(OPR|Opera)\//.test(ua)
      ? 'opera'
      : /\bChrome\//.test(ua) && !/\b(Chromium)\//.test(ua)
        ? 'chrome'
        : /\bFirefox\//.test(ua)
          ? 'firefox'
          : /\bSafari\//.test(ua) && !/\bChrome\//.test(ua)
            ? 'safari'
            : 'other'

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua)
  const isTablet = /Tablet|iPad/.test(ua)
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  return { deviceType, browser }
}

const getPageContext = (path = '') => {
  if (path.startsWith('/tool/')) {
    return { pageType: 'tool', pageSlug: path.replace('/tool/', '') }
  }
  if (path.startsWith('/blog/')) {
    return { pageType: 'blog_post', pageSlug: path.replace('/blog/', '') }
  }
  if (path.startsWith('/category/')) {
    return { pageType: 'category', pageSlug: path.replace('/category/', '') }
  }
  if (path.startsWith('/categories')) return { pageType: 'categories_index' }
  if (path.startsWith('/blog')) return { pageType: 'blog_index' }
  if (path.startsWith('/tools')) return { pageType: 'tools_index' }
  return { pageType: 'page' }
}

const safeSendEvent = async (eventType, eventData) => {
  if (typeof window === 'undefined') return
  const payload = {
    event_type: eventType,
    event_data: eventData,
    page_url: window.location.pathname,
    session_id: getSessionId(),
    user_agent: window.navigator.userAgent,
    ...getDeviceInfo(),
  }

  try {
    await logAnalyticsEvent(eventType, payload)
  } catch (error) {
    console.warn('Analytics event failed', eventType, error)
  }
}

export const trackPageView = async () => {
  if (typeof window === 'undefined') return
  const pathname = window.location.pathname
  const dedupeKey = `${PAGE_VIEW_DEDUPE_KEY}:${pathname}`
  if (window.sessionStorage.getItem(dedupeKey)) return
  window.sessionStorage.setItem(dedupeKey, String(Date.now()))

  const pageContext = getPageContext(pathname)
  const referrer = document.referrer || ''
  const source = getTrafficSource(referrer)

  await safeSendEvent('page_view', {
    pageTitle: document.title || pathname,
    referrer,
    traffic_source: source,
    ...pageContext,
  })
}

export const trackToolEvent = async (tool, action, extraData = {}) => {
  if (!tool || !tool.slug) return
  const key = `${TOOL_OPEN_DEDUPE_KEY}:${tool.slug}:${action}`
  if (action === 'tool_open' && typeof window !== 'undefined') {
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, String(Date.now()))
  }

  await safeSendEvent('tool_event', {
    action,
    toolSlug: tool.slug,
    toolName: tool.name,
    categoryId: tool.category_id,
    categoryName: tool.categories?.name || null,
    ...extraData,
  })
}

export const trackWorkflowSearch = async ({ query = '', resultCount = 0, source = 'tools_search' }) => {
  if (typeof window === 'undefined') return
  const trimmed = String(query || '').trim()
  if (trimmed.length < 2) return

  const dedupeKey = `${SEARCH_DEDUPE_KEY}:${trimmed}:${source}`
  const lastLogged = window.sessionStorage.getItem(dedupeKey)
  const now = Date.now()
  if (lastLogged && now - Number(lastLogged) < 1000 * 60 * 3) return
  window.sessionStorage.setItem(dedupeKey, String(now))

  await safeSendEvent('workflow_search', {
    query: trimmed,
    result_count: Number(resultCount || 0),
    source,
  })
}

export const usePageAnalytics = () => {
  const location = useLocation()
  useEffect(() => {
    trackPageView()
  }, [location.pathname])
}
