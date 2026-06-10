import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Layers3,
  Timer,
  TrendingUp,
} from 'lucide-react';
import {
  getAiDrafts,
  getAiModerationActions,
  getAiReviewResults,
  getAiSources,
  getFetchFailures,
  getJobCategories,
  getJobFetchDuplicates,
  getJobFetchLogs,
  getJobs,
  getResearchQueue,
} from '@/api/supabaseApi';
import {
  buildCategoryCoverage,
  buildDraftQualityReport,
  buildFreshnessIntelligence,
  buildOperationsReports,
  buildPublishingSla,
  buildQueueHealthReport,
  buildSourceIntelligence,
} from '@/lib/phase5bContentOps';

const fmt = new Intl.NumberFormat('en-IN');

function MetricCard({ label, value, sub, icon: Icon, tone = 'text-foreground' }) {
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

function Section({ title, icon: Icon, children, action }) {
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

function StatusChip({ value }) {
  const tone = {
    healthy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    degraded: 'text-amber-700 bg-amber-50 border-amber-200',
    failing: 'text-red-700 bg-red-50 border-red-200',
    no_data: 'text-slate-700 bg-slate-50 border-slate-200',
    attention: 'text-orange-700 bg-orange-50 border-orange-200',
  }[value] || 'text-slate-700 bg-slate-50 border-slate-200';
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{value || 'unknown'}</span>;
}

function CompactTable({ columns, rows, empty = 'No rows' }) {
  if (!rows?.length) return <p className="py-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>{columns.map((col) => <th key={col.key} className="px-2 py-2 font-semibold">{col.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={row.id || row.sourceId || row.category || row.title || index}>
              {columns.map((col) => (
                <td key={col.key} className="px-2 py-2 align-top">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlaMetricRow({ label, metric }) {
  return (
    <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,0.7fr))] items-center gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <p className="font-medium">{label}</p>
      <p>{metric?.p50 || 0}h</p>
      <p>{metric?.p90 || 0}h</p>
      <p>{metric?.p95 || 0}h</p>
      <p className="text-muted-foreground">{metric?.sampleSize || 0}</p>
    </div>
  );
}

function ReportCard({ report }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{report.title}</p>
        <StatusChip value={report.status} />
      </div>
      <p className="mt-2 text-xl font-bold">{report.primary}</p>
    </div>
  );
}

const exportJson = (payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `content-operations-report-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function AiReports() {
  const [activeTab, setActiveTab] = useState('sources');
  const now = useMemo(() => new Date(), []);

  const jobsQuery = useQuery({ queryKey: ['phase5b-jobs'], queryFn: () => getJobs({ published: false, limit: 500 }), retry: false });
  const draftsQuery = useQuery({ queryKey: ['phase5b-drafts'], queryFn: () => getAiDrafts({ limit: 500 }), retry: false });
  const queueQuery = useQuery({ queryKey: ['phase5b-queue'], queryFn: () => getResearchQueue({ limit: 500 }), retry: false });
  const sourcesQuery = useQuery({ queryKey: ['phase5b-sources'], queryFn: () => getAiSources(), retry: false });
  const categoriesQuery = useQuery({ queryKey: ['phase5b-categories'], queryFn: () => getJobCategories({ limit: 500 }), retry: false });
  const fetchLogsQuery = useQuery({ queryKey: ['phase5b-fetch-logs'], queryFn: () => getJobFetchLogs({ limit: 1000 }), retry: false });
  const failuresQuery = useQuery({ queryKey: ['phase5b-fetch-failures'], queryFn: () => getFetchFailures({ limit: 1000 }), retry: false });
  const duplicatesQuery = useQuery({ queryKey: ['phase5b-fetch-duplicates'], queryFn: () => getJobFetchDuplicates({ limit: 1000 }), retry: false });
  const reviewsQuery = useQuery({ queryKey: ['phase5b-reviews'], queryFn: () => getAiReviewResults({ limit: 1000 }), retry: false });
  const actionsQuery = useQuery({ queryKey: ['phase5b-actions'], queryFn: () => getAiModerationActions({ limit: 2000 }), retry: false });

  const jobs = jobsQuery.data || [];
  const drafts = draftsQuery.data || [];
  const queue = queueQuery.data || [];
  const sources = sourcesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const fetchLogs = fetchLogsQuery.data || [];
  const fetchFailures = failuresQuery.data || [];
  const fetchDuplicates = duplicatesQuery.data || [];
  const reviews = reviewsQuery.data || [];
  const moderationActions = actionsQuery.data || [];

  const analytics = useMemo(() => {
    const sourceIntelligence = buildSourceIntelligence({
      sources,
      fetchLogs,
      fetchFailures,
      fetchDuplicates,
      queue,
      drafts,
    });
    const freshness = buildFreshnessIntelligence(jobs, { now });
    const categoryCoverage = buildCategoryCoverage({ jobs, drafts, categories, now });
    const publishingSla = buildPublishingSla({ drafts, moderationActions });
    const draftQuality = buildDraftQualityReport({ drafts, reviews });
    const queueHealth = buildQueueHealthReport(queue);
    const reports = buildOperationsReports({
      sourceIntelligence,
      categoryCoverage,
      draftQuality,
      publishingSla,
      queueHealth,
    });

    return {
      sourceIntelligence,
      freshness,
      categoryCoverage,
      publishingSla,
      draftQuality,
      queueHealth,
      reports,
    };
  }, [sources, fetchLogs, fetchFailures, fetchDuplicates, queue, drafts, jobs, categories, now, moderationActions, reviews]);

  const isLoading = [
    jobsQuery,
    draftsQuery,
    queueQuery,
    sourcesQuery,
    fetchLogsQuery,
    reviewsQuery,
    actionsQuery,
  ].some((query) => query.isLoading);

  const tabs = [
    ['sources', 'Source Intelligence', Globe2],
    ['freshness', 'Freshness', CalendarClock],
    ['categories', 'Category Coverage', FolderKanban],
    ['sla', 'Publishing SLA', Timer],
    ['reports', 'Operations Reports', BarChart3],
  ];

  const operationReportRows = Object.values(analytics.reports);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Content Operations Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Content Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Source reliability, freshness, category coverage, publishing SLA, and operational reports.
          </p>
        </div>
        <button
          onClick={() => exportJson(analytics)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Avg Source Reliability" value={`${analytics.sourceIntelligence.summary.averageReliability || 0}%`} sub={`${analytics.sourceIntelligence.summary.activeSources || 0} active sources`} icon={Gauge} tone="text-indigo-700" />
        <MetricCard label="Active Jobs" value={analytics.freshness.summary.activeJobs || 0} sub={`${analytics.freshness.summary.expiredJobs || 0} expired`} icon={CheckCircle2} tone="text-emerald-700" />
        <MetricCard label="Category Gaps" value={analytics.categoryCoverage.gaps.length || 0} sub={`${analytics.categoryCoverage.summary.inactive || 0} inactive`} icon={Layers3} tone="text-amber-700" />
        <MetricCard label="SLA p95 Cycle" value={`${analytics.publishingSla.totalPublishCycle.p95 || 0}h`} sub={`${analytics.publishingSla.totalPublishCycle.sampleSize || 0} samples`} icon={Clock3} tone="text-blue-700" />
        <MetricCard label="Queue Pending" value={analytics.queueHealth.pending || 0} sub={`${analytics.queueHealth.retryCount || 0} retries`} icon={Database} tone="text-slate-700" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
              activeTab === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-lg bg-muted/50" />)}
        </div>
      ) : (
        <>
          {activeTab === 'sources' && (
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <Section title="Source Intelligence Dashboard" icon={Globe2}>
                  <CompactTable
                    columns={[
                      { key: 'name', label: 'Source', render: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">Tier {row.tier || '-'} · {row.category}</p></div> },
                      { key: 'reliabilityScore', label: 'Reliability', render: (row) => `${row.reliabilityScore}%` },
                      { key: 'successRate', label: 'Success', render: (row) => `${row.successRate}%` },
                      { key: 'failureRate', label: 'Failure', render: (row) => `${row.failureRate}%` },
                      { key: 'averageItemsDiscovered', label: 'Avg Items' },
                      { key: 'averageAcceptedDrafts', label: 'Avg Accepted' },
                      { key: 'averageRejectedDrafts', label: 'Avg Rejected' },
                      { key: 'duplicateRate', label: 'Duplicate', render: (row) => `${row.duplicateRate}%` },
                      { key: 'healthTrend', label: 'Trend', render: (row) => <StatusChip value={row.healthTrend} /> },
                    ]}
                    rows={analytics.sourceIntelligence.rows}
                  />
                </Section>
              </div>
              <div className="space-y-4 xl:col-span-4">
                <MetricCard label="Sources" value={analytics.sourceIntelligence.summary.sources} sub={`${analytics.sourceIntelligence.summary.activeSources} active`} icon={Globe2} />
                <MetricCard label="Failing Sources" value={analytics.sourceIntelligence.summary.failingSources} sub={`${analytics.sourceIntelligence.summary.degradedSources} degraded`} icon={AlertTriangle} tone="text-red-700" />
                <MetricCard label="Fetch Runs" value={fmt.format(fetchLogs.length)} sub={`${fmt.format(fetchFailures.length)} failures logged`} icon={TrendingUp} tone="text-indigo-700" />
                <MetricCard label="Duplicates" value={fmt.format(fetchDuplicates.length)} sub="source duplicate records" icon={FileText} tone="text-orange-700" />
              </div>
            </div>
          )}

          {activeTab === 'freshness' && (
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-4">
                <MetricCard label="Active Jobs" value={analytics.freshness.summary.activeJobs} sub="published and current" icon={CheckCircle2} tone="text-emerald-700" />
                <MetricCard label="Expired Jobs" value={analytics.freshness.summary.expiredJobs} sub="published past deadline" icon={AlertTriangle} tone="text-red-700" />
                <MetricCard label="Missing Deadlines" value={analytics.freshness.summary.missingDeadlines} sub="published jobs" icon={CalendarClock} tone="text-amber-700" />
              </div>
              <div className="space-y-4 xl:col-span-8">
                <Section title="Freshness Dashboard" icon={CalendarClock}>
                  <div className="mb-5 grid gap-3 sm:grid-cols-4">
                    <MetricCard label="1 Day" value={analytics.freshness.summary.expiring1Day} sub="expiring soon" icon={Timer} tone="text-red-700" />
                    <MetricCard label="3 Days" value={analytics.freshness.summary.expiring3Days} sub="expiring soon" icon={Timer} tone="text-orange-700" />
                    <MetricCard label="7 Days" value={analytics.freshness.summary.expiring7Days} sub="expiring soon" icon={Timer} tone="text-amber-700" />
                    <MetricCard label="30 Days" value={analytics.freshness.summary.expiring30Days} sub="planning window" icon={Timer} tone="text-blue-700" />
                  </div>
                  <CompactTable
                    columns={[
                      { key: 'title', label: 'Job', render: (row) => <div><p className="font-semibold">{row.title}</p><p className="text-xs text-muted-foreground">{row.organization}</p></div> },
                      { key: 'status', label: 'Status' },
                      { key: 'last_date', label: 'Last Date', render: (row) => row.last_date || 'Missing' },
                      { key: 'daysToDeadline', label: 'Days', render: (row) => row.daysToDeadline ?? '-' },
                      { key: 'staleIndicator', label: 'Indicator', render: (row) => <StatusChip value={row.staleIndicator} /> },
                    ]}
                    rows={analytics.freshness.staleIndicators}
                    empty="No stale content indicators."
                  />
                </Section>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <Section title="Category Coverage Dashboard" icon={FolderKanban}>
              <div className="mb-5 grid gap-3 sm:grid-cols-5">
                <MetricCard label="Categories" value={analytics.categoryCoverage.summary.categories} icon={FolderKanban} />
                <MetricCard label="Published Jobs" value={analytics.categoryCoverage.summary.totalPublishedJobs} icon={CheckCircle2} tone="text-emerald-700" />
                <MetricCard label="Drafts" value={analytics.categoryCoverage.summary.totalDrafts} icon={FileText} tone="text-blue-700" />
                <MetricCard label="Underrepresented" value={analytics.categoryCoverage.summary.underrepresented} icon={AlertTriangle} tone="text-amber-700" />
                <MetricCard label="Inactive" value={analytics.categoryCoverage.summary.inactive} icon={AlertTriangle} tone="text-red-700" />
              </div>
              <CompactTable
                columns={[
                  { key: 'category', label: 'Category', render: (row) => <p className="font-semibold">{row.category}</p> },
                  { key: 'jobs', label: 'Jobs' },
                  { key: 'drafts', label: 'Drafts' },
                  { key: 'publishedJobs', label: 'Published' },
                  { key: 'growth30Days', label: '30d Growth' },
                  { key: 'total', label: 'Total' },
                  { key: 'gap', label: 'Coverage', render: (row) => row.isInactive ? <StatusChip value="inactive" /> : row.isUnderrepresented ? <StatusChip value="attention" /> : <StatusChip value="healthy" /> },
                ]}
                rows={analytics.categoryCoverage.rows}
              />
            </Section>
          )}

          {activeTab === 'sla' && (
            <Section title="Publishing SLA Dashboard" icon={Timer}>
              <div className="mb-3 grid grid-cols-[1.2fr_repeat(4,minmax(0,0.7fr))] gap-3 border-b border-border pb-2 text-xs font-semibold uppercase text-muted-foreground">
                <span>Stage</span>
                <span>p50</span>
                <span>p90</span>
                <span>p95</span>
                <span>Samples</span>
              </div>
              <SlaMetricRow label="Draft -> Review" metric={analytics.publishingSla.draftToReview} />
              <SlaMetricRow label="Review -> Approval" metric={analytics.publishingSla.reviewToApproval} />
              <SlaMetricRow label="Approval -> Publish" metric={analytics.publishingSla.approvalToPublish} />
              <SlaMetricRow label="Total Publish Cycle" metric={analytics.publishingSla.totalPublishCycle} />
            </Section>
          )}

          {activeTab === 'reports' && (
            <div className="grid gap-4 lg:grid-cols-2">
              {operationReportRows.map((report) => <ReportCard key={report.title} report={report} />)}
              <Section title="Queue Health Report" icon={Database}>
                <div className="grid gap-3 sm:grid-cols-5">
                  <MetricCard label="Total" value={analytics.queueHealth.total} icon={Database} />
                  <MetricCard label="Pending" value={analytics.queueHealth.pending} icon={Clock3} tone="text-amber-700" />
                  <MetricCard label="Processing" value={analytics.queueHealth.processing} icon={Timer} tone="text-blue-700" />
                  <MetricCard label="Drafted" value={analytics.queueHealth.drafted} icon={CheckCircle2} tone="text-emerald-700" />
                  <MetricCard label="Retries" value={analytics.queueHealth.retryCount} icon={AlertTriangle} tone="text-orange-700" />
                </div>
              </Section>
              <Section title="Draft Quality Report" icon={Gauge}>
                <div className="grid gap-3 sm:grid-cols-5">
                  <MetricCard label="Drafts" value={analytics.draftQuality.totalDrafts} icon={FileText} />
                  <MetricCard label="Readiness" value={`${analytics.draftQuality.averageReadiness}%`} icon={Gauge} tone="text-indigo-700" />
                  <MetricCard label="Confidence" value={`${analytics.draftQuality.averageConfidence}%`} icon={TrendingUp} tone="text-cyan-700" />
                  <MetricCard label="Blocked" value={analytics.draftQuality.blockedDrafts} icon={AlertTriangle} tone="text-red-700" />
                  <MetricCard label="Rejected" value={analytics.draftQuality.rejectedDrafts} icon={AlertTriangle} tone="text-orange-700" />
                </div>
              </Section>
            </div>
          )}
        </>
      )}
    </main>
  );
}
