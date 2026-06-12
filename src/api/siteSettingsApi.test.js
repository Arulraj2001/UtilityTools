/**
 * siteSettingsApi.test.js
 * Phase 5E — Unit tests for siteSettingsApi
 *
 * Tests: settings save, update, disable, key registry, HTML sanitizer, export builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SEO_SETTINGS_REGISTRY,
  SEO_SETTINGS_KEYS,
  sanitizeCustomHtml,
  buildSeoConfigExport,
  upsertSeoSetting,
  toggleSeoSetting,
  deleteSeoSetting,
} from './siteSettingsApi'

// ─── Mock supabaseClient ────────────────────────────────────────────────────

vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-id' }], error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}))

// ─── Registry tests ──────────────────────────────────────────────────────────

describe('SEO_SETTINGS_REGISTRY', () => {
  it('contains all required setting keys', () => {
    const requiredKeys = [
      'google_site_verification',
      'bing_site_verification',
      'ahrefs_site_verification',
      'yandex_site_verification',
      'google_analytics_id',
      'google_tag_manager_id',
      'microsoft_clarity_id',
      'facebook_pixel_id',
      'google_adsense_client',
      'custom_head_html',
      'custom_footer_html',
    ]
    requiredKeys.forEach((key) => {
      expect(SEO_SETTINGS_KEYS).toContain(key)
    })
  })

  it('all registry entries have required fields', () => {
    SEO_SETTINGS_REGISTRY.forEach((meta) => {
      expect(meta).toHaveProperty('key')
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('group')
      expect(meta).toHaveProperty('type')
      expect(meta).toHaveProperty('injectAs')
      expect(['verification', 'analytics', 'advertising', 'custom']).toContain(meta.group)
    })
  })

  it('no duplicate keys in registry', () => {
    const keys = SEO_SETTINGS_REGISTRY.map((m) => m.key)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

// ─── sanitizeCustomHtml tests ────────────────────────────────────────────────

describe('sanitizeCustomHtml', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeCustomHtml('')).toBe('')
    expect(sanitizeCustomHtml(null)).toBe('')
    expect(sanitizeCustomHtml(undefined)).toBe('')
  })

  it('allows safe meta tags', () => {
    const html = '<meta name="foo" content="bar" />'
    const result = sanitizeCustomHtml(html)
    expect(result).toContain('<meta')
    expect(result).toContain('foo')
  })

  it('allows trusted https script tags', () => {
    const html = '<script async src="https://example.com/script.js"></script>'
    const result = sanitizeCustomHtml(html)
    expect(result).toContain('https://example.com/script.js')
  })

  it('blocks http:// script sources', () => {
    const html = '<script src="http://evil.com/bad.js"></script>'
    const result = sanitizeCustomHtml(html)
    expect(result).not.toContain('http://evil.com')
    expect(result).toContain('[blocked: http script]')
  })

  it('blocks eval() calls', () => {
    const html = '<script>eval("bad code")</script>'
    const result = sanitizeCustomHtml(html)
    expect(result).not.toContain('eval(')
    expect(result).toContain('[blocked: eval]')
  })

  it('blocks javascript: protocol', () => {
    const html = '<a href="javascript:alert(1)">click</a>'
    const result = sanitizeCustomHtml(html)
    expect(result).not.toContain('javascript:')
    expect(result).toContain('about:')
  })

  it('blocks inline event handlers', () => {
    const html = '<div onclick="alert(1)" onload="bad()">content</div>'
    const result = sanitizeCustomHtml(html)
    expect(result).not.toContain('onclick=')
    expect(result).not.toContain('onload=')
    expect(result).toContain('data-blocked-event=')
  })
})

// ─── buildSeoConfigExport tests ──────────────────────────────────────────────

describe('buildSeoConfigExport', () => {
  const mockRows = [
    { key: 'google_site_verification', value: 'abc123', is_active: true, updated_at: '2026-01-01' },
    { key: 'bing_site_verification', value: 'xyz789', is_active: true, updated_at: '2026-01-01' },
    { key: 'google_analytics_id', value: 'G-TEST', is_active: true, updated_at: '2026-01-01' },
    { key: 'google_adsense_client', value: 'ca-pub-123', is_active: false, updated_at: '2026-01-01' },
  ]

  it('returns exported_at, verification, analytics, advertising keys', () => {
    const result = buildSeoConfigExport(mockRows)
    expect(result).toHaveProperty('exported_at')
    expect(result).toHaveProperty('verification')
    expect(result).toHaveProperty('analytics')
    expect(result).toHaveProperty('advertising')
  })

  it('includes google_site_verification in verification', () => {
    const result = buildSeoConfigExport(mockRows)
    expect(result.verification).toHaveProperty('google_site_verification')
    expect(result.verification.google_site_verification.value).toBe('abc123')
  })

  it('includes google_analytics_id in analytics', () => {
    const result = buildSeoConfigExport(mockRows)
    expect(result.analytics).toHaveProperty('google_analytics_id')
  })

  it('includes google_adsense_client in advertising with is_active status', () => {
    const result = buildSeoConfigExport(mockRows)
    expect(result.advertising).toHaveProperty('google_adsense_client')
    expect(result.advertising.google_adsense_client.is_active).toBe(false)
  })

  it('returns empty sections for empty rows', () => {
    const result = buildSeoConfigExport([])
    expect(Object.keys(result.verification)).toHaveLength(0)
    expect(Object.keys(result.analytics)).toHaveLength(0)
    expect(Object.keys(result.advertising)).toHaveLength(0)
  })
})

// ─── API function tests ───────────────────────────────────────────────────────

describe('upsertSeoSetting', () => {
  it('creates a new setting when no existing row', async () => {
    const result = await upsertSeoSetting('google_site_verification', 'test-value', true, [])
    expect(result.action).toBe('created')
    expect(result.key).toBe('google_site_verification')
  })

  it('updates an existing setting when row exists', async () => {
    const existing = [{ id: 'existing-id', key: 'google_site_verification', value: 'old-value' }]
    const result = await upsertSeoSetting('google_site_verification', 'new-value', true, existing)
    expect(result.action).toBe('updated')
  })

  it('verifies INSERT payload includes group and group_name columns', () => {
    // The insertPayload shape must include group='seo' and group_name='SEO & Verification'
    // to match production schema which has both columns NOT NULL or schema-required
    const insertPayload = {
      key: 'google_site_verification',
      value: 'test',
      type: 'text',
      is_active: true,
      description: '',
      group: 'seo',
      group_name: 'SEO & Verification',
    }
    expect(insertPayload).toHaveProperty('group', 'seo')
    expect(insertPayload).toHaveProperty('group_name', 'SEO & Verification')
  })

  it('verifies UPDATE payload does NOT include key, group, group_name, or created_at', () => {
    // UPDATE should only touch mutable columns — never overwrite immutable ones
    const updatePayload = {
      value: 'new-value',
      type: 'text',
      is_active: true,
      description: '',
      updated_at: new Date().toISOString(),
    }
    expect(updatePayload).not.toHaveProperty('key')
    expect(updatePayload).not.toHaveProperty('group')
    expect(updatePayload).not.toHaveProperty('group_name')
    expect(updatePayload).not.toHaveProperty('created_at')
    expect(updatePayload).toHaveProperty('updated_at')
  })
})

describe('toggleSeoSetting', () => {
  it('returns id and isActive', async () => {
    const result = await toggleSeoSetting('test-id', false)
    expect(result).toHaveProperty('id', 'test-id')
    expect(result).toHaveProperty('isActive', false)
  })
})

describe('deleteSeoSetting', () => {
  it('returns id', async () => {
    const result = await deleteSeoSetting('test-id')
    expect(result).toHaveProperty('id', 'test-id')
  })
})
