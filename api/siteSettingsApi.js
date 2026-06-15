/**
 * siteSettingsApi.js
 * Phase 5E — Dedicated API layer for SEO & Verification settings.
 *
 * Uses the existing site_settings table via existing supabaseApi CRUD.
 * Does NOT modify any AI, pipeline, or monitoring architecture.
 */

import { supabase } from '@/api/supabaseClient'

// ─── SEO-group key registry ────────────────────────────────────────────────

/**
 * All supported SEO/verification/analytics/advertising settings.
 * key           → site_settings.setting_key value (db column name: 'key')
 * label         → display name
 * group         → tab grouping: 'verification' | 'analytics' | 'advertising' | 'custom'
 * type          → 'text' | 'html'
 * placeholder   → input hint
 * description   → contextual help
 * injectAs      → how it is injected into <head>
 */
export const SEO_SETTINGS_REGISTRY = [
  // ── Verification ────────────────────────────────────────────────────────
  {
    key: 'google_site_verification',
    label: 'Google Search Console',
    group: 'verification',
    type: 'text',
    placeholder: 'abc123xyz...',
    description: 'From Google Search Console → Settings → Ownership Verification → HTML Tag → content value only.',
    injectAs: 'meta:google-site-verification',
  },
  {
    key: 'bing_site_verification',
    label: 'Bing Webmaster Tools',
    group: 'verification',
    type: 'text',
    placeholder: 'ABCDEF1234...',
    description: 'From Bing Webmaster Tools → Settings → Verify → Meta Tag → content value only.',
    injectAs: 'meta:msvalidate.01',
  },
  {
    key: 'ahrefs_site_verification',
    label: 'Ahrefs Webmaster Tools',
    group: 'verification',
    type: 'text',
    placeholder: 'abc123...',
    description: 'From Ahrefs Webmaster Tools → Sites → Verify → Meta Tag → content value only.',
    injectAs: 'meta:ahrefs-site-verification',
  },
  {
    key: 'yandex_site_verification',
    label: 'Yandex Webmaster',
    group: 'verification',
    type: 'text',
    placeholder: 'abc123...',
    description: 'From Yandex Webmaster → Settings → Meta Tag → content value only.',
    injectAs: 'meta:yandex-verification',
  },

  // ── Analytics ───────────────────────────────────────────────────────────
  {
    key: 'google_analytics_id',
    label: 'Google Analytics 4',
    group: 'analytics',
    type: 'text',
    placeholder: 'G-XXXXXXXXXX',
    description: 'GA4 Measurement ID from Google Analytics → Admin → Data Streams → Measurement ID.',
    injectAs: 'ga4',
  },
  {
    key: 'google_tag_manager_id',
    label: 'Google Tag Manager',
    group: 'analytics',
    type: 'text',
    placeholder: 'GTM-XXXXXXX',
    description: 'Container ID from Google Tag Manager → Admin → Container Settings.',
    injectAs: 'gtm',
  },
  {
    key: 'microsoft_clarity_id',
    label: 'Microsoft Clarity',
    group: 'analytics',
    type: 'text',
    placeholder: 'abc1234xyz',
    description: 'Project ID from Microsoft Clarity → Settings → Setup → Clarity ID.',
    injectAs: 'clarity',
  },
  {
    key: 'facebook_pixel_id',
    label: 'Facebook Pixel',
    group: 'analytics',
    type: 'text',
    placeholder: '1234567890',
    description: 'Pixel ID from Meta Events Manager → Pixel → Settings.',
    injectAs: 'fbpixel',
  },

  // ── Advertising ─────────────────────────────────────────────────────────
  {
    key: 'google_adsense_client',
    label: 'Google AdSense Publisher ID',
    group: 'advertising',
    type: 'text',
    placeholder: 'ca-pub-XXXXXXXXXXXXXXXXX',
    description: 'From Google AdSense → Account → Publisher ID. Include the full ca-pub-... prefix.',
    injectAs: 'adsense',
  },

  // ── Custom Scripts ───────────────────────────────────────────────────────
  {
    key: 'custom_head_html',
    label: 'Custom Head HTML',
    group: 'custom',
    type: 'html',
    placeholder: '<meta name="..." content="..." />\n<link rel="..." href="..." />',
    description: 'Raw HTML injected inside <head>. Supports <meta>, <link>, <script> tags. Sanitized for security.',
    injectAs: 'head_html',
  },
  {
    key: 'custom_footer_html',
    label: 'Custom Footer HTML',
    group: 'custom',
    type: 'html',
    placeholder: '<!-- analytics or tracking code -->\n<script>...</script>',
    description: 'Raw HTML injected before </body>. Supports trusted <script> and <noscript> tags. Sanitized for security.',
    injectAs: 'footer_html',
  },
]

export const SEO_SETTINGS_KEYS = SEO_SETTINGS_REGISTRY.map((s) => s.key)

// ─── Fetch only SEO settings ────────────────────────────────────────────────

