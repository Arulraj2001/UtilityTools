#!/usr/bin/env node

/*
  Generate sitemap.xml using Supabase data
*/

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SITE_SUPABASE_URL

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SITE_SUPABASE_ANON_KEY

const SITE_URL = (
  process.env.SITE_URL ||
  process.env.VERCEL_URL ||
  process.env.PUBLIC_SITE_URL ||
  'https://quickutils.page'
).replace(/\/$/, '')

async function fetchTable(supabase, table, cols = '*', filter = null) {
  try {
    let q = supabase.from(table).select(cols)

    if (filter && typeof filter === 'function') {
      q = filter(q)
    }

    const res = await q

    if (res.error) {
      console.warn(`Skipping table ${table}:`, res.error.message || res.error)
      return []
    }

    return res.data || []
  } catch (err) {
    console.warn(`Error fetching ${table}:`, err.message || err)
    return []
  }
}

function buildUrl(loc) {
  return `${SITE_URL}${loc.startsWith('/') ? '' : '/'}${loc}`
}

function toXmlUrl({
  loc,
  lastmod,
  changefreq = 'weekly',
  priority = '0.5',
}) {
  let out = '  <url>\n'

  out += `    <loc>${loc}</loc>\n`

  if (lastmod) {
    out += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`
  }

  out += `    <changefreq>${changefreq}</changefreq>\n`
  out += `    <priority>${priority}</priority>\n`
  out += '  </url>\n'

  return out
}

async function main() {
  console.log('Generating sitemap...')

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      'Supabase credentials not found in env. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_ equivalents).'
    )

    process.exitCode = 1
    return
  }

  console.log('Using Supabase URL:', SUPABASE_URL)
  console.log('Using Site URL:', SITE_URL)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: {
      transport: ws,
    },
  })

  // Fetch content
  const [tools, categories, posts] = await Promise.all([
    fetchTable(
      supabase,
      'tools',
      'slug, updated_at, is_featured, status',
      (q) => q.eq('status', 'published')
    ),

    fetchTable(
      supabase,
      'categories',
      'slug, updated_at'
    ),

    fetchTable(
      supabase,
      'blog_posts',
      'slug, updated_at, status',
      (q) => q.eq('status', 'published')
    ),
  ])

  // Optional workflows
  const workflows = await fetchTable(
    supabase,
    'workflow_pages',
    'slug, updated_at',
    (q) => q.eq('status', 'published')
  )

  console.log('Tools loaded:', tools.length)
  console.log('Categories loaded:', categories.length)
  console.log('Blog posts loaded:', posts.length)
  console.log('Workflow pages loaded:', workflows.length)

  const urls = new Map()

  // Static pages
  urls.set('/', {
    changefreq: 'daily',
    priority: '1.0',
  })

  urls.set('/tools', {
    changefreq: 'weekly',
    priority: '0.9',
  })

  urls.set('/categories', {
    changefreq: 'weekly',
    priority: '0.8',
  })

  urls.set('/blog', {
    changefreq: 'weekly',
    priority: '0.7',
  })

  // Tools
  for (const t of tools) {
    if (!t?.slug) continue

    const loc = `/tool/${encodeURIComponent(t.slug)}`

    urls.set(loc, {
      changefreq: 'weekly',
      priority: t.is_featured ? '0.9' : '0.85',
      lastmod: t.updated_at || null,
    })
  }

  // Categories
  for (const c of categories) {
    if (!c?.slug) continue

    const loc = `/category/${encodeURIComponent(c.slug)}`

    urls.set(loc, {
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: c.updated_at || null,
    })
  }

  // Blog posts
  for (const p of posts) {
    if (!p?.slug) continue

    const loc = `/blog/${encodeURIComponent(p.slug)}`

    urls.set(loc, {
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: p.updated_at || null,
    })
  }

  // Workflow pages
  for (const w of workflows) {
    if (!w?.slug) continue

    const loc = `/workflow/${encodeURIComponent(w.slug)}`

    urls.set(loc, {
      changefreq: 'weekly',
      priority: '0.75',
      lastmod: w.updated_at || null,
    })
  }

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'

  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const [loc, meta] of urls) {
    const full = buildUrl(loc === '/' ? '' : loc)

    xml += toXmlUrl({
      loc: full,
      lastmod: meta.lastmod,
      changefreq: meta.changefreq,
      priority: meta.priority,
    })
  }

  xml += '</urlset>\n'

  // Write sitemap
  const publicDir = path.resolve(__dirname, '..', 'public')

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml')

  fs.writeFileSync(sitemapPath, xml, 'utf8')

  console.log('Sitemap written successfully:')
  console.log(sitemapPath)

  console.log('Total URLs:', urls.size)

  // Update robots.txt
  const robotsPath = path.join(publicDir, 'robots.txt')

  let robots = ''

  if (fs.existsSync(robotsPath)) {
    robots = fs.readFileSync(robotsPath, 'utf8')
  }

  const sitemapLine = `Sitemap: ${SITE_URL}/sitemap.xml`

  if (!robots.includes(sitemapLine)) {
    if (robots && !robots.endsWith('\n')) {
      robots += '\n'
    }

    robots += sitemapLine + '\n'

    fs.writeFileSync(robotsPath, robots, 'utf8')

    console.log('robots.txt updated')
  } else {
    console.log('robots.txt already contains sitemap')
  }
}

main().catch((err) => {
  console.error('Failed to generate sitemap:', err)
  process.exitCode = 1
})