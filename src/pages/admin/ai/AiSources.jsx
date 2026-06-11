import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Globe, Plus, Pencil, Trash2, Star, Shield, Link2, X, Save,
  Play, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Clock, Zap,
  Upload, Download, FileText,
} from 'lucide-react'
import { getAiSources, createAiSource, updateAiSource, deleteAiSource } from '@/api/supabaseApi'
import { runFetchAll, runFetchSource, getFetchStatus, isDevMode } from '@/api/adminOperationsApi'

const TIER_META = {
  1: { label: 'Tier 1 — Official',   color: 'bg-green-500/10 text-green-600 border-green-500/20',  icon: Shield, desc: 'Government, PSU, University, Bank, Railway official portals' },
  2: { label: 'Tier 2 — Company',    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',    icon: Star,   desc: 'Company career pages and recruitment boards' },
  3: { label: 'Tier 3 — Manual URL', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',    icon: Link2,  desc: 'Manually added URLs for one-time monitoring' },
}

const CATEGORIES = ['government', 'bank', 'railway', 'it', 'remote', 'freshers', 'private', 'other']
const EMPTY_FORM = { name: '', url: '', tier: 2, category: 'government', description: '', is_active: true }

function SourceForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="rounded-[20px] border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Source Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. SSC Official Portal" className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">URL *</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Tier</label>
          <select value={form.tier} onChange={e => set('tier', Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value={1}>Tier 1 — Official</option>
            <option value={2}>Tier 2 — Company</option>
            <option value={3}>Tier 3 — Manual</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief note about this source…" className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
          <Save className="w-3.5 h-3.5" />Save
        </button>
        <button onClick={onCancel} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-all">Cancel</button>
      </div>
    </div>
  )
}

// ─── Bulk Import Modal ───────────────────────────────────────────────────────

const TEMPLATE_CSV = `name,url,tier,category,description
SSC Official Portal,https://ssc.nic.in,1,government,Official SSC recruitment notifications
IBPS Official,https://ibps.in,1,bank,IBPS bank recruitment notifications
Railway Board,https://indianrailways.gov.in,1,railway,Indian Railways recruitment notifications`

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'sources-template.csv'; a.click()
  URL.revokeObjectURL(url)
}

const isValidUrl = (str) => {
  try { new URL(str); return true } catch { return false }
}

const parseSourcesInput = (raw) => {
  const text = raw.trim()
  if (!text) return []

  // Try JSON first
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return arr.map((row, i) => {
        const errors = []
        if (!row.name?.trim()) errors.push('name required')
        if (!row.url?.trim()) errors.push('url required')
        else if (!isValidUrl(row.url)) errors.push('invalid URL')
        return {
          _idx: i,
          name: String(row.name || '').trim(),
          url: String(row.url || '').trim(),
          tier: Number(row.tier) || 2,
          category: String(row.category || 'government'),
          description: String(row.description || ''),
          is_active: true,
          _errors: errors,
          _valid: errors.length === 0,
        }
      })
    } catch { /* fall through to CSV */ }
  }

  // CSV
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  // Detect and skip header
  const hasHeader = /^name[,\t]/i.test(lines[0])
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line, i) => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, '').trim())
    const [name = '', url = '', tier = '2', category = 'government', ...rest] = cols
    const description = rest.join(',').trim()
    const errors = []
    if (!name) errors.push('name required')
    if (!url) errors.push('url required')
    else if (!isValidUrl(url)) errors.push('invalid URL')
    return {
      _idx: i,
      name, url,
      tier: Number(tier) || 2,
      category: category || 'government',
      description,
      is_active: true,
      _errors: errors,
      _valid: errors.length === 0,
    }
  })
}

