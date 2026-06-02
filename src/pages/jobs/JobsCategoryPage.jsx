import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getJobCategoryBySlug, getJobsByCategorySlug } from '@/api/supabaseApi'
import { useSiteBooleanSetting } from '@/hooks/useSiteSettings'
import JobCard from '@/components/jobs/JobCard'
import PageNotFound from '@/lib/PageNotFound'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/pageSchemas'
import { getJobCategorySeoContent } from '@/lib/jobCategorySeo'

export default function JobsCategoryPage() {
  const { slug } = useParams()

  const { value: jobsEnabled = true } = useSiteBooleanSetting('jobs_enabled', true)

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

  if (!category) return (
    <PageNotFound
      title="Job category not found"
      message="The job category you requested does not exist or is not available."
      primaryHref="/jobs"
      primaryLabel="Browse jobs"
    />
  )

  const seoContent = getJobCategorySeoContent(category)
  const description = category.seo_description || category.description || seoContent.intro
  const pagePath = `/jobs/category/${category.slug}`
  const collectionSchema = buildCollectionPageSchema({
    name: `${category.name} Jobs`,
    description,
    url: `${SITE_URL}${pagePath}`,
    items: jobs.slice(0, 50),
    getItem: (job) => ({
      name: job.title,
      description: job.short_description,
      url: `${SITE_URL}/jobs/${encodeURIComponent(job.slug)}`,
    }),
  })
  const faqSchema = buildFaqSchema(seoContent.faqs)

  return (
    !jobsEnabled ? (
      <main className="max-w-5xl mx-auto px-4 py-16">
        <StaticPageSEO
          title={`${category.name} Jobs Temporarily Unavailable - QuickUtils`}
          description="This job category is temporarily unavailable while listings are reviewed."
          path={pagePath}
          robots="noindex, follow"
        />
        <div className="rounded-3xl border bg-card p-10 text-center">
          <h2 className="text-2xl font-bold">Job listings are paused</h2>
          <p className="text-muted-foreground mt-3">
            Job content is currently hidden from public pages.
          </p>
        </div>
      </main>
    ) : (
    <main className="min-h-screen">
      <StaticPageSEO
        title={category.seo_title || `${category.name} Jobs - QuickUtils`}
        description={description}
        path={pagePath}
        ogTitle={`${category.name} Jobs - QuickUtils`}
        ogDescription={description}
        jsonLd={[
          collectionSchema,
          faqSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Jobs', url: `${SITE_URL}/jobs` },
            { name: category.name, url: `${SITE_URL}${pagePath}` },
          ]),
        ]}
      />
      <section className="border-b border-border/40 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{description}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/job-sources-policy" className="text-primary hover:underline">How jobs are sourced</Link>
            <Link to="/corrections-policy" className="text-primary hover:underline">Report a listing issue</Link>
            <Link to="/category/government-exam-tools" className="text-primary hover:underline">Application document tools</Link>
          </div>
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
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Related resources</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <Link to="/tool/passport-size-photo-maker" className="text-muted-foreground hover:text-primary">Passport photo maker</Link>
                <Link to="/tool/ssc-signature-resizer" className="text-muted-foreground hover:text-primary">Signature resize tool</Link>
                <Link to="/workflow/compress-pdf-below-200kb" className="text-muted-foreground hover:text-primary">Compress PDF below 200KB</Link>
                <Link to="/job-sources-policy" className="text-muted-foreground hover:text-primary">Job sources policy</Link>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Job category FAQs</h2>
              <div className="mt-4 space-y-4">
                {seoContent.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="text-sm font-medium">{faq.question}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
    )
  )
}
