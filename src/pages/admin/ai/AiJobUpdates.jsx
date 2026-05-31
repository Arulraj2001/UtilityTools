import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitCompare, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { getUpdateQueue, updateUpdateQueueItem } from '@/api/supabaseApi'
import { format } from 'date-fns'

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  applied:  { label: 'Applied',  color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
}

const CHANGE_LABELS = {
  vacancy_update:      'Vacancy Count Changed',
  date_change:         'Date Changed',
  eligibility_change:  'Eligibility Changed',
  salary_revision:     'Salary Revised',
  status_change:       'Status Changed',
  new_notification:    'New Notification',
}

function DiffView({ item }) {
  const [show, setShow] = useState(false)
  const prev = item.previous_data || {}
  const next = item.new_data || {}
  let changes = []
  try { changes = JSON.parse(item.ai_analysis || '[]') } catch {}

  return (
    <div>
      <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {show ? 'Hide' : 'Show'} diff
      </button>
      {show && (
        <div className="mt-3 space-y-3">
          {item.diff_summary && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
              <p className="text-xs font-medium text-yellow-700">{item.diff_summary}</p>
            </div>
          )}
          {changes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Detected Changes</p>
              {changes.map((c, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="font-medium">{c.field}</span>
                  <span className="text-red-500 line-through">{c.old_value}</span>
                  <span className="text-green-600 font-medium">{c.new_value}</span>
                </div>
              ))}
            </div>
          )}
          {prev.content && next.content && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-medium text-red-500 mb-2">Previous Version</p>
                <p className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-wrap">{prev.content?.slice(0, 400)}…</p>
              </div>
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                <p className="text-xs font-medium text-green-600 mb-2">New Version</p>
                <p className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-wrap">{next.content?.slice(0, 400)}…</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AiJobUpdates() {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('pending')

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['update-queue', filterStatus],
    queryFn: () => getUpdateQueue({ status: filterStatus === 'all' ? null : filterStatus, limit: 100 }),
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUpdateQueueItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['update-queue'] }),
    onError: err => toast.error(err.message),
  })

  const handleAction = (id, status) => {
    updateMutation.mutate({ id, data: { status } })
    toast.success(`Update ${status}`)
  }

  const pendingCount = updates.filter(u => u.status === 'pending').length

  return (
    <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
          <GitCompare className="w-3.5 h-3.5" />AI Job Intelligence
        </div>
        <h1 className="text-4xl font-black tracking-tight">Job Updates</h1>
        <p className="text-muted-foreground mt-2">Review AI-detected changes to monitored job notifications. Approve or reject each update.</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 px-5 py-4 mb-6">
        <p className="text-sm font-medium mb-1">Update review workflow</p>
        <p className="text-xs text-muted-foreground">When Vacancy Monitoring detects a change, it appears here. Review the diff, then: <strong>Approve</strong> to acknowledge and update the article, or <strong>Reject</strong> to dismiss (the original stays unchanged). The original job post is never auto-modified.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['applied', 'Applied']].map(([key, label]) => (
          <button key={key} onClick={() => setFilterStatus(key)} className={`h-8 px-3 rounded-xl text-xs font-medium transition-all ${filterStatus === key ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted/50'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-24 rounded-[20px] bg-muted/30 animate-pulse"/>)}</div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No updates in this view</p>
          <p className="text-sm mt-1">Use Vacancy Monitoring to check for changes and they'll appear here.</p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden">
          <div className="divide-y divide-border/50">
            {updates.map(update => {
              const meta = STATUS_META[update.status] || STATUS_META.pending
              const changeLabel = CHANGE_LABELS[update.change_type] || update.change_type
              return (
                <div key={update.id} className="px-5 py-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                        {update.change_type && (
                          <span className="text-xs bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5 rounded-full">{changeLabel}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {update.created_at ? format(new Date(update.created_at), 'MMM d, HH:mm') : ''}
                        </span>
                      </div>
                      <p className="font-bold text-sm">{update.ai_monitoring_rules?.title || 'Unknown job'}</p>
                      {update.diff_summary && <p className="text-sm text-muted-foreground mt-1">{update.diff_summary}</p>}
                    </div>
                    {update.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleAction(update.id, 'approved')} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-green-500/30 text-green-600 text-xs font-medium hover:bg-green-500/10 transition-all">
                          <CheckCircle2 className="w-3.5 h-3.5" />Approve
                        </button>
                        <button onClick={() => handleAction(update.id, 'rejected')} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-red-500/30 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-all">
                          <XCircle className="w-3.5 h-3.5" />Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <DiffView item={update} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
