import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { getJobs } from '@/api/supabaseApi'
import { getAiDrafts, getResearchQueue } from '@/api/supabaseApi'
import { scoreJob, scoreBg } from '@/lib/jobQualityScorer'
import { exportToCsv } from '@/lib/blogExportEngine'

function ScoreDistributionBar({ label, buckets }) {
  const max = Math.max(...Object.values(buckets), 1)
  return (
    <div>
      <p className="text-xs font-medium mb-2">{label}</p>
      <div className="flex items-end gap-1 h-16">
        {Object.entries(buckets).map(([range, count]) => (
          <div key={range} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(count / max) * 56}px`, minHeight: count > 0 ? '4px' : '0' }} />
            <span className="text-[9px] text-muted-foreground">{range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="rounded-[20px] border border-border/50 bg-card/80 p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export default function AiReports() {
  const [sortBy, setSortBy] = useState('overall')

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['all-jobs-report'],
    queryFn: () => getJobs({ published: false, limit: 500 }),
  })

  const { data: drafts = [] } = useQuery({
    queryKey: ['ai-drafts-report'],
    queryFn: () => getAiDrafts({ limit: 200 }),
    retry: false,
  })

  const { data: queue = [] } = useQuery({
    queryKey: ['research-queue-report'],
    queryFn: () => getResearchQueue({ limit: 200 }),
    retry: false,
  })

  const scoredJobs = useMemo(() =>
    jobs.map(j => ({ ...j, _scores: scoreJob(j) })),
    [jobs]
  )

  const avgScores = useMemo(() => {
    if (!scoredJobs.length) return {}
    const dims = ['content', 'seo', 'eeat', 'adsense', 'spamRisk', 'duplicateRisk', 'freshness', 'overall']
    return Object.fromEntries(dims.map(d => [d, Math.round(scoredJobs.reduce((s, j) => s + (j._scores[d] || 0), 0) / scoredJobs.length)]))
  }, [scoredJobs])

  const distributionBuckets = useMemo(() => {
    const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
    scoredJobs.forEach(j => {
      const s = j._scores.overall
      if (s <= 20)       buckets['0-20']++
      else if (s <= 40)  buckets['21-40']++
      else if (s <= 60)  buckets['41-60']++
      else if (s <= 80)  buckets['61-80']++
      else               buckets['81-100']++
    })
    return buckets
  }, [scoredJobs])

  const bottomJobs = useMemo(() =>
    [...scoredJobs].sort((a, b) => (a._scores[sortBy] || 0) - (b._scores[sortBy] || 0)).slice(0, 10),
    [scoredJobs, sortBy]
  )

  const issueCount = useMemo(() => scoredJobs.reduce((sum, j) => sum + (j._scores.issues?.length || 0), 0), [scoredJobs])
  const adsenseRisk = useMemo(() => scoredJobs.filter(j => j._scores.adsense < 70).length, [scoredJobs])
  const spamRisk = useMemo(() => scoredJobs.filter(j => j._scores.spamRisk > 30).length, [scoredJobs])

  const handleExportReport = () => {
    const rows = scoredJobs.map(j => ({
      Title: j.title,
      Organization: j.organization,
      Status: j.status,
      'Content Score': j._scores.content,
      'SEO Score': j._scores.seo,
      'EEAT Score': j._scores.eeat,
      'Adsense Score': j._scores.adsense,
      'Spam Risk': j._scores.spamRisk,
      'Overall Score': j._scores.overall,
      'Score Label': j._scores.label,
    }))
    // Use XLSX directly for CSV export of report data
    import('xlsx').then(({ default: XLSX }) => {
      import('file-saver').then(({ saveAs }) => {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, 'Quality Report')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'ai-quality-report.xlsx')
      })
    })
  }

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <BarChart3 className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">Quality Reports</h1>
          <p className="text-muted-foreground mt-2">Comprehensive quality analysis across all job posts and AI-generated drafts.</p>
        </div>
        <button onClick={handleExportReport} disabled={!scoredJobs.length} className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl border border-border font-semibold text-sm hover:bg-muted/50 transition-all disabled:opacity-50 shrink-0">
          <Download className="w-4 h-4" />Export Report
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Jobs" value={jobs.length} sub={`${jobs.filter(j=>j.status==='published').length} published`} icon={BarChart3} />
        <MetricCard label="Avg Overall Score" value={avgScores.overall || 0} sub={avgScores.overall >= 70 ? 'Good' : 'Needs work'} icon={avgScores.overall >= 70 ? TrendingUp : TrendingDown} color={avgScores.overall >= 70 ? 'text-green-500' : 'text-red-500'} />
        <MetricCard label="Adsense Risk Jobs" value={adsenseRisk} sub="Score below 70" icon={AlertTriangle} color="text-yellow-500" />
        <MetricCard label="Spam Risk Jobs" value={spamRisk} sub="Risk above 30" icon={AlertTriangle} color="text-red-500" />
      </div>

      {/* AI pipeline stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className="text-2xl font-black text-primary">{queue.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Research Queue Items</p>
        </div>
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className="text-2xl font-black text-blue-500">{drafts.filter(d=>d.status==='pending_review').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting Moderation</p>
        </div>
        <div className="rounded-[20px] border border-border/50 bg-card/80 p-4 text-center">
          <p className="text-2xl font-black text-green-500">{drafts.filter(d=>d.status==='published').length}</p>
          <p className="text-xs text-muted-foreground mt-1">AI Drafts Published</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Score distribution */}
        <div className="rounded-[24px] border border-border/50 bg-card/80 p-5">
          <h3 className="font-bold mb-4">Overall Score Distribution</h3>
          {jobsLoading ? <div className="h-24 bg-muted/30 rounded-xl animate-pulse" /> : <ScoreDistributionBar label="Number of jobs per score range" buckets={distributionBuckets} />}
        </div>

        {/* Average scores */}
        <div className="rounded-[24px] border border-border/50 bg-card/80 p-5">
          <h3 className="font-bold mb-4">Average Scores</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Content Quality', key: 'content' },
              { label: 'SEO', key: 'seo' },
              { label: 'EEAT', key: 'eeat' },
              { label: 'Adsense Safety', key: 'adsense' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${(avgScores[key]||0) >= 70 ? 'bg-green-500' : (avgScores[key]||0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${avgScores[key] || 0}%` }} />
                </div>
                <span className="text-xs font-bold w-6 text-right">{avgScores[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom performers */}
      <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold">Jobs Needing Improvement</h3>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-8 px-2 text-xs rounded-xl border border-border bg-background focus:outline-none">
            <option value="overall">Sort by Overall</option>
            <option value="seo">Sort by SEO</option>
            <option value="content">Sort by Content</option>
            <option value="adsense">Sort by Adsense</option>
          </select>
        </div>
        <div className="divide-y divide-border/50">
          {jobsLoading ? (
            [1,2,3].map(i => <div key={i} className="h-12 m-3 bg-muted/30 rounded-xl animate-pulse" />)
          ) : bottomJobs.map(job => (
            <div key={job.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.organization}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {['content','seo','eeat','adsense'].map(k => (
                  <div key={k} className={`text-center px-2 py-0.5 rounded-lg text-xs font-medium ${scoreBg(job._scores[k])}`}>
                    {k.toUpperCase().slice(0,3)}: {job._scores[k]}
                  </div>
                ))}
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg font-bold ${scoreBg(job._scores.overall)}`}>{job._scores.overall}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
