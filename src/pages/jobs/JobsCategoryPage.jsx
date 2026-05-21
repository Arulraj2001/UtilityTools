import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getJobCategoryBySlug, getJobsByCategorySlug } from '@/api/supabaseApi'
import JobCard from '@/components/jobs/JobCard'

export default function JobsCategoryPage() {
  const { slug } = useParams()

  const { data: category, isLoading: loadingCategory } = useQuery({
    queryKey: ['job-category', slug],
    queryFn: () => getJobCategoryBySlug(slug),
    enabled: !!slug,
  })

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', 'category', slug],
    queryFn: () => getJobsByCategorySlug(slug),
    enabled: !!slug,
  })

  if (loadingCategory) return <div className="p-8">Loading category…</div>

  if (!category) return <div className="p-8">Category not found.</div>

  return (
    <main className="min-h-screen">
      <section className="border-b border-border/40 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          {category.description && <p className="text-sm text-muted-foreground mt-2">{category.description}</p>}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Related Jobs</h2>
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
          <aside>
            {/* simple featured widget placeholder */}
            <div className="rounded-2xl border bg-card p-4">Related resources</div>
          </aside>
        </div>
      </section>
    </main>
  )
}
