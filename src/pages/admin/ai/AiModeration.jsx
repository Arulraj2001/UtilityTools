import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Shield, CheckCircle2, XCircle, Eye, Pencil, ChevronRight,
  BarChart3, AlertTriangle, Zap, Clock, RefreshCw, X,
} from 'lucide-react'
import { getAiDrafts, updateAiDraft, createJob } from '@/api/supabaseApi'
import { scoreJob, scoreBg } from '@/lib/jobQualityScorer'

const STATUS_META = {
  pending_review:  { label: 'Pending Review', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  approved:        { label: 'Approved',       color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  needs_revision:  { label: 'Needs Revision', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  published:       { label: 'Published',      color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected:        { label: 'Rejected',       color: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

function ScorePill({ label, value, inverted = false }) {
  const cls = scoreBg(value, inverted)
  return (
    <div className={`rounded-lg px-2 py-1 text-center ${cls}`}>
      <p className="text-xs font-bold">{value}</p>
      <p className="text-[10px] opacity-80">{label}</p>
    </div>
  )
}

function DraftDrawer({ draft, onClose, onAction }) {
  const data = draft.generated_data || {}
  const scores = draft.quality_scores || scoreJob(data)
  const [publishing, setPublishing] = useState(false)
  const queryClient = useQueryClient()

  const handlePublish = async () => {
    setPublishing(true)
    try {
      // Build job payload from AI data
      const payload = {
        title: data.title || '',
        slug: data.slug || '',
        organization: data.organization || '',
        category: data.category || data.job_type || 'government',
        job_type: data.job_type || '',
        short_description: data.short_description || '',
        full_description: data.full_description || '',
        eligibility: data.eligibility || null,
        selection_process: data.selection_process || null,
        important_dates: data.important_dates || null,
        application_fee: data.application_fee || '',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
        seo_keywords: data.seo_keywords || '',
        canonical_url: data.canonical_url || '',
        faq_items: data.faq_items || null,
        tags: data.tags || null,
        status: 'draft',    // Always draft first — never auto-publish
        featured: false,
      }
      await createJob(payload)
      await updateAiDraft(draft.id, { status: 'published' })
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] })
      toast.success('Job created as Draft — go to Jobs Management to review and publish.')
      onClose()
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[92vw] lg:w-[860px]"
    >
      <div className="h-full bg-background border-l border-border/50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-background/90 backdrop-blur-xl shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Review Draft</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{data.organization || ''} — {draft.ai_provider}</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-2xl border border-border flex items-center justify-center hover:border-primary/30 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quality Scores */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Quality Scores</h3>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              <ScorePill label="Content"   value={scores.content}       />
              <ScorePill label="SEO"       value={scores.seo}           />
              <ScorePill label="EEAT"      value={scores.eeat}          />
              <ScorePill label="Adsense"   value={scores.adsense}       />
              <ScorePill label="Spam Risk" value={scores.spamRisk}  inverted />
              <ScorePill label="Dup Risk"  value={scores.duplicateRisk} inverted />
              <ScorePill label="Freshness" value={scores.freshness}     />
            </div>
            {scores.issues?.length > 0 && (
              <div className="mt-3 space-y-1">
                {scores.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-600">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{issue}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title & Slug */}
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-2">
            <h3 className="font-bold text-base">{data.title}</h3>
            <p className="text-xs text-muted-foreground font-mono">/{data.slug}</p>
            <p className="text-sm text-muted-foreground">{data.short_description}</p>
          </div>

          {/* SEO */}
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">SEO</h4>
            <p className="text-xs"><strong>Title:</strong> {data.seo_title} ({data.seo_title?.length || 0} chars)</p>
            <p className="text-xs"><strong>Description:</strong> {data.seo_description}</p>
            <p className="text-xs"><strong>Keywords:</strong> {data.seo_keywords}</p>
          </div>

          {/* Generated content preview */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Article Preview</h4>
            <div
              className="prose prose-sm max-w-none rounded-2xl border border-border/50 bg-card/50 p-5 text-sm overflow-y-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ __html: data.full_description || '<p>No content generated</p>' }}
            />
          </div>

          {/* Important dates */}
          {data.important_dates?.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
              <h4 className="font-semibold text-sm mb-3">Important Dates</h4>
              <div className="space-y-1">
                {data.important_dates.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{d.event}</span>
                    <span className="font-medium">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {data.faq_items?.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
              <h4 className="font-semibold text-sm mb-3">FAQ ({data.faq_items.length} questions)</h4>
              <div className="space-y-2">
                {data.faq_items.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium">Q: {f.question}</p>
                    <p className="text-xs text-muted-foreground">A: {f.answer}</p>
                  </div>
                ))}
                {data.faq_items.length > 3 && <p className="text-xs text-muted-foreground">+{data.faq_items.length - 3} more</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border/50 px-6 py-4 bg-background/90 backdrop-blur-xl shrink-0">
          {draft.status === 'pending_review' || draft.status === 'approved' ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create as Draft Job
              </button>
              <button onClick={() => onAction(draft.id, 'needs_revision')} className="h-10 px-4 rounded-2xl border border-orange-500/30 text-orange-500 text-sm font-medium hover:bg-orange-500/10 transition-all">
                Mark: Needs Revision
              </button>
              <button onClick={() => { onAction(draft.id, 'rejected'); onClose() }} className="h-10 px-4 rounded-2xl border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-all">
                Reject
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Status: <strong>{draft.status}</strong></p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            "Create as Draft Job" saves to the Jobs database as <strong>Draft</strong> status. You must go to Jobs Management to edit and publish.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function AiModeration() {
  const queryClient = useQueryClient()
  const [viewing, setViewing] = useState(null)
  const [filterStatus, setFilterStatus] = useState('pending_review')

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['ai-drafts'],
    queryFn: () => getAiDrafts({ limit: 100 }),
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAiDraft(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-drafts'] }),
    onError: (err) => toast.error(err.message),
  })

  const handleAction = (id, status) => updateMutation.mutate({ id, data: { status } })

  const filtered = filterStatus === 'all' ? drafts : drafts.filter(d => d.status === filterStatus)

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
          <Shield className="w-3.5 h-3.5" />AI Job Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight">AI Moderation</h1>
        <p className="text-muted-foreground mt-2">Review AI-generated drafts before they enter the job database. Every draft requires human approval.</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[['all', 'All'], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])].map(([key, label]) => {
          const count = key === 'all' ? drafts.length : drafts.filter(d => d.status === key).length
          return (
            <button key={key} onClick={() => setFilterStatus(key)} className={`h-8 px-3 rounded-xl text-xs font-medium transition-all ${filterStatus === key ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/50'}`}>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 rounded-[20px] bg-muted/30 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold">No drafts to review</p>
          <p className="text-sm mt-1">Generate drafts from the Research Queue to see them here.</p>
        </div>
      ) : (
        <div className="rounded-[28px] border border-border/50 bg-card/80 overflow-hidden">
          <div className="divide-y divide-border/50">
            {filtered.map(draft => {
              const data = draft.generated_data || {}
              const scores = draft.quality_scores || {}
              const meta = STATUS_META[draft.status] || STATUS_META.pending_review
              return (
                <div key={draft.id} className="px-5 py-4 hover:bg-primary/5 transition-colors group flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{draft.ai_provider}</span>
                      {scores.overall && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${scoreBg(scores.overall)}`}>Score: {scores.overall}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1">{data.title || '(Untitled)'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{data.organization || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewing(draft)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-medium hover:border-primary/40 hover:text-primary transition-all">
                      <Eye className="w-3.5 h-3.5" />Review
                    </button>
                    {draft.status === 'pending_review' && (
                      <button onClick={() => handleAction(draft.id, 'rejected')} className="h-9 w-9 rounded-xl border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewing(null)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <DraftDrawer draft={viewing} onClose={() => setViewing(null)} onAction={handleAction} />
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
