/**
 * AdminSiteSettings.jsx
 * Phase 5E — SEO & Verification Manager
 * Route: /admin/site-settings
 *
 * Tabs: Verification | Analytics | Advertising | Custom Scripts
 * Actions: Save, Enable/Disable, Delete
 * Export: SEO_CONFIGURATION.json
 */

import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  SEO_SETTINGS_REGISTRY,
  buildSeoConfigExport,
  deleteSeoSetting,
  getSeoSettings,
  toggleSeoSetting,
  upsertSeoSetting,
} from '@/api/siteSettingsApi'

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'analytics',    label: 'Analytics',    icon: Globe },
  { id: 'advertising',  label: 'Advertising',  icon: Sparkles },
  { id: 'custom',       label: 'Custom Scripts', icon: Zap },
]

// ─── Helper: row lookup ───────────────────────────────────────────────────────

function useRowLookup(rows) {
  return React.useMemo(
    () => rows.reduce((acc, r) => { acc[r.key] = r; return acc }, {}),
    [rows]
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ row }) {
  if (!row) return <span className="text-xs text-muted-foreground">Not set</span>
  if (row.is_active === false) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <ToggleLeft className="w-3.5 h-3.5" /> Disabled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <CheckCircle2 className="w-3.5 h-3.5" /> Active
    </span>
  )
}

// ─── Setting card ─────────────────────────────────────────────────────────────

