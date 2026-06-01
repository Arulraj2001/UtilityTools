import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Brain, Search, Shield, Copy, BarChart3, Activity,
  GitCompare, Globe, Settings, BookOpen, ChevronRight,
  Zap, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import { getResearchQueue, getAiDrafts, getMonitoringRules, getUpdateQueue, getAiProviders } from '@/api/supabaseApi'
import { getJobs } from '@/api/supabaseApi'
import { scoreJob } from '@/lib/jobQualityScorer'
import { useMemo } from 'react'

const AI_NAV = [
  { to: '/admin/ai-research',    label: 'Research Queue',      icon: Search,    desc: 'Collect & process job notifications',  color: 'from-blue-500 to-cyan-500' },
  { to: '/admin/ai-moderation',  label: 'AI Moderation',       icon: Shield,    desc: 'Review AI-generated drafts',            color: 'from-purple-500 to-pink-500' },
  { to: '/admin/ai-duplicates',  label: 'Duplicate Detection', icon: Copy,      desc: 'Prevent duplicate job posts',           color: 'from-orange-500 to-red-500' },
  { to: '/admin/ai-seo-audit',   label: 'SEO Audit',           icon: BarChart3, desc: 'Auto-generate SEO metadata',           color: 'from-green-500 to-emerald-500' },
  { to: '/admin/ai-monitoring',  label: 'Vacancy Monitoring',  icon: Activity,  desc: 'Track notification changes',            color: 'from-teal-500 to-cyan-500' },
  { to: '/admin/ai-updates',     label: 'Job Updates',         icon: GitCompare,desc: 'Review detected changes',               color: 'from-indigo-500 to-blue-500' },
  { to: '/admin/ai-sources',     label: 'Sources',             icon: Globe,     desc: 'Manage Tier 1/2/3 job sources',         color: 'from-pink-500 to-rose-500' },
  { to: '/admin/ai-prompts',     label: 'Prompt Management',   icon: BookOpen,  desc: 'Edit AI writing prompts per job type', color: 'from-yellow-500 to-orange-500' },
  { to: '/admin/ai-settings',    label: 'AI Settings',         icon: Settings,  desc: 'Configure provider chain & API keys',  color: 'from-gray-500 to-slate-500' },
  { to: '/admin/ai-reports',     label: 'Quality Reports',     icon: BarChart3, desc: 'Content quality analytics',            color: 'from-violet-500 to-purple-500' },
]

