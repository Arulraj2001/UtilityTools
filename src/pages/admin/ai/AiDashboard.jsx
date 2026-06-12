import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Gauge,
  HeartPulse,
  Inbox,
  Layers3,
  ListChecks,
  Server,
  Shield,
  Timer,
  TrendingUp,
  Zap,
  Play,
  Loader2,
  ChevronRight,
  ScanSearch,
} from 'lucide-react';
import {
  getMonitoringAlerts,
  getMonitoringOverview,
  getReviewQueue,
  runFetchAll,
  processAiQueue,
  getAiQueueStatus,
  getFetchStatus,
  devSafeQuery,
  isDevMode,
  isDevModeError,
} from '@/api/adminOperationsApi';
import {
  ageLabel,
  computeOperationsDashboard,
} from '@/lib/phase5aAdminMetrics';
import { toast } from 'sonner';
import { getSeoSettings } from '@/api/siteSettingsApi';

const numberFmt = new Intl.NumberFormat('en-IN');

function MetricTile({ label, value, sub, icon: Icon, tone = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Row({ label, value, sub, tone = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className={`shrink-0 text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function BarRow({ label, value, max = 100, tone = 'bg-primary' }) {
  const width = Math.max(0, Math.min(100, max ? (Number(value || 0) / max) * 100 : 0));
  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  const severityTone = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-blue-700 bg-blue-50 border-blue-200',
  }[alert.severity] || 'text-slate-700 bg-slate-50 border-slate-200';

  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{alert.title || alert.type}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{alert.message}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${severityTone}`}>
          {alert.severity || 'info'}
        </span>
      </div>
    </div>
  );
}

function ReportTable({ rows, valueLabel = 'Count' }) {
  if (!rows?.length) {
    return <p className="py-3 text-sm text-muted-foreground">No records in the current window.</p>;
  }
  const max = Math.max(...rows.map((row) => Number(row.count ?? row.successRate ?? 0)), 1);
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={`${row.name}-${row.status || ''}`} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.name}</p>
            {row.status && <p className="text-xs text-muted-foreground">{row.status}</p>}
          </div>
          <div className="min-w-[120px]">
            <BarRow
              label={valueLabel}
              value={row.count ?? row.successRate ?? 0}
              max={max}
              tone={row.status === 'degraded' || row.status === 'down' ? 'bg-orange-500' : 'bg-primary'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Operations Guidance Panel ─────────────────────────────────────────────

function OperationsGuidancePanel({ overview, reviewQueue, dashboard, alerts, workerStatus, fetchStatus }) {
  const queryClient = useQueryClient();
  const [fetchResult, setFetchResult] = useState(null);
  const [processResult, setProcessResult] = useState(null);

  const runFetchMutation = useMutation({
    mutationFn: () => runFetchAll({}),
    onSuccess: (data) => {
      setFetchResult(data);
      queryClient.invalidateQueries({ queryKey: ['fetch-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-overview'] });
      toast.success('Fetch completed');
    },
    onError: (err) => {
      if (isDevModeError(err)) toast.info('Run Fetch requires Vercel deployment — not available in local dev.');
      else toast.error(err.message || 'Fetch failed');
    },
  });

  const processQueueMutation = useMutation({
    mutationFn: () => processAiQueue({ limit: 10 }),
    onSuccess: (data) => {
      setProcessResult(data);
      queryClient.invalidateQueries({ queryKey: ['admin-monitoring-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
      toast.success('Queue processing complete');
    },
    onError: (err) => {
      if (isDevModeError(err)) toast.info('Process Queue requires Vercel deployment — not available in local dev.');
      else toast.error(err.message || 'Processing failed');
    },
  });

  // Build recommendations from existing metrics
  const recommendations = [];
  const pendingQ = dashboard?.queue?.pending || 0;
  const processingQ = dashboard?.queue?.processing || 0;
  const approvedDrafts = dashboard?.drafts?.approved || 0;
  const reviewItems = dashboard?.review?.queueItems || 0;
  const criticalAlerts = dashboard?.alerts?.critical || 0;
  const blockedDrafts = dashboard?.drafts?.blocked || 0;

  if (criticalAlerts > 0) {
    recommendations.push({
      priority: 1,
      label: 'Resolve Critical Alerts',
      desc: `${criticalAlerts} critical alert${criticalAlerts !== 1 ? 's' : ''} require immediate attention.`,
      tone: 'border-red-200 bg-red-50 text-red-800',
      action: null,
      link: '/admin/ai-monitoring',
      linkLabel: 'View Alerts →',
      icon: AlertTriangle,
    });
  }

  const fetchNeeded = !fetchStatus?.lastRunAt || (Date.now() - new Date(fetchStatus.lastRunAt).getTime()) > 3 * 60 * 60 * 1000;
  if (fetchNeeded) {
    recommendations.push({
      priority: 2,
      label: 'Run Fetch',
      desc: 'Fetch all active sources to pull latest official notifications.',
      tone: 'border-blue-200 bg-blue-50 text-blue-800',
      action: () => runFetchMutation.mutate(),
      actionLabel: 'Run Now',
      actionLoading: runFetchMutation.isPending,
      link: '/admin/ai-sources',
      linkLabel: 'View Sources →',
      icon: Play,
    });
  }

  if (pendingQ > 0 && !processingQ) {
    recommendations.push({
      priority: 3,
      label: 'Process Queue',
      desc: `${pendingQ} pending item${pendingQ !== 1 ? 's' : ''} waiting for AI processing.`,
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      action: () => processQueueMutation.mutate(),
      actionLabel: 'Process Now',
      actionLoading: processQueueMutation.isPending,
      link: '/admin/ai-research',
      linkLabel: 'View Queue →',
      icon: Server,
    });
  }

  if (reviewItems > 0) {
    recommendations.push({
      priority: 4,
      label: 'Review Drafts',
      desc: `${reviewItems} AI draft${reviewItems !== 1 ? 's' : ''} in the review queue.`,
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      action: null,
      link: '/admin/ai-moderation',
      linkLabel: 'Open Review Queue →',
      icon: ListChecks,
    });
  }

  if (approvedDrafts > 0) {
    recommendations.push({
      priority: 5,
      label: 'Convert Approved Drafts',
      desc: `${approvedDrafts} approved draft${approvedDrafts !== 1 ? 's' : ''} ready to convert to job drafts.`,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      action: null,
      link: '/admin/ai-moderation',
      linkLabel: 'Open Moderation →',
      icon: FileText,
    });
  }

  const draftJobs = overview?.drafts?.jobDraftCount || 0;
  if (draftJobs > 0) {
    recommendations.push({
      priority: 6,
      label: 'Publish Draft Jobs',
      desc: `${draftJobs} job draft${draftJobs !== 1 ? 's' : ''} ready for audited publish.`,
      tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      action: null,
      link: '/admin/jobs',
      linkLabel: 'Go to Jobs →',
      icon: CheckCircle2,
    });
  }

  if (blockedDrafts > 0) {
    recommendations.push({
      priority: 7,
      label: 'Resolve Blocked Drafts',
      desc: `${blockedDrafts} draft${blockedDrafts !== 1 ? 's' : ''} are blocked by quality gate issues.`,
      tone: 'border-orange-200 bg-orange-50 text-orange-800',
      action: null,
      link: '/admin/ai-moderation',
      linkLabel: 'Review Blockers →',
      icon: Shield,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 99,
      label: 'All Clear',
      desc: 'Pipeline is healthy. No immediate actions needed.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      action: null,
      link: null,
      icon: CheckCircle2,
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">What Should I Do Next?</h2>
        </div>
        <div className="flex items-center gap-3">
          {isDevMode() && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Local dev — actions require Vercel</span>
          )}
          <span className="text-xs text-muted-foreground">{recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {recommendations.map((rec, i) => {
          const Icon = rec.icon;
          return (
            <div key={i} className={`px-4 py-3 rounded-md m-2 border ${rec.tone}`}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/60">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{rec.label}</p>
                  <p className="text-xs opacity-80 mt-0.5">{rec.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rec.action && (
                    <button
                      id={`guidance-action-${i}`}
                      onClick={rec.action}
                      disabled={rec.actionLoading || isDevMode()}
                      title={isDevMode() ? 'Requires Vercel deployment' : undefined}
                      className="h-7 px-2.5 rounded-md bg-white/70 border border-current/20 text-xs font-semibold hover:bg-white transition-all disabled:opacity-60 flex items-center gap-1"
                    >
                      {rec.actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {rec.actionLabel}
                    </button>
                  )}
                  {rec.link && (
                    <Link
                      to={rec.link}
                      className="h-7 px-2.5 rounded-md bg-white/50 border border-current/20 text-xs font-semibold hover:bg-white transition-all flex items-center gap-1"
                    >
                      {rec.linkLabel || 'Go →'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Last fetch / process results */}
      {(fetchResult || processResult) && (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {fetchResult && (
            <p>Last fetch: {fetchResult.summary?.totalFound ?? 0} found, {fetchResult.summary?.totalSaved ?? 0} saved, {fetchResult.summary?.totalFailures ?? 0} failures</p>
          )}
          {processResult && (
            <p>Last process: {processResult.processed ?? 0} processed, {processResult.succeeded ?? 0} succeeded</p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Site Settings Status Widget (Phase 5E) ─────────────────────────────────

const SEO_CHECKS = [
  { key: 'google_site_verification', label: 'Google Verification' },
  { key: 'google_adsense_client',    label: 'AdSense' },
  { key: 'google_analytics_id',      label: 'Analytics' },
  { key: 'google_tag_manager_id',    label: 'Tag Manager' },
  { key: 'microsoft_clarity_id',     label: 'Clarity' },
  { key: 'bing_site_verification',   label: 'Bing Verification' },
]

function SiteSettingsWidget() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: getSeoSettings,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const lookup = rows.reduce((acc, r) => { acc[r.key] = r; return acc }, {})
  const activeCount = SEO_CHECKS.filter(({ key }) => {
    const row = lookup[key]
    return row?.is_active !== false && !!row?.value
  }).length

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">SEO & Verification</h2>
        </div>
        <Link
          to="/admin/site-settings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          Manage <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {activeCount}/{SEO_CHECKS.length} integrations active
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SEO_CHECKS.map(({ key, label }) => {
                const row = lookup[key]
                const active = row?.is_active !== false && !!row?.value
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <CheckCircle2
                      className={`h-3 w-3 shrink-0 ${active ? 'text-emerald-500' : 'opacity-30'}`}
                    />
                    {label}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AiDashboard() {
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: ['admin-monitoring-overview', 30],
    queryFn: devSafeQuery(() => getMonitoringOverview({ days: 30 })),
    retry: false,
    refetchInterval: 60_000,
  });
  const reviewQueueQuery = useQuery({
    queryKey: ['admin-review-queue', 'phase5a', 100],
    queryFn: devSafeQuery(() => getReviewQueue({ limit: 100 })),
    retry: false,
    refetchInterval: 60_000,
  });
  const alertsQuery = useQuery({
    queryKey: ['admin-monitoring-alerts', 30],
    queryFn: devSafeQuery(() => getMonitoringAlerts({ days: 30, limit: 25 })),
    retry: false,
    refetchInterval: 60_000,
  });
  const workerStatusQuery = useQuery({
    queryKey: ['ai-queue-status'],
    queryFn: devSafeQuery(getAiQueueStatus),
    retry: false,
    refetchInterval: 30_000,
  });
  const fetchStatusQuery = useQuery({
    queryKey: ['fetch-status'],
    queryFn: devSafeQuery(getFetchStatus),
    retry: false,
    refetchInterval: 60_000,
  });

  const overview = overviewQuery.data || {};
  const reviewQueue = reviewQueueQuery.data || {};
  const dashboard = computeOperationsDashboard({ overview, reviewQueue });
  const alerts = alertsQuery.data?.active?.length
    ? alertsQuery.data.active
    : (overview.alerts || []);
  const providerRows = dashboard.reports.providers;
  const maxQueue = Math.max(...dashboard.reports.queue.map((row) => row.count), 1);
  const isLoading = overviewQuery.isLoading || reviewQueueQuery.isLoading;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Activity className="h-3.5 w-3.5" />
            AI Job Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Queue, review, moderation, providers, alerts, SLA, and reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/ai-moderation" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
            <ListChecks className="h-4 w-4" />
            Review Queue
          </Link>
          <Link to="/admin/ai-monitoring" className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold">
            <HeartPulse className="h-4 w-4" />
            Monitoring
          </Link>
        </div>
      </div>

      {(overviewQuery.error || reviewQueueQuery.error) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {isDevMode()
            ? 'Dashboard metrics require Vercel deployment — not available in local dev. Data will load normally when deployed.'
            : (overviewQuery.error?.message || reviewQueueQuery.error?.message)}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <MetricTile label="Pending Queue" value={dashboard.queue.pending || 0} sub={`${ageLabel(dashboard.oldestPendingItemHours)} oldest`} icon={Inbox} tone="text-amber-600" />
        <MetricTile label="Processing" value={dashboard.queue.processing || 0} sub="active queue" icon={Timer} tone="text-blue-600" />
        <MetricTile label="Drafted" value={dashboard.queue.drafted || 0} sub="queue complete" icon={FileText} tone="text-emerald-600" />
        <MetricTile label="Rejected" value={dashboard.queue.rejected || 0} sub="queue rejected" icon={AlertTriangle} tone="text-red-600" />
        <MetricTile label="Approved Drafts" value={dashboard.drafts.approved || 0} sub="ready state" icon={CheckCircle2} tone="text-emerald-600" />
        <MetricTile label="Blocked Drafts" value={dashboard.drafts.blocked || 0} sub="decision band" icon={Shield} tone="text-red-600" />
        <MetricTile label="Readiness" value={dashboard.review.averageReadiness || 0} sub="average score" icon={Gauge} tone="text-indigo-600" />
        <MetricTile label="Confidence" value={dashboard.review.averageConfidence || 0} sub="average score" icon={TrendingUp} tone="text-cyan-700" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-lg bg-muted/50" />)}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Queue Overview" icon={Database}>
                <div className="space-y-1">
                  {dashboard.reports.queue.map((row) => (
                    <BarRow key={row.name} label={row.name} value={row.count} max={maxQueue} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Retries: <strong className="text-foreground">{overview.queue?.retryCount || 0}</strong></span>
                  <span>Throughput/day: <strong className="text-foreground">{overview.queue?.throughput?.perDay || 0}</strong></span>
                </div>
              </Section>

              <Section title="Draft Overview" icon={FileText}>
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile label="Review Recommended" value={dashboard.drafts.reviewRecommended || 0} icon={ListChecks} tone="text-blue-600" />
                  <MetricTile label="Manual Review" value={dashboard.drafts.manualReviewRequired || 0} icon={Shield} tone="text-amber-600" />
                  <MetricTile label="Quality Avg" value={overview.quality?.averages?.qualityScore || 0} icon={Gauge} tone="text-indigo-600" />
                  <MetricTile label="Dup Risk Avg" value={overview.quality?.averages?.duplicateRisk || 0} icon={AlertTriangle} tone="text-orange-600" />
                </div>
              </Section>

              <Section
                title="Review Overview"
                icon={ListChecks}
                action={<Link to="/admin/ai-moderation" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Open <ArrowRight className="h-3 w-3" /></Link>}
              >
                <Row label="Items in review queue" value={dashboard.review.queueItems || 0} />
                <Row label="Average readiness" value={dashboard.review.averageReadiness || 0} />
                <Row label="Average confidence" value={dashboard.review.averageConfidence || 0} />
                <Row label="Validation failures" value={overview.quality?.validationFailures || 0} tone="text-orange-600" />
                <Row label="Warning count" value={overview.quality?.warningCount || 0} tone="text-amber-600" />
              </Section>

              <Section title="Moderation Overview" icon={Shield}>
                <div className="grid grid-cols-2 gap-x-5">
                  {dashboard.reports.moderation.map((row) => (
                    <Row key={row.name} label={row.name} value={row.count} />
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Publishing SLA" icon={Clock3}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricTile label="Draft Age" value={ageLabel(dashboard.sla.averageDraftAgeHours)} sub="average" icon={Clock3} tone="text-slate-700" />
                <MetricTile label="Review Age" value={ageLabel(dashboard.sla.averageReviewAgeHours)} sub="average" icon={ListChecks} tone="text-indigo-600" />
                <MetricTile label="Publish Age" value={ageLabel(dashboard.sla.publishAgeHours)} sub="latest publish" icon={CheckCircle2} tone="text-emerald-600" />
                <MetricTile label="Oldest Pending" value={ageLabel(dashboard.sla.oldestPendingReviewHours)} sub="review item" icon={Timer} tone="text-amber-600" />
                <MetricTile label="Oldest Blocked" value={ageLabel(dashboard.sla.oldestBlockedDraftHours)} sub="blocked draft" icon={AlertTriangle} tone="text-red-600" />
              </div>
            </Section>

            <Section title="Admin Reports" icon={BarChart3}>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sources</h3>
                  <ReportTable rows={dashboard.reports.sources} />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Categories</h3>
                  <ReportTable rows={dashboard.reports.categories} />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Queue Health</h3>
                  <ReportTable rows={dashboard.reports.queue} />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Moderation Outcomes</h3>
                  <ReportTable rows={dashboard.reports.moderation} />
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-4 xl:col-span-4">
            <OperationsGuidancePanel
              overview={overview}
              reviewQueue={reviewQueue}
              dashboard={dashboard}
              alerts={alerts}
              workerStatus={workerStatusQuery.data}
              fetchStatus={fetchStatusQuery.data}
            />

            {/* ── Site Settings Status Widget (Phase 5E) ── */}
            <SiteSettingsWidget />

            <Section title="Provider Health" icon={Server}>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MetricTile label="Active" value={dashboard.providers.active || 0} icon={Server} tone="text-emerald-600" />
                <MetricTile label="Unhealthy" value={dashboard.providers.unhealthy || 0} icon={AlertTriangle} tone="text-orange-600" />
                <MetricTile label="Success" value={`${dashboard.providers.successRate || 0}%`} icon={Gauge} tone="text-indigo-600" />
              </div>
              <div className="divide-y divide-border">
                {providerRows.slice(0, 6).map((provider) => (
                  <Row
                    key={provider.name}
                    label={provider.name || 'Provider'}
                    sub={`${provider.failures || 0} failures · ${numberFmt.format(provider.latency || 0)}ms p95/avg`}
                    value={`${provider.successRate || 0}%`}
                    tone={provider.status === 'healthy' ? 'text-emerald-600' : 'text-orange-600'}
                  />
                ))}
              </div>
            </Section>

            <Section title="Monitoring Alerts" icon={AlertTriangle}>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MetricTile label="Active" value={dashboard.alerts.active || 0} icon={AlertTriangle} tone="text-orange-600" />
                <MetricTile label="Critical" value={dashboard.alerts.critical || 0} icon={Shield} tone="text-red-600" />
                <MetricTile label="High" value={dashboard.alerts.high || 0} icon={TrendingUp} tone="text-amber-600" />
              </div>
              <div className="space-y-2">
                {alerts.length ? alerts.slice(0, 8).map((alert) => (
                  <AlertRow key={alert.id || alert.fingerprint || alert.type} alert={alert} />
                )) : (
                  <p className="py-4 text-sm text-muted-foreground">No active alerts.</p>
                )}
              </div>
            </Section>

            <Section title="Provider Report" icon={Layers3}>
              <ReportTable rows={providerRows.map((provider) => ({
                name: provider.name,
                status: provider.status,
                successRate: provider.successRate,
              }))} valueLabel="Success" />
            </Section>
          </div>
        </div>
      )}
    </main>
  );
}