function SettingCard({ meta, row, existingRows, onSaved }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(row?.value || '')
  const [visible, setVisible] = useState(false)
  const isHtml = meta.type === 'html'
  const isActive = row ? row.is_active !== false : true

  // Sync to server value when row changes
  useEffect(() => { setValue(row?.value || '') }, [row?.value])

  const upsertMut = useMutation({
    mutationFn: () => upsertSeoSetting(meta.key, value, true, existingRows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(`${meta.label} saved`)
      onSaved?.()
    },
    onError: (err) => toast.error(err.message || 'Save failed'),
  })

  const toggleMut = useMutation({
    mutationFn: () => toggleSeoSetting(row.id, !isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(isActive ? `${meta.label} disabled` : `${meta.label} enabled`)
    },
    onError: (err) => toast.error(err.message || 'Toggle failed'),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteSeoSetting(row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(`${meta.label} removed`)
      setValue('')
    },
    onError: (err) => toast.error(err.message || 'Delete failed'),
  })

  const handleDelete = () => {
    if (!confirm(`Delete ${meta.label}? This will remove the setting and stop injection.`)) return
    deleteMut.mutate()
  }

  const isSaving  = upsertMut.isPending
  const isToggling = toggleMut.isPending
  const isDeleting = deleteMut.isPending
  const hasRow = !!row
  const isDirty = value !== (row?.value || '')

  // Mask sensitive values (non-HTML fields)
  const displayValue = !isHtml && !visible && value
    ? value.replace(/(.{4})(.*)(.{4})/, (_, a, b, c) => a + b.replace(/./g, '•') + c)
    : value

  return (
    <div
      id={`setting-card-${meta.key}`}
      className={`rounded-2xl border bg-card p-5 space-y-4 transition-all ${
        hasRow && isActive
          ? 'border-emerald-200 dark:border-emerald-900/40'
          : hasRow
          ? 'border-amber-200 dark:border-amber-900/40 opacity-80'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{meta.label}</p>
            <StatusPill row={row} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.description}</p>
        </div>

        {/* Toggle + Delete actions (only when row exists) */}
        {hasRow && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              id={`toggle-${meta.key}`}
              onClick={() => toggleMut.mutate()}
              disabled={isToggling}
              title={isActive ? 'Disable' : 'Enable'}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {isToggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isActive
                ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                : <ToggleLeft className="w-4 h-4 text-amber-500" />
              }
            </button>
            <button
              id={`delete-${meta.key}`}
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete setting"
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 transition-colors"
            >
              {isDeleting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2">
        {isHtml ? (
          <Textarea
            id={`input-${meta.key}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            rows={6}
            className="font-mono text-xs rounded-xl resize-y"
          />
        ) : (
          <div className="relative">
            <Input
              id={`input-${meta.key}`}
              value={visible ? value : displayValue}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder}
              className="rounded-xl pr-10 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            {value && (
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title={visible ? 'Hide value' : 'Show value'}
              >
                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <div>
          {isDirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
        </div>
        <Button
          id={`save-${meta.key}`}
          size="sm"
          onClick={() => upsertMut.mutate()}
          disabled={isSaving || !value.trim()}
          className="rounded-xl"
        >
          {isSaving
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
            : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}
        </Button>
      </div>

      {/* Security notice for custom HTML */}
      {isHtml && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/10 px-3 py-2">
          <TriangleAlert className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            HTML is sanitized before injection. <code className="font-mono">eval()</code>,{' '}
            <code className="font-mono">javascript:</code>, <code className="font-mono">http://</code> script sources,
            and inline event handlers are blocked.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ group, rowLookup, existingRows }) {
  const metas = SEO_SETTINGS_REGISTRY.filter((m) => m.group === group)

  return (
    <div className="space-y-5">
      {metas.map((meta) => (
        <SettingCard
          key={meta.key}
          meta={meta}
          row={rowLookup[meta.key] || null}
          existingRows={existingRows}
        />
      ))}
    </div>
  )
}

// ─── Status summary ───────────────────────────────────────────────────────────

function StatusSummary({ rows }) {
  const lookup = rows.reduce((acc, r) => { acc[r.key] = r; return acc }, {})

  const checks = [
    { label: 'Google Verification',  key: 'google_site_verification' },
    { label: 'Bing Verification',     key: 'bing_site_verification' },
    { label: 'Google Analytics',      key: 'google_analytics_id' },
    { label: 'Tag Manager',           key: 'google_tag_manager_id' },
    { label: 'Google AdSense',        key: 'google_adsense_client' },
    { label: 'Microsoft Clarity',     key: 'microsoft_clarity_id' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {checks.map(({ label, key }) => {
        const row = lookup[key]
        const active = row?.is_active !== false && !!row?.value
        return (
          <div
            key={key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
              active
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400'
                : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-500' : 'opacity-30'}`} />
            {label}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSiteSettings() {
  const [activeTab, setActiveTab] = useState('verification')
  const queryClient = useQueryClient()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: getSeoSettings,
    staleTime: 30_000,
  })

  const rowLookup = useRowLookup(rows)

  // Export JSON
  const handleExport = () => {
    const payload = buildSeoConfigExport(rows)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'SEO_CONFIGURATION.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('SEO_CONFIGURATION.json downloaded')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Search className="h-3.5 w-3.5" />
            Phase 5E
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SEO & Verification Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage verification codes, analytics, advertising, and tracking scripts without editing{' '}
            <code className="font-mono text-xs">index.html</code> or redeploying.
          </p>
        </div>
        <Button
          id="export-seo-config"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="rounded-xl gap-2 shrink-0"
          disabled={!rows.length}
        >
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
      </div>

      {/* Status overview */}
      {!isLoading && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Active Integrations</h2>
            <Badge variant="secondary" className="text-xs">{rows.filter(r => r.is_active !== false && r.value).length} active</Badge>
          </div>
          <StatusSummary rows={rows} />
        </section>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 border border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const groupRows = SEO_SETTINGS_REGISTRY
              .filter((m) => m.group === tab.id)
              .map((m) => rowLookup[m.key])
              .filter(Boolean)
            const activeCount = groupRows.filter((r) => r.is_active !== false && r.value).length

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeCount > 0 && (
                  <span className="hidden sm:inline text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5">
                    {activeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : (
            <TabPanel
              group={activeTab}
              rowLookup={rowLookup}
              existingRows={rows}
            />
          )}
        </div>
      </div>

      {/* How it works info */}
      <section className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          How it works
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted-foreground leading-relaxed">
          <div className="space-y-1">
            <p><strong className="text-foreground">Verification tags</strong> — Injected as <code className="font-mono">&lt;meta name="..." content="..."&gt;</code> into the page <code className="font-mono">&lt;head&gt;</code></p>
            <p><strong className="text-foreground">Analytics</strong> — GA4, GTM, Clarity, Facebook Pixel scripts are injected only when active. GTM includes the noscript iframe.</p>
          </div>
          <div className="space-y-1">
            <p><strong className="text-foreground">AdSense</strong> — The <code className="font-mono">adsbygoogle.js</code> script is injected with your publisher ID only when enabled.</p>
            <p><strong className="text-foreground">Custom HTML</strong> — Head and footer HTML are sanitized (no <code className="font-mono">eval</code>, no <code className="font-mono">http://</code> sources) before injection.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