function StatCard({ label, value, sub, color = 'text-foreground', icon: Icon }) {
  return (
    <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function NavCard({ item }) {
  const Icon = item.icon
  return (
    <Link to={item.to} className="group rounded-[20px] border border-border/50 bg-card/80 hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden">
      <div className={`bg-gradient-to-r ${item.color} p-0.5`}>
        <div className="bg-card rounded-t-[19px] px-4 py-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </div>
    </Link>
  )
}

export default function AiDashboard() {
  const { data: queue = [] }    = useQuery({ queryKey: ['research-queue'],  queryFn: () => getResearchQueue({ limit: 100 }), retry: false })
  const { data: drafts = [] }   = useQuery({ queryKey: ['ai-drafts'],       queryFn: () => getAiDrafts({ limit: 100 }),      retry: false })
  const { data: monitors = [] } = useQuery({ queryKey: ['monitoring-rules'],queryFn: () => getMonitoringRules({ limit: 50 }), retry: false })
  const { data: updates = [] }  = useQuery({ queryKey: ['update-queue'],    queryFn: () => getUpdateQueue({ status: 'pending', limit: 50 }), retry: false })
  const { data: providers = [] }= useQuery({ queryKey: ['ai-providers'],    queryFn: getAiProviders, retry: false })
  const { data: jobs = [] }     = useQuery({ queryKey: ['all-jobs-dash'],   queryFn: () => getJobs({ published: false, limit: 200 }) })

  const activeProviders = providers.filter(p => p.is_active && p.has_api_key)
  const pendingQueue    = queue.filter(q => q.status === 'pending')
  const pendingDrafts   = drafts.filter(d => d.status === 'pending_review')
  const pendingUpdates  = updates.length

  const avgScore = useMemo(() => {
    if (!jobs.length) return 0
    return Math.round(jobs.reduce((sum, j) => sum + scoreJob(j).overall, 0) / jobs.length)
  }, [jobs])

  const alerts = []
  if (!activeProviders.length) alerts.push({ level: 'error',   msg: 'No AI providers configured — go to AI Settings' })
  if (pendingDrafts.length > 0) alerts.push({ level: 'warning', msg: `${pendingDrafts.length} draft(s) awaiting moderation review` })
  if (pendingUpdates > 0)       alerts.push({ level: 'warning', msg: `${pendingUpdates} job update(s) need review` })
  if (pendingQueue.length > 5)  alerts.push({ level: 'info',    msg: `${pendingQueue.length} items in research queue` })
  if (avgScore < 50)            alerts.push({ level: 'warning', msg: `Average content quality score is ${avgScore} — run SEO Audit` })

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
          <Brain className="w-3.5 h-3.5" />AI Job Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight">Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Central command for AI-assisted job content production. Reduce admin time by 90% while maintaining full human review before any post goes live.
        </p>
      </div>

      {/* System status */}
      <div className={`rounded-2xl border px-5 py-3 flex items-center gap-3 mb-6 ${activeProviders.length ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
        {activeProviders.length ? <Zap className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
        <span className="text-sm font-medium">
          {activeProviders.length
            ? `AI system active — ${activeProviders.map(p => p.provider_name).join(' → ')} fallback chain ready`
            : 'AI system offline — configure at least one provider in AI Settings'}
        </span>
        <Link to="/admin/ai-settings" className="ml-auto text-xs underline hover:no-underline">Configure →</Link>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <div key={i} className={`rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm ${a.level === 'error' ? 'bg-red-500/10 text-red-600' : a.level === 'warning' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-blue-500/10 text-blue-600'}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Queue"    value={pendingQueue.length}  sub="Awaiting generation"   icon={Clock}         color="text-yellow-500" />
        <StatCard label="Drafts to Review" value={pendingDrafts.length} sub="Awaiting moderation"   icon={Shield}        color="text-blue-500" />
        <StatCard label="Change Alerts"    value={pendingUpdates}        sub="Updates detected"      icon={GitCompare}    color="text-orange-500" />
        <StatCard label="Avg Quality Score" value={avgScore}            sub={`${jobs.length} jobs`} icon={BarChart3}     color={avgScore >= 70 ? 'text-green-500' : 'text-yellow-500'} />
      </div>

      {/* Workflow guide */}
      <div className="rounded-[24px] border border-border/50 bg-card/80 p-6 mb-8">
        <h3 className="font-bold text-lg mb-4">AI Content Pipeline</h3>
        <div className="grid sm:grid-cols-5 gap-2 items-center">
          {[
            { step: '1', label: 'Add to Queue',    desc: 'Paste notification text',    icon: Search },
            { step: '→', label: '', desc: '', icon: null, isArrow: true },
            { step: '2', label: 'Generate Draft',  desc: 'AI writes 17-section article', icon: Brain },
            { step: '→', label: '', desc: '', icon: null, isArrow: true },
            { step: '3', label: 'Review & Publish', desc: 'Human approves → Draft job', icon: CheckCircle2 },
          ].map((s, i) => s.isArrow ? (
            <div key={i} className="hidden sm:flex justify-center text-muted-foreground text-2xl">→</div>
          ) : (
            <div key={i} className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-black flex items-center justify-center mx-auto mb-2">{s.step}</div>
              <p className="font-bold text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Jobs are <strong>never auto-published</strong>. Every AI draft requires human review in Moderation before entering the job database as a Draft.
        </p>
      </div>

      {/* Navigation cards */}
      <h3 className="font-bold text-lg mb-4">All AI Tools</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AI_NAV.map(item => <NavCard key={item.to} item={item} />)}
      </div>
    </main>
  )
}
