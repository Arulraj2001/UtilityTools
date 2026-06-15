'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookOpen, Save, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { getAiPrompts, updateAiPrompt } from '@/api/supabaseApi'
import { JOB_TYPES } from '@/lib/jobWritingFramework'

const JOB_TYPE_COLORS = {
  government: 'from-blue-500 to-indigo-500',
  bank:       'from-emerald-500 to-teal-500',
  railway:    'from-orange-500 to-amber-500',
  it:         'from-purple-500 to-violet-500',
  remote:     'from-pink-500 to-rose-500',
  freshers:   'from-cyan-500 to-sky-500',
  private:    'from-slate-500 to-gray-500',
}

function PromptCard({ prompt, onSave }) {
  const [text, setText] = useState(prompt.prompt_text || '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const typeLabel = JOB_TYPES.find((t) => t.value === prompt.job_type)?.label || prompt.job_type
  const color = JOB_TYPE_COLORS[prompt.job_type] || 'from-gray-500 to-slate-500'

  const handleSave = async () => {
    setSaving(true)
    await onSave(prompt.id, { prompt_text: text })
    setDirty(false)
    setSaving(false)
  }

  return (
    <div className="rounded-[24px] border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`bg-gradient-to-r ${color} p-0.5`}>
          <div className="bg-card rounded-t-[23px] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">{prompt.name || typeLabel}</p>
                <p className="text-xs text-muted-foreground capitalize">{prompt.job_type} jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dirty && <span className="text-xs text-yellow-500 font-medium">Unsaved</span>}
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This is the <strong>system persona</strong> for this job type. It tells the AI who it is and how to approach the writing. The 17-section structure, anti-spam rules, and output format are always enforced separately — only customize the persona and style here.
            </p>
          </div>

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setDirty(true) }}
            rows={6}
            className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
            placeholder="Enter the system persona prompt for this job type…"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length} characters</span>
            <div className="flex gap-2">
              {dirty && (
                <button
                  onClick={() => { setText(prompt.prompt_text || ''); setDirty(false) }}
                  className="h-8 px-3 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 transition-all"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiPrompts() {
  const queryClient = useQueryClient()

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: getAiPrompts,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAiPrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompts'] })
      toast.success('Prompt saved')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = async (id, data) => {
    updateMutation.mutate({ id, data })
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
          <BookOpen className="w-3.5 h-3.5" />AI Job Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight">Prompt Management</h1>
        <p className="text-muted-foreground mt-2">
          Customize the AI system persona for each job type. The 17-section structure and anti-spam rules are always enforced automatically.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-border/50 bg-card/40 px-5 py-4">
        <p className="text-sm font-medium mb-1">What to write in prompts</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
          <li>Describe the AI's <strong>role and expertise</strong> (e.g., "You are an expert railway recruitment writer")</li>
          <li>Mention any <strong>sector-specific knowledge</strong> (e.g., "You know CWE scores, IBPS PO patterns")</li>
          <li>Specify <strong>tone</strong> (e.g., "Write for first-time job seekers, explain jargon clearly")</li>
          <li>Do NOT add output format instructions — those are handled automatically</li>
        </ul>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-[24px] bg-muted/30 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} onSave={handleSave} />
          ))}
        </div>
      )}
    </main>
  )
}
