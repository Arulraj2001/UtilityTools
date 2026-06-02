const prefetched = new Set()

const canPrefetch = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection?.saveData) return false
  if (connection?.effectiveType && /(^2g$|slow-2g)/i.test(connection.effectiveType)) return false
  return true
}

const prefetchModule = (key, loader) => {
  if (!canPrefetch() || prefetched.has(key)) return
  prefetched.add(key)
  loader().catch(() => {
    prefetched.delete(key)
  })
}

const prefetchForPath = (pathname = '') => {
  if (pathname.startsWith('/tool/')) {
    prefetchModule('tool-page', () => import('@/pages/ToolPage'))
  } else if (pathname.startsWith('/blog/')) {
    prefetchModule('blog-post-page', () => import('@/pages/BlogPostPage'))
  } else if (pathname.startsWith('/jobs/')) {
    prefetchModule('job-detail-page', () => import('@/pages/jobs/JobDetailPage'))
  }
}

const getAnchorPath = (target) => {
  const anchor = target?.closest?.('a[href]')
  if (!anchor) return ''
  try {
    const url = new URL(anchor.href, window.location.origin)
    if (url.origin !== window.location.origin) return ''
    return url.pathname
  } catch {
    return ''
  }
}

export const setupRoutePrefetch = () => {
  if (!canPrefetch()) return () => {}

  const onPointer = (event) => {
    const path = getAnchorPath(event.target)
    if (path) prefetchForPath(path)
  }

  document.addEventListener('pointerenter', onPointer, { capture: true, passive: true })
  document.addEventListener('touchstart', onPointer, { capture: true, passive: true })

  const idlePrefetch = () => {
    window.setTimeout(() => {
      prefetchModule('blog-post-page', () => import('@/pages/BlogPostPage'))
      prefetchModule('job-detail-page', () => import('@/pages/jobs/JobDetailPage'))
    }, 8000)
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(idlePrefetch, { timeout: 10000 })
  } else {
    window.setTimeout(idlePrefetch, 10000)
  }

  return () => {
    document.removeEventListener('pointerenter', onPointer, { capture: true })
    document.removeEventListener('touchstart', onPointer, { capture: true })
  }
}
