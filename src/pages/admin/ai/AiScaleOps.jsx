import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Archive,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  DollarSign,
  Download,
  FileText,
  Gauge,
  RefreshCw,
  Route,
  ServerCog,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getScaleOperations } from '@/api/adminOperationsApi';

const numberFmt = new Intl.NumberFormat('en-IN');
const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 });

function formatNumber(value) {
  return numberFmt.format(Number(value || 0));
}

function formatUsd(value) {
  return usdFmt.format(Number(value || 0));
}

function Metric({ label, value, sub, icon: Icon, tone = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusChip({ value }) {
  const tone = {
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    watch: 'border-amber-200 bg-amber-50 text-amber-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    attention: 'border-orange-200 bg-orange-50 text-orange-700',
    archive_review: 'border-orange-200 bg-orange-50 text-orange-700',
    constrained: 'border-red-200 bg-red-50 text-red-700',
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-red-200 bg-red-50 text-red-700',
    high_growth: 'border-red-200 bg-red-50 text-red-700',
  }[value] || 'border-slate-200 bg-slate-50 text-slate-700';

  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{value || 'unknown'}</span>;
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DataTable({ columns, rows, empty = 'No data available.' }) {
  if (!rows?.length) return <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={row.key || row.providerName || row.monthlyJobs || row.table || row.label || index}>
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 align-top">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportTile({ report }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{report.title}</p>
        <StatusChip value={report.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>
    </div>
  );
}

function exportJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `phase5c-scale-ops-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const tabs = [
  ['cost', 'Cost Governance', DollarSign],
  ['providers', 'Provider Strategy', Route],
  ['archive', 'Archive Planning', Archive],
  ['capacity', 'Capacity Planning', Gauge],
  ['reports', 'Executive Reports', FileText],
];

const strategies = ['balanced', 'cheapest-first', 'quality-first', 'fallback-only'];

export default function AiScaleOps() {
  const [activeTab, setActiveTab] = useState('cost');
  const [days, setDays] = useState(30);
  const [budget, setBudget] = useState(25);
  const [strategy, setStrategy] = useState('balanced');

  const query = useQuery({
    queryKey: ['phase5c-scale-ops', days, budget, strategy],
    queryFn: () => getScaleOperations({ days, monthlyBudgetUsd: budget, strategy }),
    retry: false,
    staleTime: 60_000,
  });

  const data = query.data || {};
  const cost = data.costGovernance || {};
  const routing = data.providerRouting || {};
  const retention = data.retention || {};
  const capacity = data.capacity || {};
  const reports = data.executiveReports || {};
  const selectedStrategy = routing.strategies?.[routing.selectedStrategy] || {};

  const reportRows = useMemo(() => Object.values(reports).filter(Boolean), [reports]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ServerCog className="h-3.5 w-3.5" />
            Phase 5C
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Scale Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cost governance, provider routing strategy, retention planning, and high-volume capacity analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
            Days
            <input
              value={days}
              onChange={(event) => setDays(Number(event.target.value) || 30)}
              type="number"
              min="1"
              max="365"
              className="w-16 bg-transparent text-sm font-semibold text-foreground outline-none"
            />
          </label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
            Budget
            <input
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value) || 0)}
              type="number"
              min="0"
              step="1"
              className="w-20 bg-transparent text-sm font-semibold text-foreground outline-none"
            />
          </label>
          <button
            onClick={() => query.refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => exportJson(data)}
            disabled={!query.data}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Monthly Spend" value={formatUsd(cost.budget?.currentMonthSpendUsd)} sub={`${cost.budget?.budgetUsedPercent || 0}% of budget`} icon={DollarSign} tone="text-emerald-700" />
        <Metric label="Projected Spend" value={formatUsd(cost.budget?.projectedMonthlySpendUsd)} sub={cost.budget?.status || 'loading'} icon={TrendingUp} tone="text-blue-700" />
        <Metric label="Cost Per Draft" value={formatUsd(cost.totals?.averageCostPerDraftUsd)} sub={`${formatNumber(cost.totals?.drafts)} sampled drafts`} icon={BarChart3} tone="text-indigo-700" />
        <Metric label="Active Providers" value={routing.activeProviderCount || 0} sub={routing.selectedStrategy || strategy} icon={Route} tone="text-cyan-700" />
        <Metric label="10k Capacity" value={capacity.scenarios?.find((row) => row.monthlyJobs === 10000)?.status || 'loading'} sub="jobs/month model" icon={Gauge} tone="text-orange-700" />
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

      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-56 animate-pulse rounded-lg bg-muted/50" />)}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error?.message || 'Scale operations data could not be loaded.'}
        </div>
      ) : (
        <>
          {activeTab === 'cost' && (
            <div className="space-y-6">
              <SectionTitle icon={DollarSign} title="Cost Governance Dashboard" />
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Budget Status" value={cost.budget?.status || 'unknown'} sub={`${cost.budget?.projectedBudgetPercent || 0}% projected`} icon={ShieldCheck} tone="text-emerald-700" />
                <Metric label="Remaining Budget" value={formatUsd(cost.budget?.remainingBudgetUsd)} sub="current month" icon={DollarSign} tone="text-blue-700" />
                <Metric label="Tokens Used" value={formatNumber(cost.totals?.tokensUsed)} sub="sampled drafts" icon={Database} tone="text-slate-700" />
                <Metric label="Avg Quality" value={`${cost.totals?.averageQualityScore || 0}%`} sub="draft/review score" icon={Gauge} tone="text-indigo-700" />
              </div>
              <DataTable
                rows={cost.providerSpend || []}
                columns={[
                  { key: 'label', label: 'Provider', render: (row) => <p className="font-semibold">{row.label}</p> },
                  { key: 'drafts', label: 'Drafts', render: (row) => formatNumber(row.drafts) },
                  { key: 'tokensUsed', label: 'Tokens', render: (row) => formatNumber(row.tokensUsed) },
                  { key: 'estimatedSpendUsd', label: 'Spend', render: (row) => formatUsd(row.estimatedSpendUsd) },
                  { key: 'averageCostPerDraftUsd', label: 'Cost / Draft', render: (row) => formatUsd(row.averageCostPerDraftUsd) },
                ]}
              />
              <div className="grid gap-5 xl:grid-cols-2">
                <DataTable
                  rows={cost.costPerCategory || []}
                  columns={[
                    { key: 'label', label: 'Category', render: (row) => <p className="font-semibold">{row.label}</p> },
                    { key: 'drafts', label: 'Drafts', render: (row) => formatNumber(row.drafts) },
                    { key: 'estimatedSpendUsd', label: 'Spend', render: (row) => formatUsd(row.estimatedSpendUsd) },
                    { key: 'averageCostPerDraftUsd', label: 'Cost / Draft', render: (row) => formatUsd(row.averageCostPerDraftUsd) },
                  ]}
                />
                <DataTable
                  rows={cost.costPerSource || []}
                  columns={[
                    { key: 'label', label: 'Source', render: (row) => <p className="font-semibold">{row.label}</p> },
                    { key: 'drafts', label: 'Drafts', render: (row) => formatNumber(row.drafts) },
                    { key: 'estimatedSpendUsd', label: 'Spend', render: (row) => formatUsd(row.estimatedSpendUsd) },
                    { key: 'averageCostPerDraftUsd', label: 'Cost / Draft', render: (row) => formatUsd(row.averageCostPerDraftUsd) },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-6">
              <SectionTitle
                icon={Route}
                title="Provider Strategy Dashboard"
                action={(
                  <div className="flex flex-wrap gap-2">
                    {strategies.map((item) => (
                      <button
                        key={item}
                        onClick={() => setStrategy(item)}
                        className={`h-8 rounded-md border px-3 text-xs font-semibold ${
                          strategy === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              />
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Selected Strategy" value={routing.selectedStrategy || strategy} sub={selectedStrategy.primaryProvider || 'No provider'} icon={Route} tone="text-cyan-700" />
                <Metric label="Primary Provider" value={selectedStrategy.primaryProvider || 'None'} sub="strategy projection" icon={CheckCircle2} tone="text-emerald-700" />
                <Metric label="Active Providers" value={routing.activeProviderCount || 0} sub="configured active rows" icon={ServerCog} tone="text-indigo-700" />
                <Metric label="Security" value={data.security?.exposesProviderSecrets ? 'Review' : 'Sanitized'} sub="provider secrets hidden" icon={ShieldCheck} tone="text-emerald-700" />
              </div>
              <DataTable
                rows={selectedStrategy.providerOrder || []}
                columns={[
                  { key: 'rank', label: 'Rank' },
                  { key: 'providerName', label: 'Provider', render: (row) => <p className="font-semibold">{row.providerName}</p> },
                  { key: 'successRate', label: 'Success', render: (row) => `${row.successRate}%` },
                  { key: 'latencyMs', label: 'Latency', render: (row) => `${formatNumber(row.latencyMs)} ms` },
                  { key: 'estimatedCostPerDraftUsd', label: 'Cost / Draft', render: (row) => formatUsd(row.estimatedCostPerDraftUsd) },
                  { key: 'qualityScore', label: 'Quality', render: (row) => `${row.qualityScore}%` },
                  { key: 'balancedScore', label: 'Balanced', render: (row) => `${row.balancedScore}%` },
                ]}
              />
              <DataTable
                rows={routing.providerMetrics || []}
                columns={[
                  { key: 'providerName', label: 'Provider', render: (row) => <div><p className="font-semibold">{row.providerName}</p><p className="text-xs text-muted-foreground">{row.model || 'No model'}</p></div> },
                  { key: 'healthStatus', label: 'Health', render: (row) => <StatusChip value={row.healthStatus} /> },
                  { key: 'requests', label: 'Requests', render: (row) => formatNumber(row.requests) },
                  { key: 'successRate', label: 'Success', render: (row) => `${row.successRate}%` },
                  { key: 'latencyMs', label: 'Latency', render: (row) => `${formatNumber(row.latencyMs)} ms` },
                  { key: 'estimatedSpendUsd', label: 'Spend', render: (row) => formatUsd(row.estimatedSpendUsd) },
                  { key: 'qualityScore', label: 'Quality', render: (row) => `${row.qualityScore}%` },
                  { key: 'failures', label: 'Failures', render: (row) => formatNumber(row.failures) },
                ]}
              />
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="space-y-6">
              <SectionTitle icon={Archive} title="Archive Planning Dashboard" />
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Automatic Archival" value={retention.automaticArchival ? 'Enabled' : 'Disabled'} sub="manual review required" icon={ShieldCheck} tone="text-emerald-700" />
                <Metric label="Tracked Tables" value={retention.tables?.length || 0} sub="growth inputs" icon={Database} tone="text-slate-700" />
                <Metric label="Archive Candidates" value={formatNumber((retention.tables || []).reduce((sum, row) => sum + Number(row.archiveCandidateRows || 0), 0))} sub="sampled rows" icon={Archive} tone="text-orange-700" />
                <Metric label="High Growth Tables" value={(retention.tables || []).filter((row) => row.growthStatus === 'high').length} sub="projected monthly rows" icon={TrendingUp} tone="text-red-700" />
              </div>
              <DataTable
                rows={retention.tables || []}
                columns={[
                  { key: 'label', label: 'Table', render: (row) => <p className="font-semibold">{row.label}</p> },
                  { key: 'totalRows', label: 'Total', render: (row) => formatNumber(row.totalRows) },
                  { key: 'sampledRows', label: 'Sampled', render: (row) => formatNumber(row.sampledRows) },
                  { key: 'rowsInWindow', label: 'Window Rows', render: (row) => formatNumber(row.rowsInWindow) },
                  { key: 'projectedMonthlyRows', label: 'Projected / Month', render: (row) => formatNumber(row.projectedMonthlyRows) },
                  { key: 'archiveCandidateRows', label: 'Archive Candidates', render: (row) => formatNumber(row.archiveCandidateRows) },
                  { key: 'growthStatus', label: 'Growth', render: (row) => <StatusChip value={row.growthStatus} /> },
                ]}
              />
              <DataTable
                rows={retention.recommendations || []}
                columns={[
                  { key: 'label', label: 'Area', render: (row) => <p className="font-semibold">{row.label}</p> },
                  { key: 'risk', label: 'Risk', render: (row) => <StatusChip value={row.risk} /> },
                  { key: 'recommendation', label: 'Recommendation' },
                  { key: 'retentionPolicy', label: 'Retention Policy' },
                ]}
              />
            </div>
          )}

          {activeTab === 'capacity' && (
            <div className="space-y-6">
              <SectionTitle icon={Gauge} title="Capacity Planning Dashboard" />
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Queue / Month" value={formatNumber(capacity.currentThroughput?.queue?.perMonth)} sub={`${capacity.currentThroughput?.queue?.perDay || 0}/day`} icon={Activity} tone="text-cyan-700" />
                <Metric label="Drafts / Month" value={formatNumber(capacity.currentThroughput?.drafts?.perMonth)} sub={`${capacity.currentThroughput?.drafts?.perDay || 0}/day`} icon={FileText} tone="text-indigo-700" />
                <Metric label="Reviews / Month" value={formatNumber(capacity.currentThroughput?.reviews?.perMonth)} sub={`${capacity.currentThroughput?.reviews?.perDay || 0}/day`} icon={Gauge} tone="text-blue-700" />
                <Metric label="Publishes / Month" value={formatNumber(capacity.currentThroughput?.publishes?.perMonth)} sub={`${capacity.currentThroughput?.publishes?.perDay || 0}/day`} icon={CheckCircle2} tone="text-emerald-700" />
              </div>
              <DataTable
                rows={capacity.scenarios || []}
                columns={[
                  { key: 'monthlyJobs', label: 'Jobs / Month', render: (row) => formatNumber(row.monthlyJobs) },
                  { key: 'dailyJobs', label: 'Jobs / Day', render: (row) => formatNumber(row.dailyJobs) },
                  { key: 'provider', label: 'Provider Cost', render: (row) => <div><p>{formatUsd(row.provider?.estimatedCostUsd)}</p><p className="text-xs text-muted-foreground">{formatNumber(row.provider?.estimatedTokens)} tokens</p></div> },
                  { key: 'queueCoverage', label: 'Queue Coverage', render: (row) => `${row.coveragePercent?.queue || 0}%` },
                  { key: 'draftCoverage', label: 'Draft Coverage', render: (row) => `${row.coveragePercent?.drafts || 0}%` },
                  { key: 'reviewCoverage', label: 'Review Coverage', render: (row) => `${row.coveragePercent?.reviews || 0}%` },
                  { key: 'publishCoverage', label: 'Publish Coverage', render: (row) => `${row.coveragePercent?.publishes || 0}%` },
                  { key: 'status', label: 'Status', render: (row) => <StatusChip value={row.status} /> },
                  { key: 'bottlenecks', label: 'Bottlenecks', render: (row) => row.bottlenecks?.join(', ') || 'None' },
                ]}
              />
              <DataTable
                rows={(capacity.scenarios || []).map((row) => ({
                  monthlyJobs: row.monthlyJobs,
                  ...row.estimatedRows,
                }))}
                columns={[
                  { key: 'monthlyJobs', label: 'Jobs / Month', render: (row) => formatNumber(row.monthlyJobs) },
                  { key: 'rawJobNotifications', label: 'Raw Rows', render: (row) => formatNumber(row.rawJobNotifications) },
                  { key: 'aiResearchQueue', label: 'Queue Rows', render: (row) => formatNumber(row.aiResearchQueue) },
                  { key: 'aiJobDrafts', label: 'Draft Rows', render: (row) => formatNumber(row.aiJobDrafts) },
                  { key: 'aiReviewResults', label: 'Review Rows', render: (row) => formatNumber(row.aiReviewResults) },
                  { key: 'aiModerationActions', label: 'Moderation Rows', render: (row) => formatNumber(row.aiModerationActions) },
                ]}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <SectionTitle icon={FileText} title="Executive Reporting" />
              <div className="grid gap-3 lg:grid-cols-2">
                {reportRows.map((report) => <ReportTile key={report.title} report={report} />)}
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <p className="text-sm font-semibold">Security Posture</p>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Admin Only</p><StatusChip value={data.security?.adminOnly ? 'ready' : 'attention'} /></div>
                  <div><p className="text-xs text-muted-foreground">Provider Secrets</p><StatusChip value={data.security?.exposesProviderSecrets ? 'attention' : 'ready'} /></div>
                  <div><p className="text-xs text-muted-foreground">Service Role</p><StatusChip value={data.security?.exposesServiceRole ? 'attention' : 'ready'} /></div>
                  <div><p className="text-xs text-muted-foreground">Auto Archive</p><StatusChip value={data.security?.automaticArchival ? 'attention' : 'ready'} /></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {data.security?.automaticArchival && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Automatic archival should remain disabled for Phase 5C.
        </div>
      )}
    </main>
  );
}
