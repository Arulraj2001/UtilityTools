import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FilePlus2,
  Gauge,
  ListChecks,
  RefreshCw,
  Shield,
  Tag,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveReviewItem,
  convertReviewItemToJobDraft,
  getReviewItem,
  getReviewQueue,
  markReviewNeedsRevision,
  rejectReviewItem,
  runReview,
} from '@/api/adminOperationsApi';
import {
  ageHours,
  ageLabel,
  decisionBandMeta,
  draftData,
  itemSourceName,
} from '@/lib/phase5aAdminMetrics';

const FILTERS = [
  ['all', 'All'],
  ['recommended_publish', 'Recommended'],
  ['review_recommended', 'Review'],
  ['manual_review_required', 'Manual'],
  ['blocked', 'Blocked'],
];

function Score({ label, value, tone = 'text-foreground' }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{Math.round(Number(value || 0))}</p>
    </div>
  );
}

function BandChip({ band }) {
  const meta = decisionBandMeta(band);
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.tone}`}>{meta.label}</span>;
}

function SeverityList({ title, items = [], empty = 'None' }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      {rows.length ? (
        <div className="space-y-2">
          {rows.slice(0, 8).map((item, index) => (
            <div key={`${item.code || item.field || title}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.field || item.code || item.severity || 'Issue'}</p>
                <span className="text-xs text-muted-foreground">{item.severity || 'info'}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.message || item.code}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function ReviewItemRow({ item, onOpen, onAction, busy }) {
  const data = draftData(item);
  const blockers = item.verification?.blockingIssues || item.verification?.blocking_issues || [];
  const warnings = item.review?.warnings || item.verification?.warnings || [];
  const recommendation = item.review?.recommendations?.[0]?.message || decisionBandMeta(item.decisionBand).label;

  return (
    <div className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr_auto] xl:items-center">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <BandChip band={item.decisionBand} />
          <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{item.draft?.ai_provider || 'provider n/a'}</span>
        </div>
        <p className="truncate text-sm font-semibold">{data.title || item.draft?.title || 'Untitled draft'}</p>
        <p className="truncate text-xs text-muted-foreground">{itemSourceName(item)} · created {ageLabel(item.draft?.created_at)} ago</p>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:block">
        <p className="text-xs text-muted-foreground">Readiness</p>
        <p className="text-sm font-bold">{Math.round(Number(item.readiness || 0))}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:block">
        <p className="text-xs text-muted-foreground">Confidence</p>
        <p className="text-sm font-bold">{Math.round(Number(item.confidence || 0))}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:block">
        <p className="text-xs text-muted-foreground">Duplicate Risk</p>
        <p className={`text-sm font-bold ${Number(item.duplicateRisk || 0) >= 80 ? 'text-red-600' : 'text-foreground'}`}>{Math.round(Number(item.duplicateRisk || 0))}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:block">
        <p className="text-xs text-muted-foreground">Signals</p>
        <p className="text-sm font-bold">{blockers.length} blockers · {warnings.length || item.warningCount || 0} warnings</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">Recommendation</p>
        <p className="truncate text-sm font-medium">{recommendation}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button onClick={() => onOpen(item.draftId)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold">
          <Eye className="h-3.5 w-3.5" />
          Review
        </button>
        <button
          onClick={() => onAction('approve', item.draftId)}
          disabled={busy || item.decisionBand === 'blocked'}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          onClick={() => onAction('reject', item.draftId)}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-2.5 text-xs font-semibold text-red-700 disabled:opacity-40"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}

function ReviewDrawer({ draftId, onClose, onAction, busy }) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['admin-review-item', draftId],
    queryFn: () => getReviewItem(draftId),
    enabled: Boolean(draftId),
    retry: false,
  });

  const runReviewMutation = useMutation({
    mutationFn: () => runReview(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-item', draftId] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
      toast.success('Review refreshed');
    },
    onError: (error) => toast.error(error.message),
  });

  const detail = detailQuery.data || {};
  const draft = detail.draft || {};
  const data = draft.generated_data || {};
  const review = detail.review || {};
  const verification = detail.verification || {};
  const blockers = verification.blocking_issues || [];
  const warnings = [
    ...(Array.isArray(review.warnings) ? review.warnings : []),
    ...(Array.isArray(verification.warnings) ? verification.warnings : []),
  ];
  const recommendations = Array.isArray(review.recommendations) ? review.recommendations : [];
  const band = review.decision_band || 'manual_review_required';

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close review drawer" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <BandChip band={band} />
              <span className="text-xs text-muted-foreground">{draft.ai_provider || 'provider n/a'}</span>
            </div>
            <h2 className="truncate text-lg font-bold">{data.title || 'Review item'}</h2>
            <p className="truncate text-sm text-muted-foreground">{data.organization || detail.queueItem?.organization || ''}</p>
          </div>
          <button onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>

        {detailQuery.isLoading ? (
          <div className="flex-1 space-y-4 p-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Score label="Readiness" value={review.publish_readiness || draft.readiness_score} tone="text-indigo-700" />
              <Score label="Confidence" value={review.confidence || draft.confidence_score} tone="text-cyan-700" />
              <Score label="Verification" value={verification.verification_score} tone="text-emerald-700" />
              <Score label="Source Conf." value={verification.source_confidence} tone="text-blue-700" />
              <Score label="Dup Risk" value={review.subscores ? 100 - Number(review.subscores.duplicateSafety ?? 100) : draft.quality_scores?.duplicateRisk} tone="text-orange-700" />
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Shield className="h-3.5 w-3.5" />Source</p>
                <p className="text-sm font-medium">{detail.source?.name || detail.queueItem?.organization || data.organization || 'Unknown source'}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{detail.rawNotification?.notification_url || detail.rawNotification?.pdf_url || detail.queueItem?.source_url || ''}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Tag className="h-3.5 w-3.5" />Category</p>
                <p className="text-sm font-medium">{data.category || data.job_type || draft.job_type || 'Uncategorized'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{Array.isArray(data.tags) ? data.tags.slice(0, 6).join(', ') : 'No tags'}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Created</p>
                <p className="text-sm font-medium">{ageLabel(draft.created_at)} ago</p>
                <p className="mt-1 text-xs text-muted-foreground">{draft.created_at ? new Date(draft.created_at).toLocaleString() : ''}</p>
              </div>
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-2">
              <SeverityList title="Blockers" items={blockers} empty="No blockers" />
              <SeverityList title="Warnings" items={warnings} empty="No warnings" />
            </div>

            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recommendations</p>
              <div className="space-y-2">
                {recommendations.length ? recommendations.map((item, index) => (
                  <div key={`${item.code || 'recommendation'}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{item.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.severity || 'low'} · {item.code || 'recommendation'}</p>
                  </div>
                )) : (
                  <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">No recommendations recorded.</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Draft Preview</p>
              <div className="rounded-lg border border-border p-4">
                <p className="text-base font-bold">{data.title || 'Untitled draft'}</p>
                <p className="mt-2 text-sm text-muted-foreground">{data.short_description || data.seo_description || 'No summary available.'}</p>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <span>Organization: <strong>{data.organization || 'n/a'}</strong></span>
                  <span>Location: <strong>{data.location || data.job_location || 'n/a'}</strong></span>
                  <span>Apply: <strong>{data.apply_link ? 'present' : 'missing'}</strong></span>
                  <span>PDF: <strong>{data.notification_pdf ? 'present' : 'missing'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          <button
            onClick={() => runReviewMutation.mutate()}
            disabled={runReviewMutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${runReviewMutation.isPending ? 'animate-spin' : ''}`} />
            Run Review
          </button>
          <button onClick={() => onAction('approve', draftId)} disabled={busy || band === 'blocked'} className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
          <button onClick={() => onAction('needs_revision', draftId)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 px-3 text-sm font-semibold text-amber-700 disabled:opacity-40">
            <AlertTriangle className="h-4 w-4" />
            Needs Revision
          </button>
          <button onClick={() => onAction('convert', draftId)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-200 px-3 text-sm font-semibold text-blue-700 disabled:opacity-40">
            <FilePlus2 className="h-4 w-4" />
            Convert To Job Draft
          </button>
          <button onClick={() => onAction('reject', draftId)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-40">
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function AiModeration() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selectedDraftId, setSelectedDraftId] = useState(null);

  const queueQuery = useQuery({
    queryKey: ['admin-review-queue', filter],
    queryFn: () => getReviewQueue({ limit: 100, decisionBand: filter === 'all' ? null : filter }),
    retry: false,
    refetchInterval: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, draftId }) => {
      const body = { reasonCode: 'phase5a_review_dashboard' };
      if (action === 'approve') return approveReviewItem(draftId, body);
      if (action === 'reject') return rejectReviewItem(draftId, body);
      if (action === 'needs_revision') return markReviewNeedsRevision(draftId, body);
      if (action === 'convert') return convertReviewItemToJobDraft(draftId, body);
      throw new Error(`Unsupported action: ${action}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-item', variables.draftId] });
      toast.success('Review action completed');
    },
    onError: (error) => toast.error(error.message),
  });

  const items = queueQuery.data?.items || [];
  const oldestAgeHours = items.length ? Math.max(...items.map((item) => ageHours(item.draft?.created_at))) : 0;
  const counts = useMemo(() => {
    const result = { all: items.length };
    items.forEach((item) => {
      result[item.decisionBand] = (result[item.decisionBand] || 0) + 1;
    });
    return result;
  }, [items]);

  const handleAction = (action, draftId) => {
    actionMutation.mutate({ action, draftId });
  };

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ListChecks className="h-3.5 w-3.5" />
            Review Productivity
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Readiness, confidence, blockers, warnings, duplicate risk, and admin actions.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Score label="Items" value={queueQuery.data?.count || items.length} tone="text-foreground" />
          <Score label="Blocked" value={items.filter((item) => item.decisionBand === 'blocked').length} tone="text-red-700" />
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">Oldest</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{ageLabel(oldestAgeHours)}</p>
          </div>
        </div>
      </div>

      {queueQuery.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queueQuery.error.message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
              filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            {label}
            <span className="rounded bg-background/30 px-1.5">{key === filter ? (queueQuery.data?.count || items.length) : (counts[key] || 0)}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground xl:grid xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr_auto]">
          <span>Draft</span>
          <span>Readiness</span>
          <span>Confidence</span>
          <span>Duplicate</span>
          <span>Signals</span>
          <span>Recommendation</span>
          <span className="text-right">Actions</span>
        </div>
        {queueQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : items.length ? (
          items.map((item) => (
            <ReviewItemRow
              key={item.draftId}
              item={item}
              onOpen={setSelectedDraftId}
              onAction={handleAction}
              busy={actionMutation.isPending}
            />
          ))
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Shield className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold">No review items</p>
            <p className="mt-1 text-sm">The selected decision band is empty.</p>
          </div>
        )}
      </div>

      {selectedDraftId && (
        <ReviewDrawer
          draftId={selectedDraftId}
          onClose={() => setSelectedDraftId(null)}
          onAction={handleAction}
          busy={actionMutation.isPending}
        />
      )}
    </main>
  );
}
