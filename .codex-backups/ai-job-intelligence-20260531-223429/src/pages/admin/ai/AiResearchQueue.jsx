import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, Plus, Brain, Trash2, Sparkles, Clock, CheckCircle2,
  XCircle, Bookmark, AlertTriangle, RefreshCw, ChevronRight,
  FileText, X, Wand2,
} from 'lucide-react'
import {
  getResearchQueue, createResearchItem, updateResearchItem, deleteResearchItem,
  createAiDraft, getAiProviders, getAiPrompts,
} from '@/api/supabaseApi'
import { callAI, extractJSON } from '@/lib/aiProvider'
import { buildJobPrompt, JOB_TYPES } from '@/lib/jobWritingFramework'
import { scoreJob } from '@/lib/jobQualityScorer'

const STATUS_META = {
  pending:      { label: 'Pending',        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',   icon: Clock },
  processing:   { label: 'Processing',     color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',         icon: RefreshCw },
  drafted:      { label: 'Draft Created',  color: 'bg-green-500/10 text-green-600 border-green-500/20',      icon: CheckCircle2 },
  rejected:     { label: 'Rejected',       color: 'bg-red-500/10 text-red-500 border-red-500/20',            icon: XCircle },
  saved_later:  { label: 'Saved for Later',color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',   icon: Bookmark },
}

const EMPTY_FORM = { title: '', organization: '', job_type: 'government', source_url: '', raw_input: '', notes: '' }

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

function QueueItem({ item, onAction, onGenerate, generating }) {
  const meta = STATUS_META[item.status] || STATUS_META.pending
  const StatusIcon = meta.icon

  return (
    <div className="px-5 py-4 hover:bg-primary/5 transition-colors group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
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
              onClick={() => onGenerate(item)}
              disabled={generating === item.id}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {generating === item.id
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Generating…</>
                : <><Wand2 className="w-3.5 h-3.5" />Generate Draft</>}
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
  const [generating, setGenerating] = useState(null)
  const abortRef = useRef(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['research-queue'],
    queryFn: () => getResearchQueue({ limit: 200 }),
    retry: false,
  })

  const { data: providers = [] } = useQuery({ queryKey: ['ai-providers'], queryFn: getAiProviders })
  const { data: prompts = [] }   = useQuery({ queryKey: ['ai-prompts'],   queryFn: getAiPrompts })

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

  const handleAction = (id, status) => updateMutation.mutate({ id, data: { status } })

  const handleGenerate = async (item) => {
    const activeProviders = providers.filter(p => p.is_active && p.api_key)
    if (!activeProviders.length) {
      toast.error('No AI providers configured. Go to AI Settings first.')
      return
    }

    setGenerating(item.id)
    updateMutation.mutate({ id: item.id, data: { status: 'processing' } })

    try {
      const systemPrompt = prompts.find(p => p.job_type === item.job_type)?.prompt_text || ''
      const jobData = {
        title: item.title,
        organization: item.organization,
        source_url: item.source_url,
        notification_text: item.raw_input,
        ...item.extracted_data,
      }

      const prompt = buildJobPrompt({ jobData, jobType: item.job_type, systemPrompt, extraInstructions: item.notes || '' })

      const t0 = Date.now()
      const { text, provider: usedProvider, tokensUsed } = await callAI(activeProviders, prompt)
      const durationMs = Date.now() - t0

      const parsed = extractJSON(text)
      if (!parsed) {
        toast.error('AI returned invalid JSON. Try again or switch provider.')
        updateMutation.mutate({ id: item.id, data: { status: 'pending' } })
        return
      }

      const scores = scoreJob(parsed)

      const promptRecord = prompts.find(p => p.job_type === item.job_type)
      await createAiDraft({
        queue_item_id: item.id,
        job_type: item.job_type,
        ai_provider: usedProvider,
        prompt_id: promptRecord?.id || null,
        generated_data: parsed,
        quality_scores: scores,
        tokens_used: tokensUsed || 0,
        generation_ms: durationMs,
        status: 'pending_review',
      })

      updateMutation.mutate({ id: item.id, data: { status: 'drafted' } })
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] })
      toast.success(`Draft created via ${usedProvider} in ${(durationMs/1000).toFixed(1)}s`)
    } catch (err) {
      toast.error(`Generation failed: ${err.message}`)
      updateMutation.mutate({ id: item.id, data: { status: 'pending' } })
    } finally {
      setGenerating(null)
    }
  }

  const filtered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus)
  const counts = Object.fromEntries(Object.keys(STATUS_META).map(s => [s, items.filter(i => i.status === s).length]))

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Search className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Research Queue</h1>
          <p className="text-muted-foreground mt-2">Collect job notifications, review them, and generate AI-drafted articles. Nothing is ever auto-published.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-all">
          <Plus className="w-5 h-5" />Add to Queue
        </button>
      </div>

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
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-bold text-lg">{filterStatus === 'all' ? 'All Items' : STATUS_META[filterStatus]?.label} ({filtered.length})</h2>
          </div>
          <div className="divide-y divide-border/50">
            {filtered.map(item => (
              <QueueItem key={item.id} item={item} onAction={handleAction} onGenerate={handleGenerate} generating={generating} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