/**
 * Returns all site_settings rows whose key is in SEO_SETTINGS_KEYS.
 * Gracefully returns [] if the table doesn't exist yet.
 */
export const getSeoSettings = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .in('key', SEO_SETTINGS_KEYS)

  if (error) {
    const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true);
    if (isDev) {
      console.warn('[siteSettingsApi] getSeoSettings error:', error.message)
    }
    return []
  }
  return data || []
}

/**
 * Returns a lookup map: { [key]: row } for all active SEO settings.
 */
export const getSeoSettingsMap = async () => {
  const rows = await getSeoSettings()
  return rows.reduce((acc, row) => {
    acc[row.key] = row
    return acc
  }, {})
}

// ─── Production schema constants ─────────────────────────────────────────────
// Real site_settings columns (verified against production):
//   id, key, value, type, group, group_name, created_at, updated_at,
//   is_active, description
//
// Phase 5E rows always use:
//   group      = 'seo'
//   group_name = 'SEO & Verification'
//
// 'group' is a reserved SQL word but PostgREST handles quoting transparently.

const SEO_GROUP       = 'seo'
const SEO_GROUP_NAME  = 'SEO & Verification'

// ─── Upsert a single SEO setting ────────────────────────────────────────────

/**
 * Creates or updates a site_settings row for the given SEO key.
 *
 * INSERT: sends all columns including group + group_name (required by schema).
 * UPDATE: only sends mutable columns — avoids touching key/group/created_at.
 *
 * @param {string} key - setting_key (from SEO_SETTINGS_REGISTRY)
 * @param {string} value - setting_value
 * @param {boolean} isActive - whether the setting is active
 * @param {Array}   existingRows - current getSeoSettings() data to check for existing rows
 */
export const upsertSeoSetting = async (key, value, isActive = true, existingRows = []) => {
  const meta = SEO_SETTINGS_REGISTRY.find((s) => s.key === key)
  const existing = existingRows.find((r) => r.key === key)

  if (existing?.id) {
    // UPDATE — only mutable columns; never touch key, group, group_name, created_at
    const updatePayload = {
      value: String(value || ''),
      type: meta?.type || 'text',
      is_active: isActive,
      description: meta?.description || '',
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('site_settings')
      .update(updatePayload)
      .eq('id', existing.id)
    if (error) throw error
    return { action: 'updated', key }
  }

  // INSERT — full payload including group + group_name to match production schema
  const insertPayload = {
    key,
    value: String(value || ''),
    type: meta?.type || 'text',
    is_active: isActive,
    description: meta?.description || '',
    group: SEO_GROUP,
    group_name: SEO_GROUP_NAME,
  }
  const { error } = await supabase.from('site_settings').insert([insertPayload])
  if (error) throw error
  return { action: 'created', key }
}


/**
 * Toggle is_active for a setting by id.
 */
export const toggleSeoSetting = async (id, isActive) => {
  const { error } = await supabase
    .from('site_settings')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return { id, isActive }
}

/**
 * Delete a SEO setting by id.
 */
export const deleteSeoSetting = async (id) => {
  const { error } = await supabase.from('site_settings').delete().eq('id', id)
  if (error) throw error
  return { id }
}

// ─── Export configuration ────────────────────────────────────────────────────

/**
 * Builds the SEO_CONFIGURATION.json export payload.
 */
export const buildSeoConfigExport = (rows = []) => {
  const map = rows.reduce((acc, r) => { acc[r.key] = r; return acc }, {})

  const pick = (keys) =>
    Object.fromEntries(
      keys
        .filter((k) => map[k])
        .map((k) => [k, { value: map[k].value, is_active: map[k].is_active, updated_at: map[k].updated_at }])
    )

  return {
    exported_at: new Date().toISOString(),
    verification: pick(['google_site_verification', 'bing_site_verification', 'ahrefs_site_verification', 'yandex_site_verification']),
    analytics: pick(['google_analytics_id', 'google_tag_manager_id', 'microsoft_clarity_id', 'facebook_pixel_id']),
    advertising: pick(['google_adsense_client']),
  }
}

// ─── Custom HTML sanitizer ──────────────────────────────────────────────────

/**
 * Sanitizes custom HTML for safe head/footer injection.
 * Disallows: http:// script src, eval(), javascript:, inline event handlers.
 * Allows: meta, link, trusted script tags, noscript.
 */
export const sanitizeCustomHtml = (raw = '') => {
  if (!raw || typeof raw !== 'string') return ''

  return raw
    // Block http:// script sources (require https://)
    .replace(/<script[^>]+src=["']http:\/\//gi, '<!-- [blocked: http script] ')
    // Block eval() usage
    .replace(/\beval\s*\(/gi, '/* [blocked: eval] */(')
    // Block javascript: protocol
    .replace(/javascript\s*:/gi, 'about:')
    // Block inline event handlers (onclick, onload, onerror, etc.)
    .replace(/\bon\w+\s*=/gi, 'data-blocked-event=')
    .trim()
}
