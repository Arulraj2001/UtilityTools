import DOMPurify from 'dompurify'

export const ALLOWED_HTML_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'a',
  'strong',
  'em',
  'blockquote',
  'code',
]

const ALLOWED_HTML_ATTR = ['href', 'title', 'target', 'rel']
const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i
let hooksInstalled = false

const installHooks = () => {
  if (hooksInstalled) return
  hooksInstalled = true

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    Array.from(node.attributes || []).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) {
        node.removeAttribute(attribute.name)
      }
    })

    if (node.tagName?.toLowerCase() !== 'a') return

    const href = node.getAttribute('href')
    if (href && !SAFE_HREF_PATTERN.test(href)) {
      node.removeAttribute('href')
    }

    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

export const sanitizeHtml = (html = '') => {
  if (!html) return ''
  if (typeof window === 'undefined') return String(html)
  installHooks()

  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: ALLOWED_HTML_TAGS,
    ALLOWED_ATTR: ALLOWED_HTML_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  })
}

export const sanitizeHtmlFields = (payload = {}, fields = []) => {
  if (!payload || typeof payload !== 'object') return payload
  return fields.reduce((next, field) => {
    if (next[field] !== undefined && next[field] !== null) {
      next[field] = sanitizeHtml(next[field])
    }
    return next
  }, { ...payload })
}
