#!/usr/bin/env node

/*
  Generate sitemap.xml using Supabase data
*/

import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { STATIC_BLOG_POSTS } from '../src/lib/staticBlogPosts.js'
import { PREBUILT_TOOLS } from '../src/lib/toolsData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOMEPAGE_DATA_PATH = path.resolve(__dirname, '..', 'public', 'homepage-data.json')

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
  process.env.PUBLIC_SITE_URL ||
  'https://www.quickutils.page'
).replace(/\/$/, '')

const RETIRED_TOOL_SLUGS = new Set(['pdf-to-word'])

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

function buildPrebuiltFallbackContent() {
  const tools = PREBUILT_TOOLS
    .filter((tool) => tool?.status === 'published' && !RETIRED_TOOL_SLUGS.has(tool.slug))
    .map((tool) => ({
      slug: tool.slug,
      updated_at: tool.updated_at || tool.created_at || null,
      is_featured: Boolean(tool.is_featured),
      status: tool.status,
      category_slug: tool.category_slug,
    }))

  const categories = [...new Set(tools.map((tool) => tool.category_slug).filter(Boolean))]
    .map((slug) => ({ slug, updated_at: null }))

  return { tools, categories }
}

function loadLocalFallbackContent() {
  const prebuilt = buildPrebuiltFallbackContent()

  if (!fs.existsSync(HOMEPAGE_DATA_PATH)) return prebuilt

  try {
    const snapshot = JSON.parse(fs.readFileSync(HOMEPAGE_DATA_PATH, 'utf8'))
    const tools = Array.isArray(snapshot.tools)
      ? snapshot.tools
        .filter((tool) => tool?.slug && !RETIRED_TOOL_SLUGS.has(tool.slug))
        .map((tool) => ({
          slug: tool.slug,
          updated_at: tool.updated_at || tool.created_at || null,
          is_featured: Boolean(tool.is_featured),
          status: tool.status || 'published',
          category_slug: tool.category_slug || tool.category_id || null,
        }))
      : []
    const categories = Array.isArray(snapshot.categories)
      ? snapshot.categories
        .filter((category) => category?.slug)
        .map((category) => ({
          slug: category.slug,
          updated_at: category.updated_at || null,
        }))
      : []

    return {
      tools: tools.length ? tools : prebuilt.tools,
      categories: categories.length ? categories : prebuilt.categories,
    }
  } catch (err) {
    console.warn('Could not read homepage-data fallback:', err.message || err)
    return prebuilt
  }
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

  let tools = []
  let categories = []
  let posts = []
  let workflows = []
  let jobs = []

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      'Supabase credentials not found in env. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_ equivalents).'
    )

    console.warn('Supabase credentials not found; generating sitemap from local fallback content.')
  } else {

  console.log('Using Supabase URL:', SUPABASE_URL)
  console.log('Using Site URL:', SITE_URL)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: {
      transport: ws,
    },
  })

  // Fetch content
  ;[tools, categories, posts] = await Promise.all([
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
  workflows = await fetchTable(
    supabase,
    'workflow_pages',
    'slug, updated_at',
    (q) => q.eq('status', 'published')
  )

  // Jobs (published only)
  jobs = await fetchTable(
    supabase,
    'jobs',
    'slug, updated_at, status, last_date',
    (q) => q.eq('status', 'published')
  )
  }

  const fallbackContent = loadLocalFallbackContent()

  if (!tools.length && fallbackContent.tools.length) {
    console.warn(`Using local fallback tools for sitemap (${fallbackContent.tools.length} tools).`)
    tools = fallbackContent.tools
  }

  if (!categories.length && fallbackContent.categories.length) {
    console.warn(`Using local fallback categories for sitemap (${fallbackContent.categories.length} categories).`)
    categories = fallbackContent.categories
  }

  console.log('Tools loaded:', tools.length)
  console.log('Categories loaded:', categories.length)
  console.log('Blog posts loaded:', posts.length)
  console.log('Workflow pages loaded:', workflows.length)
  console.log('Jobs loaded:', jobs.length)

  const urls = new Map()

  // Static pages — lastmod set to a reasonable baseline for policy pages
  // For dynamic listing pages, lastmod is omitted (changes on every deploy)
  const POLICY_LASTMOD = '2026-06-01T00:00:00Z' // Project launch baseline

  urls.set('/', {
    changefreq: 'daily',
    priority: '1.0',
  })

  urls.set('/tools', {
    changefreq: 'daily',
    priority: '0.9',
  })

  urls.set('/categories', {
    changefreq: 'weekly',
    priority: '0.8',
  })

  urls.set('/blog', {
    changefreq: 'daily',
    priority: '0.7',
  })

  urls.set('/jobs', {
    changefreq: 'daily',
    priority: '0.8',
  })

  urls.set('/about', {
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/contact', {
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/privacy', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/terms', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/disclaimer', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/editorial-policy', {
    changefreq: 'yearly',
    priority: '0.5',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/cookie-policy', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/team', {
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/author/arulraj-s', {
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/methodology', {
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/corrections-policy', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/accessibility', {
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/job-sources-policy', {
    changefreq: 'yearly',
    priority: '0.5',
    lastmod: POLICY_LASTMOD,
  })

  urls.set('/workflow', {
    changefreq: 'weekly',
    priority: '0.75',
  })

  // Tools
  for (const t of tools) {
    if (!t?.slug) continue
    if (RETIRED_TOOL_SLUGS.has(t.slug)) continue

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
  for (const p of STATIC_BLOG_POSTS) {
    if (!p?.slug) continue

    const loc = `/blog/${encodeURIComponent(p.slug)}`

    urls.set(loc, {
      changefreq: 'monthly',
      priority: '0.75',
      lastmod: p.updated_at || null,
    })
  }

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

  // Jobs (with enhanced priority logic — skip expired jobs >90 days)
  for (const j of jobs) {
    if (!j?.slug) continue

    // Skip expired jobs from sitemap to save crawl budget
    // These pages still exist but get noindex via the JobSEO component
    if (j.last_date) {
      const deadline = new Date(j.last_date)
      if (!Number.isNaN(deadline.getTime())) {
        const daysSinceExpiry = Math.floor((Date.now() - deadline.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceExpiry > 90) continue
      }
    }

    const loc = `/jobs/${encodeURIComponent(j.slug)}`

    // Dynamic priority based on job attributes:
    // - Featured jobs: 0.85
    // - Recently updated (< 7 days): 0.75
    // - Standard jobs: 0.65
    let priority = '0.65'
    const lastMod = j.updated_at || j.last_date
    
    if (j.featured) {
      priority = '0.85'
    } else if (lastMod) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lastMod).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceUpdate < 7) {
        priority = '0.75'
      } else if (daysSinceUpdate < 14) {
        priority = '0.70'
      }
    }

    // Change frequency: more frequent for recently updated/featured
    let changefreq = 'weekly'
    if (j.featured) {
      changefreq = 'daily'
    } else if (lastMod) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lastMod).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceUpdate < 3) {
        changefreq = 'daily'
      } else if (daysSinceUpdate < 14) {
        changefreq = 'weekly'
      }
    }

    urls.set(loc, {
      changefreq,
      priority,
      lastmod: lastMod,
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
