'use client';
import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Plus, Trash2, Clock, CheckCircle2,
  XCircle, Bookmark, RefreshCw, Wand2, Server, Play,
  Loader2, AlertTriangle, Activity, ChevronDown, ChevronUp,
  RotateCcw,
} from 'lucide-react'
import {
  getResearchQueue, createResearchItem, updateResearchItem, deleteResearchItem,
} from '@/api/supabaseApi'
import {
  processAiQueue, processAiQueueItem, getAiQueueStatus,
  devSafeQuery, isDevMode, isDevModeError,
} from '@/api/adminOperationsApi'

const STATUS_META = {
  pending:      { label: 'Pending',        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',   icon: Clock },
  processing:   { label: 'Processing',     color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',         icon: RefreshCw },
  drafted:      { label: 'Draft Created',  color: 'bg-green-500/10 text-green-600 border-green-500/20',      icon: CheckCircle2 },
  rejected:     { label: 'Rejected',       color: 'bg-red-500/10 text-red-500 border-red-500/20',            icon: XCircle },
  saved_later:  { label: 'Saved for Later',color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',   icon: Bookmark },
}

const EMPTY_FORM = { title: '', organization: '', job_type: 'government', source_url: '', raw_input: '', notes: '' }

const JOB_TYPES = [
  { value: 'government', label: 'Government' },
  { value: 'bank', label: 'Bank' },
  { value: 'railway', label: 'Railway' },
  { value: 'it', label: 'IT / Tech' },
  { value: 'defense', label: 'Defence' },
  { value: 'psu', label: 'PSU' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'other', label: 'Other' },
]

function AddItemDrawer({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    if (!form.raw_input.trim() && !form.title.trim()) {
      toast.error('Enter either a title or paste notification text')
      return
    }
    onCreate(form)
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Job Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. SSC CGL 2024 Recruitment" className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Organization</label>
          <input value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="e.g. Staff Selection Commission" className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Job Type</label>
          <select value={form.job_type} onChange={e => set('job_type', e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Source URL</label>
          <input value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://official-source.gov.in/..." className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">
          Notification Text / Raw Input *
          <span className="text-muted-foreground ml-1 font-normal">(paste the full job notification here)</span>
        </label>
        <textarea
          value={form.raw_input}
          onChange={e => set('raw_input', e.target.value)}
          rows={8}
          placeholder="Paste the complete job notification text, vacancy table, eligibility criteria, important dates, application fee details, etc. The more detail you provide, the better the AI output will be."
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1">{form.raw_input.length} characters</p>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Admin Notes</label>
        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions for AI generation…" className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSubmit} className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />Add to Queue
        </button>
        <button onClick={onClose} className="h-10 px-4 rounded-2xl border border-border text-sm font-medium hover:bg-muted/50 transition-all">Cancel</button>
      </div>
    </div>
  )
}

function ProcessResultPanel({ result, onClose }) {
  const [expanded, setExpanded] = useState(false)
  if (!result) return null
  const processed = result.processed ?? result.total ?? 0
  const succeeded = result.succeeded ?? result.success ?? 0
  const failed = result.failed ?? result.failure ?? 0
  const skipped = result.skipped ?? 0
  const items = result.items ?? result.results ?? []

  return (
    <div className="rounded-[20px] border border-blue-500/20 bg-blue-500/5 p-5 mb-6 relative">
      <button onClick={onClose} className="absolute top-3 right-3 h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50">
        <XCircle className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-sm text-blue-700">Queue Processing Complete</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: 'Processed', value: processed, tone: 'text-foreground' },
          { label: 'Succeeded', value: succeeded, tone: 'text-emerald-600' },
          { label: 'Failed', value: failed, tone: 'text-red-600' },
          { label: 'Skipped', value: skipped, tone: 'text-amber-600' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Show'} {items.length} item results
        </button>
      )}
      {expanded && items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((r, i) => (
            <div key={r.itemId || i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border border-border/50 bg-background">
              <span className="font-medium truncate">{r.title || r.itemId || `Item ${i + 1}`}</span>
              <span className={r.success ? 'text-emerald-600' : 'text-red-600'}>
                {r.success ? 'drafted' : (r.error || 'failed')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkerStatusBanner({ status }) {
  if (!status) return null
  return (
    <div className="rounded-[16px] border border-border/50 bg-card/80 px-4 py-3 flex flex-wrap gap-4 mb-5">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Worker:</span>
        <span className={`text-xs font-semibold ${status.isRunning ? 'text-blue-600' : 'text-emerald-600'}`}>
          {status.isRunning ? 'Processing' : 'Idle'}
        </span>
      </div>
      {status.pendingCount !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Pending:</span>
          <span className="text-xs font-semibold text-amber-600">{status.pendingCount}</span>
        </div>
      )}
      {status.processingCount !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Processing:</span>
          <span className="text-xs font-semibold text-blue-600">{status.processingCount}</span>
        </div>
      )}
      {status.lastRunAt && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Last run:</span>
          <span className="text-xs font-semibold">{new Date(status.lastRunAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

function QueueItem({ item, onAction, onServerProcess, processing, selected, onSelect }) {
  const meta = STATUS_META[item.status] || STATUS_META.pending
  const StatusIcon = meta.icon

  return (
    <div className="px-5 py-4 hover:bg-primary/5 transition-colors group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Checkbox for bulk select */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          className="w-4 h-4 rounded border-border shrink-0"
          id={`queue-item-${item.id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>
              <StatusIcon className="w-3 h-3" />{meta.label}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{item.job_type}</span>
          </div>
          <h3 className="font-bold text-sm line-clamp-1">{item.title || '(Untitled)'}</h3>
          {item.organization && <p className="text-xs text-muted-foreground mt-0.5">{item.organization}</p>}
          {item.raw_input && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-mono">{item.raw_input.slice(0, 120)}…</p>}
        </div>

        {/* Actions */}
        {item.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              id={`server-process-${item.id}`}
              onClick={() => onServerProcess(item)}
              disabled={processing === item.id || isDevMode()}
              title={isDevMode() ? 'Requires Vercel deployment — not available in local dev' : undefined}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {processing === item.id
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing…</>
                : <><Server className="w-3.5 h-3.5" />Process via Server</>}
            </button>
            <button onClick={() => onAction(item.id, 'saved_later')} className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:border-purple-500/40 hover:text-purple-500 transition-all">
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { if (confirm('Reject this item?')) onAction(item.id, 'rejected') }} className="h-9 w-9 rounded-xl border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {item.status === 'saved_later' && (
          <button onClick={() => onAction(item.id, 'pending')} className="h-9 px-3 rounded-xl border border-border text-xs font-medium hover:border-primary/40 transition-all">
            Move to Queue
          </button>
        )}
        {item.status === 'rejected' && (
          <button onClick={() => onAction(item.id, 'pending')} className="h-9 px-3 rounded-xl border border-border text-xs font-medium hover:border-primary/40 transition-all flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />Retry
          </button>
        )}
        {item.status === 'drafted' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />Draft created
          </span>
        )}
        {(item.status === 'rejected' || item.status === 'drafted') && (
          <button onClick={() => deleteResearchItem(item.id)} className="h-8 w-8 rounded-xl border border-border flex items-center justify-center hover:border-red-500/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AiResearchQueue() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [processing, setProcessing] = useState(null)
  const [processResult, setProcessResult] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['research-queue'],
    queryFn: () => getResearchQueue({ limit: 200 }),
    retry: false,
    refetchInterval: 30_000,
  })

  const { data: workerStatus } = useQuery({
    queryKey: ['ai-queue-status'],
    queryFn: devSafeQuery(getAiQueueStatus),
    retry: false,
    refetchInterval: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: createResearchItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['research-queue'] }); setShowAdd(false); toast.success('Added to queue') },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateResearchItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-queue'] }),
    onError: (err) => toast.error(err.message),
  })

  const processQueueMutation = useMutation({
    mutationFn: (body) => processAiQueue(body),
    onSuccess: (data) => {
      setProcessResult(data)
      queryClient.invalidateQueries({ queryKey: ['research-queue'] })
      queryClient.invalidateQueries({ queryKey: ['ai-queue-status'] })
      toast.success('Queue processing complete')
    },
    onError: (err) => {
      if (isDevModeError(err)) toast.info('Queue processing requires Vercel deployment — not available in local dev.');
      else toast.error(err.message || 'Queue processing failed');
    },
  })

  const handleAction = (id, status) => updateMutation.mutate({ id, data: { status } })

  const handleServerProcess = async (item) => {
    setProcessing(item.id)
    try {
      const data = await processAiQueueItem(item.id, {})
      setProcessResult({ processed: 1, succeeded: data?.success ? 1 : 0, failed: data?.success ? 0 : 1, items: [{ itemId: item.id, title: item.title, ...data }] })
      queryClient.invalidateQueries({ queryKey: ['research-queue'] })
      queryClient.invalidateQueries({ queryKey: ['ai-queue-status'] })
      toast.success('Item processed via server worker')
    } catch (err) {
      if (isDevModeError(err)) toast.info('Server processing requires Vercel deployment — not available in local dev.');
      else toast.error(err.message || 'Server processing failed');
    } finally {
      setProcessing(null)
    }
  }

  const handleProcessPending = () => {
    const pendingItems = items.filter(i => i.status === 'pending')
    if (!pendingItems.length) { toast.info('No pending items to process'); return }
    if (!window.confirm(`Process ${pendingItems.length} pending items via server worker?`)) return
    processQueueMutation.mutate({ limit: 25 })
  }

  const handleProcessSelected = () => {
    if (!selected.size) { toast.info('No items selected'); return }
    const ids = Array.from(selected)
    if (!window.confirm(`Process ${ids.length} selected items via server worker?`)) return
    processQueueMutation.mutate({ itemIds: ids, limit: ids.length })
    setSelected(new Set())
  }

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleSelectAll = () => {
    const pending = filtered.filter(i => i.status === 'pending').map(i => i.id)
    if (selected.size === pending.length) setSelected(new Set())
    else setSelected(new Set(pending))
  }

  const filtered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus)
  const counts = Object.fromEntries(Object.keys(STATUS_META).map(s => [s, items.filter(i => i.status === s).length]))
  const pendingCount = counts.pending || 0
  const pendingInFiltered = filtered.filter(i => i.status === 'pending')
  const allPendingSelected = pendingInFiltered.length > 0 && pendingInFiltered.every(i => selected.has(i.id))

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Search className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Research Queue</h1>
          <p className="text-muted-foreground mt-2">Collect job notifications and process them through the server AI worker. Nothing is ever auto-published.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="process-pending-queue-btn"
            onClick={handleProcessPending}
            disabled={processQueueMutation.isPending || !pendingCount || isDevMode()}
            title={isDevMode() ? 'Requires Vercel deployment — not available in local dev' : undefined}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-blue-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          >
            {processQueueMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
              : <><Server className="w-4 h-4" />Process Pending ({pendingCount})</>}
          </button>
          {selected.size > 0 && (
            <button
              id="process-selected-queue-btn"
              onClick={handleProcessSelected}
              disabled={processQueueMutation.isPending || isDevMode()}
              title={isDevMode() ? 'Requires Vercel deployment — not available in local dev' : undefined}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-indigo-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-60"
            >
              <Play className="w-4 h-4" />Process Selected ({selected.size})
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-all">
            <Plus className="w-5 h-5" />Add to Queue
          </button>
        </div>
      </div>

      {/* Worker Status Banner */}
      <WorkerStatusBanner status={workerStatus} />

      {/* Process Result */}
      {processResult && <ProcessResultPanel result={processResult} onClose={() => setProcessResult(null)} />}

      {/* Add form */}
      {showAdd && (
        <div className="mb-6 rounded-[28px] border border-border/50 bg-card/80 p-5">
          <h3 className="font-bold text-lg mb-4">Add Job Notification</h3>
          <AddItemDrawer onClose={() => setShowAdd(false)} onCreate={(data) => createMutation.mutate(data)} />
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)} className={`rounded-2xl border p-3 text-left transition-all ${filterStatus === key ? meta.color : 'border-border/50 bg-card/50 hover:border-border'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-lg font-black">{counts[key] || 0}</span>
              </div>
              <p className="text-xs font-medium">{meta.label}</p>
            </button>
          )
        })}
      </div>

      {/* Queue list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-[20px] bg-muted/30 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Queue is empty</p>
          <p className="text-sm mt-2">Add job notifications manually or use Vacancy Monitoring to detect new postings.</p>
        </div>
      ) : (
        <div className="rounded-[28px] border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-bold text-lg">{filterStatus === 'all' ? 'All Items' : STATUS_META[filterStatus]?.label} ({filtered.length})</h2>
            {pendingInFiltered.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border"
                />
                Select all pending
              </label>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {filtered.map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onAction={handleAction}
                onServerProcess={handleServerProcess}
                processing={processing}
                selected={selected.has(item.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Server worker note */}
      <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-blue-700">
          <Server className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Server Worker Processing</p>
            <p className="text-blue-600/80">"Process via Server" uses the production QueueWorker path — the same path as the automated cron. This is the recommended way to process items as it ensures consistent quality scoring, provider fallback, and audit trail.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
