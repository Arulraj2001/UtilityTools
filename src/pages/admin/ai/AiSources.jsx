import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Globe, Plus, Pencil, Trash2, Star, Shield, Link2, X, Save } from 'lucide-react'
import { getAiSources, createAiSource, updateAiSource, deleteAiSource } from '@/api/supabaseApi'

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

export default function AiSources() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterTier, setFilterTier] = useState('all')

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['ai-sources'],
    queryFn: () => getAiSources(),
    retry: false,
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

  const filtered = filterTier === 'all' ? sources : sources.filter(s => s.tier === Number(filterTier))
  const grouped = { 1: filtered.filter(s=>s.tier===1), 2: filtered.filter(s=>s.tier===2), 3: filtered.filter(s=>s.tier===3) }

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
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />Add Source
        </button>
      </div>

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
    </main>
  )
}
