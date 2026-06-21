import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const DIST_APP = path.join(ROOT, 'dist', 'server', 'app')
const PUBLIC_DIR = path.join(ROOT, 'public')
const BASE_URL = process.env.SEO_BASE_URL?.replace(/\/$/, '') || ''
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.quickutils.page').replace(/\/$/, '')

const REQUIRED_PATHS = [
  '/',
  '/about',
  '/categories',
  '/blog',
  '/jobs',
  '/contact',
  '/privacy',
  '/tool/photo-kb-reducer',
  '/tool/cutoff-calculator',
]

const BAD_LOADING_TEXT = [
  'Loading article',
  'Loading tool',
  'Loading government tool',
]

const EXPECT_JSON_LD = new Set(['/', '/blog', '/jobs', '/contact', '/privacy'])

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(fullPath, output)
    else output.push(fullPath)
  }
  return output
}

function decodeEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

function stripHtml(html = '') {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function attr(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0] || ''
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))
  return decodeEntities(match?.[1] || '')
}

function titleOf(html) {
  return decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '')
}

function metaDescriptionOf(html) {
  return attr(html, /<meta[^>]+name=["']description["'][^>]*>/i, 'content')
}

function canonicalOf(html) {
  return attr(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'href')
}

function robotsOf(html) {
  return attr(html, /<meta[^>]+name=["']robots["'][^>]*>/i, 'content')
}

function h1Count(html) {
  return (html.match(/<h1\b/gi) || []).length
}

function jsonLdCount(html) {
  return (html.match(/type=["']application\/ld\+json["']/gi) || []).length
}

function tagCount(html, pattern) {
  return (html.match(pattern) || []).length
}

function routeCandidates(routePath) {
  const parts = routePath === '/' ? [] : routePath.replace(/^\/|\/$/g, '').split('/')
  const candidates = []
  const prefixes = [DIST_APP, path.join(DIST_APP, '(public)')]
  for (const prefix of prefixes) {
    if (parts.length === 0) candidates.push(path.join(prefix, 'index.html'))
    candidates.push(path.join(prefix, ...parts, 'page.html'))
    candidates.push(path.join(prefix, `${parts.join(path.sep)}.html`))
    if (parts.length === 0) candidates.push(path.join(prefix, 'page.html'))
  }
  return candidates
}

function readBuiltHtml(routePath) {
  for (const candidate of routeCandidates(routePath)) {
    if (fs.existsSync(candidate)) {
      return { html: fs.readFileSync(candidate, 'utf8'), source: candidate }
    }
  }
  return null
}

async function readHtml(routePath) {
  if (BASE_URL) {
    const response = await fetch(`${BASE_URL}${routePath}`)
    const html = await response.text()
    return { status: response.status, html, source: `${BASE_URL}${routePath}` }
  }

  const built = readBuiltHtml(routePath)
  if (!built) return null
  return { status: 200, ...built }
}

function readSitemap() {
  const candidates = [
    path.join(DIST_APP, 'sitemap.xml.body'),
    path.join(DIST_APP, 'sitemap.xml', 'body'),
    path.join(DIST_APP, 'sitemap.xml', 'route.body'),
    path.join(PUBLIC_DIR, 'sitemap.xml'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8')
  }
  return ''
}

function parseSitemapUrls(xml = '') {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeEntities(match[1]))
}

function discoverSamplesFromSitemap(xml = '') {
  const urls = parseSitemapUrls(xml)
  const blog = urls.find((url) => url.includes('/blog/') && !url.endsWith('/blog'))
  const job = urls.find((url) => url.includes('/jobs/') && !url.endsWith('/jobs'))
  return [blog, job].filter(Boolean).map((url) => new URL(url).pathname)
}

function discoverSamplesFromBuild() {
  const samples = []
  const blogDir = path.join(DIST_APP, 'blog')
  if (fs.existsSync(blogDir)) {
    const article = fs.readdirSync(blogDir).find((file) => {
      if (!file.endsWith('.html')) return false
      const html = fs.readFileSync(path.join(blogDir, file), 'utf8')
      return !html.includes('__next_error__') && !html.includes('Article not found')
    })
    if (article) samples.push(`/blog/${article.replace(/\.html$/, '')}`)
  }
  const jobsDir = path.join(DIST_APP, 'jobs')
  if (fs.existsSync(jobsDir)) {
    const job = fs.readdirSync(jobsDir).find((file) => {
      if (!file.endsWith('.html')) return false
      const html = fs.readFileSync(path.join(jobsDir, file), 'utf8')
      return !html.includes('__next_error__') && !html.includes('Job not found')
    })
    if (job) samples.push(`/jobs/${job.replace(/\.html$/, '')}`)
  }
  return samples
}

function inspectPage(routePath, html, status) {
  const bodyText = stripHtml(html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html)
  const title = titleOf(html)
  const description = metaDescriptionOf(html)
  const canonical = canonicalOf(html)
  const robots = robotsOf(html)
  const h1s = h1Count(html)
  const noindex = /noindex/i.test(robots)
  const issues = []
  const titleTags = tagCount(html, /<title\b/gi)
  const descriptionTags = tagCount(html, /<meta[^>]+name=["']description["']/gi)
  const canonicalTags = tagCount(html, /<link[^>]+rel=["']canonical["']/gi)

  if (status < 200 || status >= 400) issues.push(`bad status ${status}`)
  if (!title) issues.push('missing title')
  if (!description) issues.push('missing meta description')
  if (!canonical) issues.push('missing canonical')
  if (titleTags > 1) issues.push(`${titleTags} title tags`)
  if (descriptionTags > 1) issues.push(`${descriptionTags} meta descriptions`)
  if (canonicalTags > 1) issues.push(`${canonicalTags} canonicals`)
  if (h1s !== 1) issues.push(`${h1s} H1s`)
  if (bodyText.length < (noindex ? 120 : 300)) issues.push(`thin body (${bodyText.length} chars)`)

  for (const phrase of BAD_LOADING_TEXT) {
    if (html.includes(phrase)) issues.push(`contains "${phrase}"`)
  }

  if (EXPECT_JSON_LD.has(routePath) && !noindex && jsonLdCount(html) === 0) {
    issues.push('missing JSON-LD')
  }
  if (routePath.startsWith('/tool/') && !noindex && !/"@type":"SoftwareApplication"|\"@type\"\s*:\s*\"SoftwareApplication\"/.test(html)) {
    issues.push('missing SoftwareApplication schema')
  }
  if (routePath.startsWith('/blog/') && !noindex && !/"@type":"Article"|\"@type\"\s*:\s*\"Article\"|\"@type\"\s*:\s*\"BlogPosting\"/.test(html)) {
    issues.push('missing Article schema')
  }
  if (routePath.startsWith('/jobs/') && !noindex && !/"@type":"JobPosting"|\"@type\"\s*:\s*\"JobPosting\"/.test(html)) {
    issues.push('missing JobPosting schema for indexable job')
  }

  return { routePath, status, title, description, canonical, robots, h1s, bodyLength: bodyText.length, noindex, issues }
}

function checkNoindexNotInSitemap(results, sitemapUrls) {
  const issues = []
  for (const result of results) {
    if (!result.noindex) continue
    const absolute = `${SITE_URL}${result.routePath === '/' ? '' : result.routePath}`
    if (sitemapUrls.includes(absolute)) {
      issues.push(`noindex URL in sitemap: ${absolute}`)
    }
  }
  return issues
}

function checkDuplicates(results, field) {
  const seen = new Map()
  const issues = []
  for (const result of results) {
    const value = result[field]
    if (!value || result.noindex) continue
    if (seen.has(value)) issues.push(`duplicate ${field}: ${result.routePath} and ${seen.get(value)}`)
    else seen.set(value, result.routePath)
  }
  return issues
}

async function main() {
  if (!BASE_URL && !fs.existsSync(DIST_APP)) {
    console.error('SEO validation requires a production build in dist/ or SEO_BASE_URL.')
    process.exit(1)
  }

  const sitemap = readSitemap()
  const sitemapUrls = parseSitemapUrls(sitemap)
  const samplePaths = [...new Set([...REQUIRED_PATHS, ...discoverSamplesFromSitemap(sitemap), ...discoverSamplesFromBuild()])]
  const results = []
  const skipped = []
  const failures = []

  for (const routePath of samplePaths) {
    const page = await readHtml(routePath)
    if (!page) {
      skipped.push(routePath)
      continue
    }
    const result = inspectPage(routePath, page.html, page.status)
    results.push(result)
    if (result.issues.length > 0) {
      failures.push(`${routePath}: ${result.issues.join('; ')}`)
    }
  }

  failures.push(...checkNoindexNotInSitemap(results, sitemapUrls))
  failures.push(...checkDuplicates(results, 'title'))
  failures.push(...checkDuplicates(results, 'description'))

  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt')
  const adsPath = path.join(PUBLIC_DIR, 'ads.txt')
  if (!fs.existsSync(robotsPath)) failures.push('missing public/robots.txt')
  else {
    const robots = fs.readFileSync(robotsPath, 'utf8')
    if (!/Sitemap:\s*https:\/\/www\.quickutils\.page\/sitemap\.xml/i.test(robots)) failures.push('robots.txt missing sitemap line')
    if (/Disallow:\s*\/_next/i.test(robots)) failures.push('robots.txt blocks rendering assets')
  }
  if (!fs.existsSync(adsPath)) failures.push('missing public/ads.txt')
  else if (/pub-0000000000000000|ca-pub-0000000000000000/i.test(fs.readFileSync(adsPath, 'utf8'))) {
    failures.push('ads.txt contains a fake placeholder publisher ID')
  }

  console.table(results.map((result) => ({
    url: result.routePath,
    status: result.status,
    h1: result.h1s,
    body: result.bodyLength,
    robots: result.robots || 'default',
    issue: result.issues.join('; ') || 'ok',
  })))

  if (skipped.length) {
    console.warn(`Skipped without SEO_BASE_URL or static HTML: ${skipped.join(', ')}`)
  }

  if (failures.length) {
    console.error('\nSEO validation failed:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exit(1)
  }

  console.log('SEO validation passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