function BulkImportModal({ onClose, onCreate }) {
  const [rawInput, setRawInput] = useState('')
  const [rows, setRows] = useState([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleParse = useCallback(() => {
    const result = parseSourcesInput(rawInput)
    setRows(result)
    setParsed(true)
  }, [rawInput])

  const validRows = rows.filter(r => r._valid)
  const invalidRows = rows.filter(r => !r._valid)

  const handleImport = async () => {
    if (!validRows.length) return
    setImporting(true)
    let succeeded = 0
    let failed = 0
    const failures = []
    for (const row of validRows) {
      try {
        await onCreate({ name: row.name, url: row.url, tier: row.tier, category: row.category, description: row.description, is_active: true })
        succeeded++
      } catch (err) {
        failed++
        failures.push({ name: row.name, error: err.message })
      }
    }
    setImporting(false)
    setImportResult({ succeeded, failed, failures })
    if (succeeded) toast.success(`Imported ${succeeded} source${succeeded !== 1 ? 's' : ''}`)
    if (failed) toast.error(`${failed} source${failed !== 1 ? 's' : ''} failed to import`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-card rounded-[24px] border border-border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-base">Bulk Import Sources</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {importResult ? (
            <div className="space-y-3">
              <div className={`rounded-[18px] border p-4 ${importResult.failed === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <p className="font-semibold text-sm">Import Complete</p>
                <p className="text-xs mt-1">{importResult.succeeded} imported successfully{importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}.</p>
              </div>
              {importResult.failures.map((f, i) => (
                <div key={i} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <strong>{f.name}</strong>: {f.error}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="rounded-[18px] border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Supported formats</p>
                <p><strong>CSV</strong>: one source per line: <code className="font-mono bg-muted px-1 rounded">name,url,tier,category,description</code></p>
                <p><strong>JSON</strong>: array of objects with the same fields</p>
                <p>Tier: <code className="font-mono">1</code> = Official, <code className="font-mono">2</code> = Company, <code className="font-mono">3</code> = Manual. Default: 2.</p>
                <button onClick={downloadTemplate} className="mt-1 flex items-center gap-1 text-primary hover:underline">
                  <Download className="w-3 h-3" />Download CSV template
                </button>
              </div>

              {/* Paste area */}
              <div>
                <label className="text-xs font-medium mb-1 block">Paste CSV or JSON</label>
                <textarea
                  value={rawInput}
                  onChange={e => { setRawInput(e.target.value); setParsed(false); setRows([]) }}
                  rows={8}
                  placeholder={`name,url,tier,category,description\nSSC Official,https://ssc.nic.in,1,government,SSC official portal\nIBPS,https://ibps.in,1,bank,IBPS bank recruitment`}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>

              {/* Parse button */}
              {!parsed && (
                <button
                  onClick={handleParse}
                  disabled={!rawInput.trim()}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Preview Sources
                </button>
              )}

              {/* Preview table */}
              {parsed && rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold">{rows.length} row{rows.length !== 1 ? 's' : ''} detected</p>
                    {validRows.length > 0 && <span className="text-xs text-emerald-600 font-medium">{validRows.length} valid</span>}
                    {invalidRows.length > 0 && <span className="text-xs text-red-500 font-medium">{invalidRows.length} invalid (will be skipped)</span>}
                    <button onClick={() => { setRawInput(''); setRows([]); setParsed(false) }} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium w-6">#</th>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">URL</th>
                          <th className="text-left px-3 py-2 font-medium">Tier</th>
                          <th className="text-left px-3 py-2 font-medium">Category</th>
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((row) => (
                          <tr key={row._idx} className={row._valid ? 'bg-emerald-50/40' : 'bg-red-50/40'}>
                            <td className="px-3 py-1.5 text-muted-foreground">{row._idx + 1}</td>
                            <td className="px-3 py-1.5 font-medium truncate max-w-[140px]">{row.name || <span className="text-red-400 italic">missing</span>}</td>
                            <td className="px-3 py-1.5 truncate max-w-[180px] text-muted-foreground">{row.url || <span className="text-red-400 italic">missing</span>}</td>
                            <td className="px-3 py-1.5">{row.tier}</td>
                            <td className="px-3 py-1.5 capitalize">{row.category}</td>
                            <td className="px-3 py-1.5">
                              {row._valid
                                ? <span className="text-emerald-600 font-medium">✓ Valid</span>
                                : <span className="text-red-500" title={row._errors.join(', ')}>✗ {row._errors.join(', ')}</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parsed && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">No rows detected. Check your CSV/JSON format.</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/50">
            {importResult ? 'Close' : 'Cancel'}
          </button>
          {!importResult && parsed && validRows.length > 0 && (
            <button
              id="bulk-import-confirm-btn"
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Import {validRows.length} Source{validRows.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FetchResultPanel({ result, onClose }) {
  if (!result) return null
  const { summary = {}, sourceResults = [], errors = [] } = result
  return (
    <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6 relative">
      <button onClick={onClose} className="absolute top-3 right-3 h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold text-sm text-emerald-700">Fetch Completed</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Sources Run', value: summary.sourcesRun ?? sourceResults.length ?? 0, tone: 'text-foreground' },
          { label: 'Items Found', value: summary.totalFound ?? 0, tone: 'text-blue-600' },
          { label: 'Items Saved', value: summary.totalSaved ?? 0, tone: 'text-emerald-600' },
          { label: 'Duplicates', value: summary.totalDuplicates ?? 0, tone: 'text-amber-600' },
          { label: 'Failures', value: summary.totalFailures ?? errors.length ?? 0, tone: 'text-red-600' },
          { label: 'Last Run', value: summary.completedAt ? new Date(summary.completedAt).toLocaleTimeString() : 'just now', tone: 'text-muted-foreground' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      {sourceResults.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Per-Source Results</p>
          {sourceResults.map((r, i) => (
            <div key={r.sourceId || i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border border-border/50 bg-background">
              <span className="font-medium truncate">{r.sourceName || r.sourceId || `Source ${i + 1}`}</span>
              <div className="flex gap-3 shrink-0 text-muted-foreground">
                <span className="text-blue-600">{r.found ?? 0} found</span>
                <span className="text-emerald-600">{r.saved ?? 0} saved</span>
                {(r.failures ?? 0) > 0 && <span className="text-red-600">{r.failures} failed</span>}
                {r.error && <span className="text-red-600 truncate max-w-[120px]">{r.error}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {errors.length > 0 && (
        <div className="mt-3 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600 px-2 py-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{typeof err === 'string' ? err : (err.message || JSON.stringify(err))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AiSources() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterTier, setFilterTier] = useState('all')
  const [fetchResult, setFetchResult] = useState(null)
  const [runningSourceId, setRunningSourceId] = useState(null)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['ai-sources'],
    queryFn: () => getAiSources(),
    retry: false,
  })

  const { data: fetchStatus } = useQuery({
    queryKey: ['fetch-status'],
    queryFn: getFetchStatus,
    retry: false,
    refetchInterval: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: createAiSource,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-sources'] }); setShowAdd(false); toast.success('Source added') },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAiSource(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-sources'] }); setEditingId(null); toast.success('Source updated') },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAiSource,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-sources'] }); toast.success('Source removed') },
    onError: (err) => toast.error(err.message),
  })

  const runAllMutation = useMutation({
    mutationFn: () => runFetchAll({}),
    onSuccess: (data) => {
      setFetchResult(data)
      queryClient.invalidateQueries({ queryKey: ['fetch-status'] })
      toast.success('Fetch completed')
    },
    onError: (err) => toast.error(err.message || 'Fetch failed'),
  })

  const handleRunSource = async (sourceId, sourceName) => {
    setRunningSourceId(sourceId)
    try {
      const data = await runFetchSource(sourceId)
      setFetchResult({ summary: data?.summary || {}, sourceResults: [{ sourceId, sourceName, ...(data || {}) }], errors: data?.errors || [] })
      queryClient.invalidateQueries({ queryKey: ['fetch-status'] })
      toast.success(`Fetch completed for ${sourceName}`)
    } catch (err) {
      toast.error(err.message || 'Source fetch failed')
    } finally {
      setRunningSourceId(null)
    }
  }

  const filtered = filterTier === 'all' ? sources : sources.filter(s => s.tier === Number(filterTier))
  const grouped = { 1: filtered.filter(s => s.tier === 1), 2: filtered.filter(s => s.tier === 2), 3: filtered.filter(s => s.tier === 3) }
  const activeSources = sources.filter(s => s.is_active)

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Globe className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Source Management</h1>
          <p className="text-muted-foreground mt-2">Manage the job notification sources. Tier 1 sources are official portals and get highest priority.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="run-all-sources-btn"
            onClick={() => {
              if (!window.confirm(`Run fetch for all ${activeSources.length} active sources now?`)) return
              runAllMutation.mutate()
            }}
            disabled={runAllMutation.isPending || isDevMode()}
            title={isDevMode() ? 'Requires Vercel deployment — not available in local dev' : undefined}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-emerald-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          >
            {runAllMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Running…</>
              : <><Play className="w-4 h-4" />Run All Active Sources</>}
          </button>
          <button
            id="bulk-import-sources-btn"
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl border border-border font-semibold text-sm hover:bg-muted/50 transition-all"
          >
            <Upload className="w-4 h-4" />Bulk Import
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" />Add Source
          </button>
        </div>
      </div>

      {/* Fetch Status Banner */}
      {fetchStatus && (
        <div className="mb-5 rounded-[18px] border border-border/50 bg-card/80 p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Last run:</span>
            <span className="text-xs font-semibold">{fetchStatus.lastRunAt ? new Date(fetchStatus.lastRunAt).toLocaleString() : 'Never'}</span>
          </div>
          {fetchStatus.activeSources !== undefined && (
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Active sources:</span>
              <span className="text-xs font-semibold">{fetchStatus.activeSources}</span>
            </div>
          )}
          {fetchStatus.totalNotifications !== undefined && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total notifications:</span>
              <span className="text-xs font-semibold">{fetchStatus.totalNotifications}</span>
            </div>
          )}
        </div>
      )}

      {/* Fetch Result */}
      {fetchResult && <FetchResultPanel result={fetchResult} onClose={() => setFetchResult(null)} />}

      {showAdd && (
        <div className="mb-6">
          <SourceForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Tier legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[1,2,3].map(tier => {
          const m = TIER_META[tier]
          const Icon = m.icon
          const count = sources.filter(s => s.tier === tier).length
          return (
            <div key={tier} className={`rounded-2xl border px-4 py-3 ${m.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{m.label}</span>
                <span className="ml-auto text-xs font-bold">{count}</span>
              </div>
              <p className="text-xs opacity-80">{m.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', '1', '2', '3'].map(t => (
          <button key={t} onClick={() => setFilterTier(t)} className={`h-8 px-3 rounded-xl text-xs font-medium transition-all ${filterTier === t ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/50'}`}>
            {t === 'all' ? 'All' : `Tier ${t}`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-[20px] bg-muted/30 animate-pulse" />)}</div>
      ) : (
        [1,2,3].map(tier => {
          const tierSources = grouped[tier]
          if (!tierSources.length) return null
          const m = TIER_META[tier]
          return (
            <div key={tier} className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{m.label} ({tierSources.length})</h3>
              <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
                <div className="divide-y divide-border/50">
                  {tierSources.map(source => (
                    <div key={source.id}>
                      {editingId === source.id ? (
                        <div className="p-4">
                          <SourceForm
                            initial={source}
                            onSave={(data) => updateMutation.mutate({ id: source.id, data })}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors group">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${source.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{source.name}</p>
                            <a href={source.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block">{source.url}</a>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize hidden sm:block">{source.category}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {source.is_active && (
                              <button
                                id={`run-source-${source.id}`}
                                onClick={() => handleRunSource(source.id, source.name)}
                                disabled={runningSourceId === source.id || runAllMutation.isPending}
                                className="h-7 px-2 rounded-lg border border-emerald-500/30 text-emerald-600 text-xs hover:bg-emerald-500/10 transition-all disabled:opacity-50 flex items-center gap-1"
                              >
                                {runningSourceId === source.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <RefreshCw className="w-3 h-3" />}
                                Run
                              </button>
                            )}
                            <button onClick={() => updateMutation.mutate({ id: source.id, data: { is_active: !source.is_active } })} className="h-7 px-2 rounded-lg border border-border text-xs hover:border-primary/40 transition-all">
                              {source.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => setEditingId(source.id)} className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:border-primary/40 transition-all">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => { if (confirm('Remove source?')) deleteMutation.mutate(source.id) }} className="h-7 w-7 rounded-lg border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })
      )}

      {!isLoading && sources.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No sources added yet</p>
          <p className="text-xs mt-1">Add official job portals to start monitoring for new vacancies.</p>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => {
            setShowBulkImport(false)
            queryClient.invalidateQueries({ queryKey: ['ai-sources'] })
          }}
          onCreate={createAiSource}
        />
      )}
    </main>
  )
}
