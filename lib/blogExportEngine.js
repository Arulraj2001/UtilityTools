import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Canonical column order matching the import format
const EXPORT_COLUMNS = [
  { key: 'title',               label: 'Title' },
  { key: 'slug',                label: 'Slug' },
  { key: '_category',           label: 'Category' },
  { key: 'excerpt',             label: 'Excerpt' },
  { key: 'author_name',         label: 'Author Name' },
  { key: 'author_title',        label: 'Author Title' },
  { key: 'author_bio',          label: 'Author Bio' },
  { key: 'author_image',        label: 'Author Image' },
  { key: 'seo_title',           label: 'SEO Title' },
  { key: 'seo_description',     label: 'SEO Description' },
  { key: 'seo_keywords',        label: 'SEO Keywords' },
  { key: 'og_title',            label: 'Open Graph Title' },
  { key: 'og_description',      label: 'Open Graph Description' },
  { key: 'og_image',            label: 'OG Image' },
  { key: 'twitter_title',       label: 'Twitter Title' },
  { key: 'twitter_description', label: 'Twitter Description' },
  { key: 'canonical_url',       label: 'Canonical URL' },
  { key: 'featured_image',      label: 'Featured Image URL' },
  { key: 'schema_type',         label: 'Schema Type' },
  { key: 'meta_robots',         label: 'Meta Robots' },
  { key: 'faq_items',           label: 'FAQ JSON' },
  { key: 'content',             label: 'Content HTML' },
  { key: 'status',              label: 'Status' },
  { key: 'featured',            label: 'Featured' },
  { key: 'tags',                label: 'Tags' },
  { key: 'reading_time',        label: 'Reading Time' },
  { key: 'created_at',          label: 'Created At' },
]

const TEMPLATE_COLUMNS = [
  'Title','Slug','Category','Excerpt',
  'Author Name','Author Title','Author Bio',
  'SEO Title','SEO Description','SEO Keywords',
  'Open Graph Title','Open Graph Description',
  'Twitter Title','Twitter Description',
  'Canonical URL','Featured Image URL',
  'Schema Type','Meta Robots','FAQ JSON',
  'Content HTML','Status','Featured','Tags',
]

// ── Serialisation helpers ─────────────────────────────────────────────────────

const serialize = (val) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (Array.isArray(val) || (typeof val === 'object')) return JSON.stringify(val)
  return String(val)
}

const buildRows = (posts) =>
  posts.map((post) => {
    const row = {}
    EXPORT_COLUMNS.forEach(({ key, label }) => {
      if (key === '_category') {
        row[label] = post.blog_categories?.name ?? post.category ?? ''
      } else {
        row[label] = serialize(post[key])
      }
    })
    return row
  })

// ── Writers ───────────────────────────────────────────────────────────────────

const writeXlsx = (rows, filename) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto column widths (rough estimate)
  const wscols = Object.keys(rows[0] ?? {}).map(() => ({ wch: 30 }))
  ws['!cols'] = wscols

  XLSX.utils.book_append_sheet(wb, ws, 'Blog Posts')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename)
}

const writeCsv = (rows, filename) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

const writeJson = (posts, filename) => {
  const data = posts.map((p) => {
    const clean = { ...p }
    if (clean.blog_categories) {
      clean.category = clean.blog_categories.name
      delete clean.blog_categories
    }
    return clean
  })
  saveAs(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    filename
  )
}

const writeHtml = (posts, filename) => {
  const articles = posts
    .map(
      (p) => `
  <article data-slug="${p.slug ?? ''}" data-status="${p.status ?? ''}">
    <header>
      <h1>${p.title ?? ''}</h1>
      ${p.excerpt ? `<p class="excerpt">${p.excerpt}</p>` : ''}
      ${p.featured_image ? `<img src="${p.featured_image}" alt="${p.title ?? ''}" />` : ''}
    </header>
    <div class="content">${p.content ?? ''}</div>
    <footer>
      <p>Author: ${p.author_name ?? ''}</p>
      <p>Category: ${p.blog_categories?.name ?? p.category ?? ''}</p>
      <p>Status: ${p.status ?? ''}</p>
    </footer>
  </article>`
    )
    .join('\n')

  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Posts Export</title>
</head>
<body>
  <main>${articles}
  </main>
</body>
</html>`

  saveAs(new Blob([doc], { type: 'text/html;charset=utf-8' }), filename)
}

// ── Public API ────────────────────────────────────────────────────────────────

export const exportToExcel = (posts, filename = 'blog-posts.xlsx') =>
  writeXlsx(buildRows(posts), filename)

export const exportToCsv = (posts, filename = 'blog-posts.csv') =>
  writeCsv(buildRows(posts), filename)

export const exportToJson = (posts, filename = 'blog-posts.json') =>
  writeJson(posts, filename)

export const exportToHtml = (posts, filename = 'blog-posts.html') =>
  writeHtml(posts, filename)

// Download a blank import template (.xlsx)
export const downloadTemplate = () => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS])
  ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 28 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'blog-import-template.xlsx')
}
