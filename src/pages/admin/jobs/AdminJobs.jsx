import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAdminJobs, {
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
} from '@/hooks/jobs/useAdminJobs'

import JobEditor from '@/components/admin/jobs/JobEditor'
import JobFilters from '@/components/admin/jobs/JobFilters'
import JobStatusBadge from '@/components/admin/jobs/JobStatusBadge'
import JobAnalyticsDashboard from '@/components/jobs/admin/JobAnalyticsDashboard'
import { AdminJobsSkeleton } from '@/components/jobs/skeletons'
import { AdminJobsEmptyState } from '@/components/jobs/empty-states'
import { jobToasts } from '@/lib/jobs/jobToasts'
import { getSiteSettings, createSiteSetting, updateSiteSetting } from '@/api/supabaseApi'
import { getSiteSetting, parseSiteSettingValue } from '@/lib/siteSettings'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import {
  Plus,
  Pencil,
  Trash2,
  BriefcaseBusiness,
  Sparkles,
  X,
} from 'lucide-react'

export default function AdminJobs() {
  const { data: jobs = [], isLoading } = useAdminJobs()

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
  })

  const [jobsEnabled, setJobsEnabled] = useState(true)
  const queryClient = useQueryClient()

  const settingEntry = getSiteSetting(settings, 'jobs_enabled')
  const parsedJobsEnabled = parseSiteSettingValue(settingEntry, true)

  useEffect(() => {
    setJobsEnabled(parsedJobsEnabled)
  }, [parsedJobsEnabled])

  const createSettingMutation = useMutation({
    mutationFn: createSiteSetting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSiteSetting(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const saveJobsEnabled = async (value) => {
    const payload = { key: 'jobs_enabled', value: String(value), type: 'boolean', group: 'jobs' }
    if (settingEntry?.id) {
      await updateSettingMutation.mutateAsync({ id: settingEntry.id, payload })
      return
    }
    await createSettingMutation.mutateAsync(payload)
  }

  const createMutation = useCreateJob()
  const updateMutation = useUpdateJob()
  const deleteMutation = useDeleteJob()

  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'featured'
            ? job.featured
            : job.status === filter

      const matchesSearch =
        query === '' ||
        job.title?.toLowerCase().includes(query) ||
        job.organization?.toLowerCase().includes(query) ||
        job.category?.toLowerCase().includes(query)

      return matchesFilter && matchesSearch
    })
  }, [jobs, filter, search])

  return (
    <main className="max-w-[1700px] mx-auto px-4 lg:px-8 py-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Recruitment CMS
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Jobs Management
          </h1>

          <p className="text-muted-foreground mt-3">
            Create, manage, publish, and optimize SEO-ready job listings.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Label className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/80 px-4 py-2">
              <span>Public jobs</span>
              <Switch
                checked={jobsEnabled}
                onCheckedChange={(checked) => {
                  setJobsEnabled(checked)
                  saveJobsEnabled(checked).catch(() => {
                    setJobsEnabled(!checked)
                  })
                }}
              />
            </Label>
            <span className="text-xs text-muted-foreground">
              {jobsEnabled ? 'Visible to public pages' : 'Paused on public pages'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setEditing({})}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Job
        </button>
      </div>

      {/* ANALYTICS DASHBOARD */}
      <div className="mb-12">
        <JobAnalyticsDashboard />
      </div>

      {/* JOBS LIST */}
      <div className="grid grid-cols-1">
        <section className="min-w-0">
          <JobFilters
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
          />

          <div className="mt-6 rounded-[32px] border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border/50">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  All Jobs
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  Manage published, draft, and featured job posts.
                </p>
              </div>

              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                <BriefcaseBusiness className="w-5 h-5 text-primary" />
              </div>
            </div>

            {/* LIST */}
            {isLoading ? (
              <AdminJobsSkeleton />
            ) : jobs.length === 0 ? (
              <div className="p-10">
                <AdminJobsEmptyState onCreateClick={() => setEditing({})} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold">No jobs match your filters.</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Try adjusting the search term or status filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="group px-5 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* LEFT */}
                      <div className="min-w-0">
                        <h3 className="text-base font-bold tracking-tight line-clamp-1">
                          {job.title}
                        </h3>

                        <p className="text-xs text-muted-foreground mt-1.5">
                          {job.organization}
                        </p>
                      </div>

                      {/* RIGHT */}
                      <div className="flex flex-wrap items-center gap-2">
                        <JobStatusBadge status={job.status} />

                        <button
                          onClick={() => setEditing(job)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:border-primary/40 hover:text-primary transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this job?')) {
                              deleteMutation.mutate(job.id, {
                                onSuccess: () => jobToasts.jobDeleted(),
                                onError: (err) => jobToasts.deleteFailed(err.message),
                              })
                            }
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* DRAWER MODAL */}
      <AnimatePresence>
        {editing && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* DRAWER */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                type: 'spring',
                damping: 28,
                stiffness: 260,
              }}
              className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[92vw] lg:w-[840px]"
            >
              <div className="h-full bg-background border-l border-border/50 shadow-2xl overflow-hidden">
                
                {/* HEADER */}
                <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-5 border-b border-border/50 bg-background/90 backdrop-blur-xl">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">
                      {editing?.id
                        ? 'Edit Job'
                        : 'Create Job'}
                    </h2>

                    <p className="text-sm text-muted-foreground mt-1">
                      Manage recruitment content.
                    </p>
                  </div>

                  <button
                    onClick={() => setEditing(null)}
                    className="w-11 h-11 rounded-2xl border border-border hover:border-primary/30 flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* BODY */}
                <div className="h-[calc(100vh-88px)] overflow-y-auto p-5">
                  <JobEditor
                    job={editing}
                    onClose={() => setEditing(null)}
                    onSave={(data) => {
                      const isCreating = !editing?.id
                      const mutation = isCreating ? createMutation : updateMutation
                      const toastCallback = isCreating 
                        ? () => jobToasts.jobCreated(data.title)
                        : () => jobToasts.jobUpdated(data.title)
                      
                      mutation.mutate(
                        isCreating ? data : { id: editing.id, data },
                        { 
                          onSuccess: () => {
                            toastCallback()
                            setEditing(null)
                          },
                          onError: (err) => {
                            jobToasts.saveFailed(err.message)
                          }
                        }
                      )
                    }}
                    submitError={
                      createMutation.error ||
                      updateMutation.error
                    }
                    isSubmitting={
                      createMutation.isLoading ||
                      updateMutation.isLoading
                    }
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}