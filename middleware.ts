const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

const STATIC_ROUTES = new Set([
  '/',
  '/tools',
  '/categories',
  '/blog',
  '/jobs',
  '/workflow',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/cookie-policy',
  '/editorial-policy',
  '/team',
  '/methodology',
  '/corrections-policy',
  '/accessibility',
  '/job-sources-policy',
  '/login',
])

const STATIC_PUBLIC_FILES = new Set([
  '/ads.txt',
  '/robots.txt',
  '/sitemap.xml',
  '/404.html',
  '/manifest.json',
  '/browserconfig.xml',
  '/BingSiteAuth.xml',
  '/favicon.ico',
  '/logo.avif',
  '/logo.png',
  '/logo.svg',
  '/logo.webp',
  '/preview.png',
  '/preview1.png',
  '/pdf.worker.min.mjs',
])

const STATIC_BLOG_SLUGS = new Set([
  'how-to-calculate-sgpa',
  'how-to-calculate-percentage-of-marks',
  'how-to-use-fraction-calculator',
  'how-to-compress-images',
  'how-to-resize-images',
  'pdf-merge-vs-pdf-compress',
  'word-counter-guide',
  'json-formatter-guide',
  'base64-encoding-explained',
])

const STATIC_AUTHOR_SLUGS = new Set(['sanjay-krishnan'])
const RETIRED_TOOL_SLUGS = new Set(['pdf-to-word'])

export const config = {
  matcher: [
    '/((?!api|assets|fonts|css).*)',
  ],
}

const isCleanSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)

const notFoundHtml = (path: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>404 Not Found - QuickUtils</title>
    <meta name="description" content="This QuickUtils page does not exist or has been removed." />
  </head>
  <body>
    <main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;text-align:center;color:#0f172a;background:#f8fafc;">
      <section style="max-width:560px;">
        <p style="font-size:72px;line-height:1;margin:0 0 16px;color:#94a3b8;font-weight:300;">404</p>
        <h1 style="font-size:32px;margin:0 0 12px;">Page not found</h1>
        <p style="color:#475569;line-height:1.7;">${path} does not exist, has been removed, or is not available for indexing.</p>
        <p><a href="/" style="color:#2563eb;font-weight:600;">Go to QuickUtils homepage</a></p>
      </section>
    </main>
  </body>
</html>`

const respond404 = (pathname: string) => new Response(notFoundHtml(pathname), {
  status: 404,
  statusText: 'Not Found',
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow',
  },
})

const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const fetchExists = async (table: string, filters: Record<string, string>) => {
  if (!hasSupabaseConfig()) return true

  const params = new URLSearchParams({ select: 'id', limit: '1' })
  Object.entries(filters).forEach(([key, value]) => {
    params.set(key, `eq.${value}`)
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1800)

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    })

    if (!response.ok) return true
    const rows = await response.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return true
  } finally {
    clearTimeout(timeout)
  }
}

const isValidDynamicRoute = async (segments: string[]) => {
  const [section, maybeSecond, maybeThird] = segments

  if (section === 'author' && segments.length === 2) {
    return STATIC_AUTHOR_SLUGS.has(maybeSecond)
  }

  if (section === 'tool' && segments.length === 2) {
    if (RETIRED_TOOL_SLUGS.has(maybeSecond)) return false
    return fetchExists('tools', { slug: maybeSecond, status: 'published' })
  }

  if (section === 'category' && segments.length === 2) {
    return fetchExists('categories', { slug: maybeSecond })
  }

  if (section === 'blog' && segments.length === 2) {
    if (STATIC_BLOG_SLUGS.has(maybeSecond)) return true
    return fetchExists('blog_posts', { slug: maybeSecond, status: 'published' })
  }

  if (section === 'workflow' && segments.length === 2) {
    return fetchExists('workflow_pages', { slug: maybeSecond, status: 'published' })
  }

  if (section === 'jobs' && maybeSecond === 'category' && segments.length === 3) {
    return fetchExists('job_categories', { slug: maybeThird })
  }

  if (section === 'jobs' && segments.length === 2) {
    return fetchExists('jobs', { slug: maybeSecond, status: 'published' })
  }

  return false
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (STATIC_PUBLIC_FILES.has(pathname)) return
  if (/^\/favicon-\d+x\d+\.png$/.test(pathname)) return
  if (pathname.includes('.')) return respond404(pathname)

  if (STATIC_ROUTES.has(pathname)) return
  if (pathname.startsWith('/admin')) return

  const segments = pathname.split('/').filter(Boolean)
  if (segments.some((segment) => !isCleanSlug(segment))) {
    return respond404(pathname)
  }

  const isValid = await isValidDynamicRoute(segments)
  if (!isValid) return respond404(pathname)
}

