'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, Plus, Pencil, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock, Save, X } from 'lucide-react'
import {
  getMonitoringRules, createMonitoringRule, updateMonitoringRule, deleteMonitoringRule,
  createUpdateQueueItem, getAiProviders,
} from '@/api/supabaseApi'
import { callAI, extractJSON } from '@/lib/aiProvider'
import { buildUpdateDetectionPrompt } from '@/lib/jobWritingFramework'
import { format } from 'date-fns'

const FREQ_LABELS = { manual: 'Manual only', daily: 'Daily', weekly: 'Weekly' }

const EMPTY_FORM = { title: '', organization: '', source_url: '', check_frequency: 'manual', last_content: '' }

function RuleForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="rounded-[20px] border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Job / Notification Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. SSC CGL 2024 Notification" className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Organization</label>
          <input value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="e.g. Staff Selection Commission" className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Source URL</label>
          <input value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Check Frequency</label>
          <select value={form.check_frequency} onChange={e => set('check_frequency', e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="manual">Manual only</option>
            <option value="daily">Daily (manual trigger)</option>
            <option value="weekly">Weekly (manual trigger)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">
          Current Content Snapshot
          <span className="text-muted-foreground ml-1 font-normal">(paste the current notification text — this is the baseline for change detection)</span>
        </label>
        <textarea
          value={form.last_content}
          onChange={e => set('last_content', e.target.value)}
          rows={5}
          placeholder="Paste the full current notification text here. When you later check for updates, the new text will be compared against this baseline."
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSave(form)} className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
          <Save className="w-3.5 h-3.5" />Save Rule
        </button>
        <button onClick={onCancel} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-all">Cancel</button>
      </div>
    </div>
  )
}

function CheckDrawer({ rule, onClose, onUpdate }) {
  const [newContent, setNewContent] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const { data: providers = [] } = useQuery({ queryKey: ['ai-providers'], queryFn: getAiProviders })
  const queryClient = useQueryClient()

  const handleCheck = async () => {
    if (!newContent.trim()) { toast.error('Paste the updated notification content first'); return }
    const active = providers.filter(p => p.is_active && p.has_api_key)
    if (!active.length) { toast.error('Configure AI providers in AI Settings first'); return }

    setChecking(true)
    try {
      const prompt = buildUpdateDetectionPrompt(rule.last_content || '', newContent, rule.title)
      const { text } = await callAI(active, prompt)
      const parsed = extractJSON(text)
      setResult(parsed)

      if (parsed?.has_changes) {
        await createUpdateQueueItem({
          monitoring_id: rule.id,
          change_type: parsed.change_type || 'status_change',
          previous_data: { content: rule.last_content },
          new_data: { content: newContent },
          diff_summary: parsed.summary,
          ai_analysis: JSON.stringify(parsed.changes || []),
          status: 'pending',
        })
        toast.warning(`Changes detected: ${parsed.summary}`)
        queryClient.invalidateQueries({ queryKey: ['update-queue'] })
      } else {
        toast.success('No changes detected')
      }

      // Update rule with new snapshot
      await onUpdate(rule.id, {
        last_content: newContent,
        last_checked: new Date().toISOString(),
        changes_found: (rule.changes_found || 0) + (parsed?.has_changes ? 1 : 0),
      })
      queryClient.invalidateQueries({ queryKey: ['monitoring-rules'] })
    } catch (err) {
      toast.error(`Check failed: ${err.message}`)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-[28px] border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold">Check for Updates</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{rule.title}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block">
              Paste the NEW / Updated Notification Content
              <span className="text-muted-foreground ml-1 font-normal">(AI will compare this against the stored baseline)</span>
            </label>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={8}
              placeholder="Paste the latest version of the notification text from the official source…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          {result && (
            <div className={`rounded-2xl p-4 ${result.has_changes ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.has_changes ? <AlertTriangle className="w-4 h-4 text-yellow-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                <span className="font-semibold text-sm">{result.has_changes ? 'Changes Detected' : 'No Changes'}</span>
                {result.change_type && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{result.change_type}</span>}
              </div>
              {result.summary && <p className="text-sm">{result.summary}</p>}
              {result.changes?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.changes.map((c, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{c.field}:</span> {c.old_value} → <span className="font-medium">{c.new_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={handleCheck}
            disabled={checking || !newContent.trim()}
            className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Run AI Comparison
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AiMonitoring() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [checkingRule, setCheckingRule] = useState(null)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['monitoring-rules'],
    queryFn: () => getMonitoringRules({ limit: 100 }),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: createMonitoringRule,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitoring-rules'] }); setShowAdd(false); toast.success('Monitoring rule added') },
    onError: err => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMonitoringRule(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitoring-rules'] }); setEditingId(null) },
    onError: err => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMonitoringRule,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitoring-rules'] }); toast.success('Rule removed') },
    onError: err => toast.error(err.message),
  })

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Activity className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Vacancy Monitoring</h1>
          <p className="text-muted-foreground mt-2">Track official job notifications for changes. Paste updated content to trigger AI comparison.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shrink-0">
          <Plus className="w-4 h-4" />Add Rule
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border/50 bg-card/40 px-5 py-4 mb-6">
        <p className="text-sm font-medium mb-2">How vacancy monitoring works</p>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">1</span>Add a rule with the current notification text as baseline</div>
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">2</span>When you check a source, paste the latest content</div>
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-xs">3</span>AI compares and reports what changed — vacancy count, dates, eligibility, etc.</div>
        </div>
      </div>

      {showAdd && (
        <div className="mb-6">
          <RuleForm onSave={data => createMutation.mutate(data)} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 rounded-[20px] bg-muted/30 animate-pulse"/>)}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No monitoring rules yet</p>
          <p className="text-sm mt-1">Add rules for job notifications you want to track for changes.</p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
          <div className="divide-y divide-border/50">
            {rules.map(rule => (
              <div key={rule.id}>
                {editingId === rule.id ? (
                  <div className="p-4">
                    <RuleForm initial={rule} onSave={data => updateMutation.mutate({ id: rule.id, data })} onCancel={() => setEditingId(null)} />
                  </div>
                ) : (
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/20 transition-colors group">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{rule.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {rule.organization && <span className="text-xs text-muted-foreground">{rule.organization}</span>}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{FREQ_LABELS[rule.check_frequency] || 'Manual'}
                        </span>
                        {rule.last_checked && <span className="text-xs text-muted-foreground">Last: {format(new Date(rule.last_checked), 'MMM d')}</span>}
                        {rule.changes_found > 0 && <span className="text-xs text-yellow-600 font-medium">{rule.changes_found} change(s) found</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setCheckingRule(rule)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-all">
                        <Activity className="w-3.5 h-3.5" />Check Now
                      </button>
                      <button onClick={() => setEditingId(rule.id)} className="h-8 w-8 rounded-xl border border-border flex items-center justify-center hover:border-primary/40 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm('Remove this rule?')) deleteMutation.mutate(rule.id) }} className="h-8 w-8 rounded-xl border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {checkingRule && (
        <CheckDrawer rule={checkingRule} onClose={() => setCheckingRule(null)} onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })} />
      )}
    </main>
  )
}
