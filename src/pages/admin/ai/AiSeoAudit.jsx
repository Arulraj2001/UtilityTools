import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Wand2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getJobs, updateJob, getAiProviders } from '@/api/supabaseApi'
import { callAI, extractJSON } from '@/lib/aiProvider'
import { buildSeoPrompt } from '@/lib/jobWritingFramework'
import { scoreJob, scoreBg } from '@/lib/jobQualityScorer'

function SeoScoreBar({ value, label, inverted = false }) {
  const pct = inverted ? 100 - value : value
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-6 text-right">{value}</span>
    </div>
  )
}

function JobAuditRow({ job, onGenerateSeo }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const scores = scoreJob(job)

  const seoComplete = job.seo_title && job.seo_description && job.seo_keywords
  const statusIcon = seoComplete
    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
    : scores.seo < 50
    ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
    : <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerateSeo(job)
    setGenerating(false)
  }

  return (
    <div className={`border-b border-border/50 last:border-0 ${!seoComplete ? 'bg-yellow-50/5' : ''}`}>
      <div
        className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{job.title}</p>
          <p className="text-xs text-muted-foreground">{job.organization}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBg(scores.seo)}`}>SEO {scores.seo}</span>
        {!seoComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate() }}
            disabled={generating}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Generate
          </button>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          <div className="space-y-1.5">
            <SeoScoreBar label="SEO" value={scores.seo} />
            <SeoScoreBar label="Content" value={scores.content} />
            <SeoScoreBar label="EEAT" value={scores.eeat} />
            <SeoScoreBar label="Adsense" value={scores.adsense} />
            <SeoScoreBar label="Spam Risk" value={scores.spamRisk} inverted />
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="font-medium mb-0.5">SEO Title <span className="text-muted-foreground">({job.seo_title?.length || 0}/60)</span></p>
              <p className="text-muted-foreground">{job.seo_title || <em className="text-red-400">Missing</em>}</p>
            </div>
            <div>
              <p className="font-medium mb-0.5">SEO Description <span className="text-muted-foreground">({job.seo_description?.length || 0}/160)</span></p>
              <p className="text-muted-foreground line-clamp-2">{job.seo_description || <em className="text-red-400">Missing</em>}</p>
            </div>
            <div>
              <p className="font-medium mb-0.5">Keywords</p>
              <p className="text-muted-foreground">{job.seo_keywords || <em className="text-red-400">Missing</em>}</p>
            </div>
          </div>
          {scores.issues?.length > 0 && (
            <div className="space-y-1">
              {scores.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-600">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{issue}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AiSeoAudit() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterMissing, setFilterMissing] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['all-jobs-seo'],
    queryFn: () => getJobs({ published: false, limit: 500 }),
  })

  const { data: providers = [] } = useQuery({ queryKey: ['ai-providers'], queryFn: getAiProviders })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateJob(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-jobs-seo'] }),
  })

  const generateSeo = async (job) => {
    const activeProviders = providers.filter(p => p.is_active && p.api_key)
    if (!activeProviders.length) { toast.error('Configure AI providers in AI Settings first'); return }
    try {
      const { text } = await callAI(activeProviders, buildSeoPrompt(job))
      const seoData = extractJSON(text)
      if (!seoData) { toast.error('AI returned invalid JSON'); return }
      await updateMutation.mutateAsync({ id: job.id, data: {
        seo_title: seoData.seo_title || job.seo_title,
        seo_description: seoData.seo_description || job.seo_description,
        seo_keywords: seoData.seo_keywords || job.seo_keywords,
        slug: (!job.slug || job.slug === '') ? (seoData.slug || job.slug) : job.slug,
      }})
      toast.success(`SEO generated for: ${job.title}`)
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    }
  }

  const handleBatchGenerate = async () => {
    const missing = jobs.filter(j => !j.seo_title || !j.seo_description)
    if (!missing.length) { toast.success('All jobs already have SEO data'); return }
    if (!confirm(`Generate SEO for ${Math.min(missing.length, 20)} jobs with missing metadata?`)) return

    setBatchRunning(true)
    for (const job of missing.slice(0, 20)) {
      await generateSeo(job)
    }
    setBatchRunning(false)
    toast.success('Batch SEO generation complete')
  }

  const filtered = jobs
    .filter(j => !filterMissing || !j.seo_title || !j.seo_description || !j.seo_keywords)
    .filter(j => !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.organization?.toLowerCase().includes(search.toLowerCase()))

  const missingCount = jobs.filter(j => !j.seo_title || !j.seo_description).length
  const avgScore = jobs.length ? Math.round(jobs.reduce((sum, j) => sum + scoreJob(j).seo, 0) / jobs.length) : 0

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Search className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">SEO Audit</h1>
          <p className="text-muted-foreground mt-2">Audit and auto-generate SEO metadata for all job posts using AI.</p>
        </div>
        <button
          onClick={handleBatchGenerate}
          disabled={batchRunning || isLoading}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
        >
          {batchRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Batch Generate SEO
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className="text-3xl font-black text-primary">{jobs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Jobs</p>
        </div>
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className="text-3xl font-black text-red-500">{missingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Missing SEO</p>
        </div>
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className={`text-3xl font-black ${avgScore >= 70 ? 'text-green-500' : avgScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{avgScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg SEO Score</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…" className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={() => setFilterMissing(!filterMissing)} className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${filterMissing ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/50'}`}>
          Missing Only ({missingCount})
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-14 rounded-[20px] bg-muted/30 animate-pulse"/>)}</div>
      ) : (
        <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/40" />
              <p className="font-semibold">All jobs have complete SEO data</p>
            </div>
          ) : (
            <div>
              {filtered.map(job => (
                <JobAuditRow key={job.id} job={job} onGenerateSeo={generateSeo} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
