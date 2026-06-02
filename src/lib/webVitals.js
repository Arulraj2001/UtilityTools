const observedMetrics = new Map()

const scheduleMetricSend = (metric) => {
  if (typeof window === 'undefined') return
  const send = async () => {
    try {
      const { logAnalyticsEvent } = await import('@/api/supabaseApi')
      await logAnalyticsEvent('web_vital', {
        metric_name: metric.name,
        metric_value: Math.round(metric.value),
        metric_rating: metric.rating,
        page_url: window.location.pathname,
        user_agent: window.navigator.userAgent,
      })
    } catch {
      // RUM must never affect UX.
    }
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(send, { timeout: 5000 })
  } else {
    window.setTimeout(send, 2500)
  }
}

const ratingFor = (name, value) => {
  if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
  if (name === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
  if (name === 'FCP') return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
  if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
  return 'unknown'
}

const recordMetric = (name, value) => {
  if (!Number.isFinite(value)) return
  const previous = observedMetrics.get(name)
  if (previous && previous.value === value) return

  const metric = { name, value, rating: ratingFor(name, value) }
  observedMetrics.set(name, metric)
  scheduleMetricSend(metric)
}

export const initWebVitals = () => {
  if (typeof PerformanceObserver === 'undefined') return () => {}

  const observers = []
  const observe = (type, callback) => {
    try {
      const observer = new PerformanceObserver(callback)
      observer.observe({ type, buffered: true })
      observers.push(observer)
    } catch {
      // Unsupported metric in this browser.
    }
  }

  observe('paint', (list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name === 'first-contentful-paint') recordMetric('FCP', entry.startTime)
    })
  })

  observe('largest-contentful-paint', (list) => {
    const entries = list.getEntries()
    const last = entries[entries.length - 1]
    if (last) recordMetric('LCP', last.startTime)
  })

  let clsValue = 0
  observe('layout-shift', (list) => {
    list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) clsValue += entry.value
    })
    recordMetric('CLS', clsValue)
  })

  let maxInteraction = 0
  observe('event', (list) => {
    list.getEntries().forEach((entry) => {
      if (entry.interactionId && entry.duration > maxInteraction) {
        maxInteraction = entry.duration
      }
    })
    if (maxInteraction > 0) recordMetric('INP', maxInteraction)
  })

  const flushFinalMetrics = () => {
    const lcp = observedMetrics.get('LCP')
    if (lcp) scheduleMetricSend(lcp)
    const cls = observedMetrics.get('CLS')
    if (cls) scheduleMetricSend(cls)
  }

  window.addEventListener('pagehide', flushFinalMetrics)

  return () => {
    observers.forEach((observer) => observer.disconnect())
    window.removeEventListener('pagehide', flushFinalMetrics)
  }
}
