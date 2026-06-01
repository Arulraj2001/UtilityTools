import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Tool Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'icon', label: 'Icon Name' },
  { key: 'description', label: 'Short Description' },
  { key: 'long_description', label: 'Long Description (HTML)' },
  { key: '_category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'sort_order', label: 'Sort Order' },
  { key: 'is_featured', label: 'Featured' },
  { key: 'is_trending', label: 'Trending' },
  { key: 'seo_title', label: 'SEO Title' },
  { key: 'seo_description', label: 'SEO Description' },
  { key: 'seo_keywords', label: 'SEO Keywords' },
  { key: 'primary_keywords', label: 'Primary Keywords' },
  { key: 'secondary_keywords', label: 'Secondary Keywords' },
  { key: 'featured_image', label: 'Featured Image URL' },
  { key: 'seo_content', label: 'SEO Content (HTML)' },
  { key: 'faq', label: 'FAQ JSON' },
]

const TEMPLATE_COLUMNS = EXPORT_COLUMNS.map((column) => column.label)

const serialize = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const buildRows = (tools) =>
  tools.map((tool) => {
    const row = {}
    EXPORT_COLUMNS.forEach(({ key, label }) => {
      row[label] = key === '_category'
        ? serialize(tool.categories?.name ?? tool.category_name ?? '')
        : serialize(tool[key])
    })
    return row
  })

const writeXlsx = (rows, filename) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 30 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Tool SEO')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename)
}

const writeCsv = (rows, filename) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

const writeJson = (tools, filename) => {
  const data = tools.map((tool) => ({
    tool_name: tool.name ?? '',
    slug: tool.slug ?? '',
    icon_name: tool.icon ?? '',
    short_description: tool.description ?? '',
    long_description: tool.long_description ?? '',
    category: tool.categories?.name ?? tool.category_name ?? '',
    status: tool.status ?? '',
    sort_order: tool.sort_order ?? 0,
    featured: !!tool.is_featured,
    trending: !!tool.is_trending,
    seo_title: tool.seo_title ?? '',
    seo_description: tool.seo_description ?? '',
    seo_keywords: tool.seo_keywords ?? '',
    primary_keywords: tool.primary_keywords ?? '',
    secondary_keywords: tool.secondary_keywords ?? '',
    featured_image_url: tool.featured_image ?? '',
    seo_content: tool.seo_content ?? '',
    faq_json: tool.faq ?? [],
  }))
  saveAs(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

const escapeAttr = (value) => String(value ?? '').replace(/"/g, '&quot;')

const writeHtml = (tools, filename) => {
  const articles = tools.map((tool) => `
  <article data-slug="${escapeAttr(tool.slug)}">
    <header>
      <h1>${tool.name ?? ''}</h1>
      ${tool.seo_title ? `<p class="seo-title">${tool.seo_title}</p>` : ''}
      ${tool.seo_description ? `<p class="seo-description">${tool.seo_description}</p>` : ''}
    </header>
    <div class="seo-content">${tool.seo_content ?? ''}</div>
  </article>`).join('\n')

  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool SEO Export</title>
</head>
<body>
  <main>${articles}
  </main>
</body>
</html>`

  saveAs(new Blob([doc], { type: 'text/html;charset=utf-8' }), filename)
}

export const exportToolSeoToExcel = (tools, filename = 'tool-seo.xlsx') => writeXlsx(buildRows(tools), filename)
export const exportToolSeoToCsv = (tools, filename = 'tool-seo.csv') => writeCsv(buildRows(tools), filename)
export const exportToolSeoToJson = (tools, filename = 'tool-seo.json') => writeJson(tools, filename)
export const exportToolSeoToHtml = (tools, filename = 'tool-seo.html') => writeHtml(tools, filename)

export const downloadToolSeoTemplate = () => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS])
  ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 28 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'tool-seo-import-template.xlsx')
}
