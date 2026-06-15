'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { getDuplicateLog, resolveDuplicate, createDuplicateLog, getAiProviders, getResearchQueue } from '@/api/supabaseApi'
import { getJobs } from '@/api/supabaseApi'
import { callAI, extractJSON } from '@/lib/aiProvider'
import { buildDuplicateCheckPrompt } from '@/lib/jobWritingFramework'

function RiskBadge({ score }) {
  if (score >= 80) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-medium">High Risk {score}%</span>
  if (score >= 50) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 font-medium">Medium {score}%</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 font-medium">Low {score}%</span>
}

export default function AiDuplicates() {
  const queryClient = useQueryClient()
  const [checking, setChecking] = useState(false)
  const [filterResolved, setFilterResolved] = useState(false)

  const { data: dupes = [], isLoading } = useQuery({
    queryKey: ['duplicate-log', filterResolved],
    queryFn: () => getDuplicateLog({ resolved: filterResolved, limit: 100 }),
    retry: false,
  })

  const { data: jobs = [] }      = useQuery({ queryKey: ['all-jobs-pub'], queryFn: () => getJobs({ published: false, limit: 500 }) })
  const { data: queue = [] }     = useQuery({ queryKey: ['research-queue'], queryFn: () => getResearchQueue({ status: 'pending', limit: 50 }) })
  const { data: providers = [] } = useQuery({ queryKey: ['ai-providers'], queryFn: getAiProviders })

  const resolveMutation = useMutation({
    mutationFn: ({ id, isDuplicate }) => resolveDuplicate(id, isDuplicate),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['duplicate-log'] }); toast.success('Resolved') },
    onError: (err) => toast.error(err.message),
  })

  const handleAiCheck = async () => {
    if (!queue.length) { toast.error('No pending queue items to check'); return }
    const activeProviders = providers.filter(p => p.is_active && p.has_api_key)
    if (!activeProviders.length) { toast.error('Configure AI providers in AI Settings first'); return }

    setChecking(true)
    let checked = 0

    for (const item of queue.slice(0, 10)) {
      try {
        const prompt = buildDuplicateCheckPrompt(
          { title: item.title, organization: item.organization, short_description: item.raw_input },
          jobs
        )
        const { text } = await callAI(activeProviders, prompt)
        const result = extractJSON(text)
        if (result?.is_duplicate || result?.confidence > 60) {
          const matchedIndex = Array.isArray(result.matched_indices) ? result.matched_indices[0] : null
          const matchedJob = Number.isFinite(Number(matchedIndex)) ? jobs[Number(matchedIndex) - 1] : null
          await createDuplicateLog({
            queue_item_id: item.id,
            matched_job_id: matchedJob?.id || null,
            check_type: 'content',
            similarity: Number(result.confidence || 0),
            is_duplicate: !!result.is_duplicate,
            details: result,
            resolved: false,
          })
          toast.warning(`Potential duplicate: "${item.title}" - ${result?.confidence}% confidence`)
        }
        checked++
      } catch { /* skip */ }
    }
    queryClient.invalidateQueries({ queryKey: ['duplicate-log'] })
    toast.success(`Checked ${checked} items`)
    setChecking(false)
  }

  const pending = dupes.filter(d => !d.resolved)
  const resolved = dupes.filter(d => d.resolved)

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Copy className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Duplicate Detection</h1>
          <p className="text-muted-foreground mt-2">AI-powered duplicate checking prevents publishing the same job notification twice.</p>
        </div>
        <button
          onClick={handleAiCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
        >
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Run AI Check
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: pending.length, color: 'text-yellow-500' },
          { label: 'Confirmed Duplicates', value: dupes.filter(d => d.is_duplicate && d.resolved).length, color: 'text-red-500' },
          { label: 'Cleared', value: dupes.filter(d => !d.is_duplicate && d.resolved).length, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border/50 bg-card/40 px-5 py-4 mb-6">
        <p className="text-sm font-medium mb-1">How duplicate detection works</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
          <li>AI compares title, organization, and content similarity against existing jobs</li>
          <li>Items with &gt;60% similarity are flagged for review — never auto-rejected</li>
          <li>Run AI Check on pending queue items to generate similarity analysis</li>
          <li>You decide: confirm as duplicate (skip) or clear as unique (allow through)</li>
        </ul>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[false, true].map(resolved => (
          <button key={String(resolved)} onClick={() => setFilterResolved(resolved)} className={`h-8 px-3 rounded-xl text-xs font-medium transition-all ${filterResolved === resolved ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/50'}`}>
            {resolved ? 'Resolved' : `Pending (${pending.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 rounded-[20px] bg-muted/30 animate-pulse"/>)}</div>
      ) : dupes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Copy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">{filterResolved ? 'No resolved items' : 'No pending duplicate alerts'}</p>
          <p className="text-sm mt-1">Run an AI Check on queue items to detect potential duplicates.</p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
          <div className="divide-y divide-border/50">
            {dupes.map(d => (
              <div key={d.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge score={Math.round(d.similarity || 0)} />
                    <span className="text-xs text-muted-foreground capitalize">{d.check_type}</span>
                  </div>
                  <p className="font-semibold text-sm">{d.ai_research_queue?.title || '(Queue item)'}</p>
                  {d.details?.reason && <p className="text-xs text-muted-foreground mt-0.5">{d.details.reason}</p>}
                </div>
                {!d.resolved && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => resolveMutation.mutate({ id: d.id, isDuplicate: false })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-green-500/30 text-green-600 text-xs font-medium hover:bg-green-500/10 transition-all">
                      <CheckCircle2 className="w-3.5 h-3.5" />Clear — Unique
                    </button>
                    <button onClick={() => resolveMutation.mutate({ id: d.id, isDuplicate: true })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-red-500/30 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-all">
                      <XCircle className="w-3.5 h-3.5" />Duplicate — Skip
                    </button>
                  </div>
                )}
                {d.resolved && (
                  <span className={`text-xs font-medium ${d.is_duplicate ? 'text-red-500' : 'text-green-600'}`}>
                    {d.is_duplicate ? '✕ Duplicate' : '✓ Cleared'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
