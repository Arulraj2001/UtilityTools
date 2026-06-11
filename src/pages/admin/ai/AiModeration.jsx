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
  ChevronDown,
  ChevronRight,
  Layers,
  History,
  CheckSquare,
  Square,
  Loader2,
  ArrowRight,
  Database,
  FileText,
  GitBranch,
  Activity,
  Send,
} from 'lucide-react';
import {
  approveReviewItem,
  bulkApproveReviewItems,
  bulkRejectReviewItems,
  convertReviewItemToJobDraft,
  getReviewItem,
  getReviewQueue,
  markReviewNeedsRevision,
  rejectReviewItem,
  runReview,
  devSafeQuery,
  isDevMode,
  isDevModeError,
} from '@/api/adminOperationsApi';
import {
  ageHours,
  ageLabel,
  decisionBandMeta,
  draftData,
  itemSourceName,
} from '@/lib/phase5aAdminMetrics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FILTERS = [
  ['all', 'All'],
  ['recommended_publish', 'Recommended'],
  ['review_recommended', 'Review'],
  ['manual_review_required', 'Manual'],
  ['blocked', 'Blocked'],
];

const ACTION_META = {
  run_review: { label: 'Run Review', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  approve: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  reject: { label: 'Rejected', color: 'bg-red-500/10 text-red-700 border-red-200' },
  needs_revision: { label: 'Needs Revision', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  convert_to_draft: { label: 'Converted to Draft', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
  publish: { label: 'Published', color: 'bg-emerald-600/10 text-emerald-800 border-emerald-300' },
  override_blocker: { label: 'Override Blocker', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

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

// ─── Moderation Audit Timeline ─────────────────────────────────────────────────

function AuditTimeline({ actions = [] }) {
  if (!actions.length) {
    return <p className="text-sm text-muted-foreground py-3">No audit actions recorded yet.</p>;
  }
  return (
    <div className="space-y-2">
      {actions.map((action, i) => {
        const meta = ACTION_META[action.action_type || action.action] || { label: action.action_type || action.action || 'Action', color: 'bg-gray-500/10 text-gray-700 border-gray-200' };
        return (
          <div key={action.id || i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
              {i < actions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
                  {meta.label}
                </span>
                {action.admin_id && (
                  <span className="text-xs text-muted-foreground font-mono">{String(action.admin_id).slice(0, 8)}…</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {action.created_at ? new Date(action.created_at).toLocaleString() : ''}
                </span>
              </div>
              {action.reason_code && (
                <p className="text-xs text-muted-foreground">Reason: {action.reason_code}</p>
              )}
              {action.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">"{action.notes}"</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pipeline Evidence Drawer ─────────────────────────────────────────────────

function PipelineEvidenceDrawer({ detail, onClose }) {
  if (!detail) return null;

  const draft = detail.draft || {};
  const queueItem = detail.queueItem || {};
  const rawNotification = detail.rawNotification || {};
  const review = detail.review || {};
  const verification = detail.verification || {};
  const actions = detail.actions || [];

  const steps = [
    {
      label: 'Raw Notification',
      icon: Database,
      id: rawNotification.id,
      status: rawNotification.status || (rawNotification.id ? 'received' : null),
      details: [
        rawNotification.notification_url && `URL: ${rawNotification.notification_url}`,
        rawNotification.pdf_url && `PDF: ${rawNotification.pdf_url}`,
        rawNotification.source_id && `Source ID: ${rawNotification.source_id}`,
      ].filter(Boolean),
    },
    {
      label: 'Queue Item',
      icon: Activity,
      id: queueItem.id,
      status: queueItem.status,
      details: [
        queueItem.job_type && `Type: ${queueItem.job_type}`,
        queueItem.organization && `Org: ${queueItem.organization}`,
      ].filter(Boolean),
    },
    {
      label: 'AI Draft',
      icon: FileText,
      id: draft.id,
      status: draft.status,
      details: [
        draft.ai_provider && `Provider: ${draft.ai_provider}`,
        draft.tokens_used && `Tokens: ${draft.tokens_used}`,
        draft.generation_ms && `Time: ${draft.generation_ms}ms`,
      ].filter(Boolean),
    },
    {
      label: 'Review Result',
      icon: ListChecks,
      id: review.id,
      status: review.decision_band,
      details: [
        review.publish_readiness !== undefined && `Readiness: ${Math.round(review.publish_readiness)}`,
        review.confidence !== undefined && `Confidence: ${Math.round(review.confidence)}`,
      ].filter(Boolean),
    },
    {
      label: 'Fact Verification',
      icon: Shield,
      id: verification.id,
      status: verification.verification_score !== undefined ? (verification.blocking_issues?.length ? 'blocked' : 'verified') : null,
      details: [
        verification.verification_score !== undefined && `Score: ${Math.round(verification.verification_score)}`,
        verification.blocking_issues?.length && `${verification.blocking_issues.length} blockers`,
      ].filter(Boolean),
    },
    {
      label: 'Moderation Actions',
      icon: GitBranch,
      id: actions.length > 0 ? `${actions.length} actions` : null,
      status: actions.length > 0 ? actions[actions.length - 1]?.action_type : null,
      details: actions.slice(-3).map(a => `${a.action_type || a.action} — ${a.created_at ? new Date(a.created_at).toLocaleTimeString() : ''}`),
    },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close evidence drawer" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold">Pipeline Evidence</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs text-muted-foreground mb-5">
            Complete chain from raw notification → queue → draft → review → moderation → publish.
            Every ID shown is a real database row — no SQL needed to verify the pipeline.
          </p>

          {/* Chain steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const hasId = Boolean(step.id);
              return (
                <div key={step.label}>
                  <div className={`rounded-xl border p-4 ${hasId ? 'border-border bg-card' : 'border-dashed border-border/50 bg-muted/30 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasId ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${hasId ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{step.label}</p>
                          {step.status && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                              {step.status}
                            </span>
                          )}
                        </div>
                        {step.id && (
                          <p className="text-xs font-mono text-muted-foreground truncate mb-1">ID: {step.id}</p>
                        )}
                        {step.details.map((d, j) => (
                          <p key={j} className="text-xs text-muted-foreground">{d}</p>
                        ))}
                        {!hasId && (
                          <p className="text-xs text-muted-foreground italic">Not yet created</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center my-1">
                      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Audit timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase text-muted-foreground">Moderation Audit Timeline</p>
            </div>
            <AuditTimeline actions={detail.actions || []} />
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Review Row ─────────────────────────────────────────────────────────────

function ReviewItemRow({ item, onOpen, onAction, busy, selected, onSelect }) {
  const data = draftData(item);
  const blockers = item.verification?.blockingIssues || item.verification?.blocking_issues || [];
  const warnings = item.review?.warnings || item.verification?.warnings || [];
  const recommendation = item.review?.recommendations?.[0]?.message || decisionBandMeta(item.decisionBand).label;

  return (
    <div className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 xl:grid-cols-[32px_1.5fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr_auto] xl:items-center">
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => onSelect(item.draftId)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {selected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
        </button>
      </div>

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

// ─── Review Drawer ─────────────────────────────────────────────────────────

function ReviewDrawer({ draftId, onClose, onAction, busy }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('review'); // 'review' | 'audit' | 'pipeline'

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
  const actions = detail.actions || [];
  const blockers = verification.blocking_issues || [];
  const warnings = [
    ...(Array.isArray(review.warnings) ? review.warnings : []),
    ...(Array.isArray(verification.warnings) ? verification.warnings : []),
  ];
  const recommendations = Array.isArray(review.recommendations) ? review.recommendations : [];
  const band = review.decision_band || 'manual_review_required';

  // If user clicks pipeline tab, show evidence drawer instead
  if (tab === 'pipeline') {
    return <PipelineEvidenceDrawer detail={detail} onClose={onClose} />;
  }

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
          <div className="flex items-center gap-2 shrink-0">
            {/* Tab buttons */}
            <button
              onClick={() => setTab('review')}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-all ${tab === 'review' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
            >
              Review
            </button>
            <button
              onClick={() => setTab('audit')}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${tab === 'audit' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
            >
              <History className="w-3 h-3" />
              Audit ({actions.length})
            </button>
            <button
              onClick={() => setTab('pipeline')}
              className="h-8 px-3 rounded-md text-xs font-semibold border border-border flex items-center gap-1 hover:border-primary/40 transition-all"
            >
              <Layers className="w-3 h-3" />
              Evidence
            </button>
            <button onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {detailQuery.isLoading ? (
          <div className="flex-1 space-y-4 p-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : tab === 'audit' ? (
          /* AUDIT TIMELINE TAB */
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Moderation Audit History</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Read-only audit trail of all admin actions on this draft. Timestamps are UTC.
            </p>
            <AuditTimeline actions={actions} />
          </div>
        ) : (
          /* REVIEW TAB */
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

// ─── Bulk Confirm Dialog ──────────────────────────────────────────────────────

function BulkConfirmDialog({ action, count, onConfirm, onCancel, loading }) {
  const isApprove = action === 'approve';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onCancel} className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isApprove ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {isApprove ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          </div>
          <div>
            <h3 className="font-bold text-lg">Bulk {isApprove ? 'Approve' : 'Reject'}</h3>
            <p className="text-xs text-muted-foreground">{count} items selected</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to <strong>{isApprove ? 'approve' : 'reject'}</strong> {count} review item{count !== 1 ? 's' : ''}?
          {!isApprove && ' Rejected items will not proceed to job draft conversion.'}
          {isApprove && ' Blocked items will be skipped and reported.'}
        </p>
        <div className="flex gap-2">
          <button
            id={`bulk-${action}-confirm-btn`}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-10 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${isApprove ? 'bg-emerald-600 text-white hover:opacity-90' : 'bg-red-600 text-white hover:opacity-90'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isApprove ? 'Approve All' : 'Reject All'}
          </button>
          <button onClick={onCancel} className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiModeration() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialog, setBulkDialog] = useState(null); // 'approve' | 'reject'
  const [bulkResult, setBulkResult] = useState(null);

  const queueQuery = useQuery({
    queryKey: ['admin-review-queue', filter],
    queryFn: devSafeQuery(() => getReviewQueue({ limit: 100, decisionBand: filter === 'all' ? null : filter })),
    retry: false,
    refetchInterval: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, draftId }) => {
      const body = { reasonCode: 'phase5d_moderation_dashboard' };
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
    onError: (error) => {
      if (isDevModeError(error)) toast.info('Review actions require Vercel deployment — not available in local dev.');
      else toast.error(error.message);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }) => {
      const body = { draftIds: ids, confirm: true, reasonCode: 'phase5d_bulk_moderation' };
      if (action === 'approve') return bulkApproveReviewItems(body);
      if (action === 'reject') return bulkRejectReviewItems(body);
      throw new Error('Invalid bulk action');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
      setBulkResult(data);
      setBulkDialog(null);
      setSelectedIds(new Set());
      toast.success(`Bulk ${variables.action} complete: ${data.succeeded ?? data.processed ?? variables.ids.length} items`);
    },
    onError: (err) => {
      if (isDevModeError(err)) toast.info('Bulk actions require Vercel deployment — not available in local dev.');
      else toast.error(err.message || 'Bulk action failed');
    },
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

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.draftId)));
  };

  const handleBulkConfirm = () => {
    bulkMutation.mutate({ action: bulkDialog, ids: Array.from(selectedIds) });
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
          <p className="mt-1 text-sm text-muted-foreground">Readiness, confidence, blockers, warnings, duplicate risk, admin actions, and audit timeline.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {selectedIds.size > 0 && (
                      <>
              <button
                id="bulk-approve-btn"
                onClick={() => setBulkDialog('approve')}
                disabled={isDevMode()}
                title={isDevMode() ? 'Requires Vercel deployment' : undefined}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve {selectedIds.size}
              </button>
              <button
                id="bulk-reject-btn"
                onClick={() => setBulkDialog('reject')}
                disabled={isDevMode()}
                title={isDevMode() ? 'Requires Vercel deployment' : undefined}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject {selectedIds.size}
              </button>
            </>
          )}
          <Score label="Items" value={queueQuery.data?.count || items.length} tone="text-foreground" />
          <Score label="Blocked" value={items.filter((item) => item.decisionBand === 'blocked').length} tone="text-red-700" />
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">Oldest</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{ageLabel(oldestAgeHours)}</p>
          </div>
        </div>
      </div>

      {queueQuery.error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {isDevMode()
            ? 'Review queue requires Vercel deployment — data not available in local dev.'
            : queueQuery.error.message}
        </div>
      )}

      {/* Bulk result banner */}
      {bulkResult && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-emerald-700">
            Bulk action complete — processed: {bulkResult.processed ?? '?'}, succeeded: {bulkResult.succeeded ?? '?'}
            {bulkResult.blocked > 0 && <span className="ml-2 text-amber-700">· {bulkResult.blocked} blocked items skipped</span>}
          </p>
          <button onClick={() => setBulkResult(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
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
        <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground xl:grid xl:grid-cols-[32px_1.5fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr_auto]">
          {/* Select all */}
          <div className="flex items-center justify-center">
            <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
              {selectedIds.size === items.length && items.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
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
              selected={selectedIds.has(item.draftId)}
              onSelect={toggleSelect}
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

      {bulkDialog && (
        <BulkConfirmDialog
          action={bulkDialog}
          count={selectedIds.size}
          onConfirm={handleBulkConfirm}
          onCancel={() => setBulkDialog(null)}
          loading={bulkMutation.isPending}
        />
      )}
    </main>
  );
}
