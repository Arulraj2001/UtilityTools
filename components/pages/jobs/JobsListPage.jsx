'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Search,
  Sparkles,
  ShieldCheck,
  MapPin,
  GraduationCap,
  ArrowRight,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';

import { useJobs, useFeaturedJobs } from '@/hooks/jobs/useJobs';
import { useJobCategories } from '@/hooks/jobs/useJobCategories';
import { useSiteBooleanSetting } from '@/hooks/useSiteSettings';
import JobsFilterSidebar from '@/components/jobs/JobsFilterSidebar';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';

import { Button } from '@/components/ui/button';
import JobCard from '@/components/jobs/JobCard';
import FeaturedJobs from '@/components/jobs/FeaturedJobs';
import { JobListSkeleton } from '@/components/jobs/skeletons';

import {
  JobsEmptyState,
  SearchResultsEmptyState,
} from '@/components/jobs/empty-states';
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO';
import { buildCollectionPageSchema } from '@/lib/pageSchemas';

const jobsDescription =
  'Browse curated QuickUtils job listings, internships, fresher opportunities, and government openings with application-support tools and source review standards.';

export default function JobsListPage({
  initialJobs = [],
  initialFeatured = [],
  initialCategories = [],
  initialSearchParams = {},
}) {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [pageSize, setPageSize] = useState(20);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [location, setLocation] = useState('');
  const queryString = initialSearchParams.queryString || '';
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);

  const { value: jobsEnabled = true } = useSiteBooleanSetting('jobs_enabled', true);
  const { data: jobCategories = [] } = useJobCategories({ initialData: initialCategories });

  const categoryParam = initialSearchParams.category || undefined;

  const {
    data: jobs = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useJobs({
    search,
    category: categoryParam,
    pageSize,
    enabled: jobsEnabled,
    initialData: !search && pageSize === 20 ? initialJobs : undefined,
  });

  const { data: featured = [] } = useFeaturedJobs({ initialData: initialFeatured });

  const { data: allJobs = [] } = useJobs({
    pageSize: 100,
    enabled: jobsEnabled,
    initialData: initialJobs,
  });

  const activeQuickFilters = useMemo(
    () =>
      [
        { key: 'featured', label: 'Featured' },
        { key: 'recent', label: 'Recent' },
        { key: 'freshers', label: 'Freshers' },
        { key: 'remote', label: 'Remote' },
        { key: 'government', label: 'Government' },
        { key: 'private', label: 'Private' },
        { key: 'tech', label: 'IT' },
      ]
        .filter((item) => searchParams.has(item.key))
        .map((item) => item.label),
    [searchParams]
  );

  const results = useMemo(() => {
    const filters = {
      featured: searchParams.has('featured'),
      recent: searchParams.has('recent'),
      freshers: searchParams.has('freshers'),
      remote: searchParams.has('remote'),
      government: searchParams.has('government'),
      private: searchParams.has('private'),
      tech: searchParams.has('tech'),
    };

    return (jobs || []).filter((job) => {
      const normalized = (value) =>
        String(value || '').toLowerCase();

      const tags = Array.isArray(job.tags)
        ? job.tags.map((tag) => normalized(tag))
        : [];

      const tagString = tags.join(' ');

      // In-memory location filtering
      if (location) {
        const normalizedLoc = normalized(job.location);
        if (location === 'remote' && !normalizedLoc.includes('remote')) return false;
        if (location === 'delhi' && !normalizedLoc.includes('delhi') && !normalizedLoc.includes('ncr')) return false;
        if (location === 'bengaluru' && !normalizedLoc.includes('bengaluru') && !normalizedLoc.includes('bangalore') && !normalizedLoc.includes('karnataka')) return false;
        if (location === 'mumbai' && !normalizedLoc.includes('mumbai') && !normalizedLoc.includes('maharashtra')) return false;
        if (location === 'pune' && !normalizedLoc.includes('pune')) return false;
        if (location === 'hyderabad' && !normalizedLoc.includes('hyderabad') && !normalizedLoc.includes('telangana')) return false;
        if (location === 'india' && !normalizedLoc.includes('india') && !normalizedLoc.includes('all india')) return false;
      }

      if (filters.featured && !job.featured) {
        return false;
      }

      if (filters.recent) {
        const dateValue =
          job.created_at ||
          job.last_date ||
          job.application_start_date;

        const date = dateValue ? new Date(dateValue) : null;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);

        if (!date || Number.isNaN(date.getTime()) || date < cutoff) {
          return false;
        }
      }

      if (
        filters.freshers &&
        !(
          normalized(job.experience).includes('fresher') ||
          tagString.includes('fresh')
        )
      ) {
        return false;
      }

      if (
        filters.remote &&
        !(
          normalized(job.location).includes('remote') ||
          tagString.includes('remote')
        )
      ) {
        return false;
      }

      if (
        filters.government &&
        !(
          normalized(job.category).includes('government') ||
          normalized(job.organization).includes('government') ||
          tagString.includes('government') ||
          tagString.includes('gov')
        )
      ) {
        return false;
      }

      if (
        filters.private &&
        !(
          normalized(job.category).includes('private') ||
          normalized(job.organization).includes('private') ||
          tagString.includes('private')
        )
      ) {
        return false;
      }

      if (
        filters.tech &&
        !(
          normalized(job.category).includes('tech') ||
          normalized(job.job_type).includes('tech') ||
          tagString.includes('tech') ||
          normalized(job.title).includes('tech')
        )
      ) {
        return false;
      }

      return true;
    });
  }, [jobs, searchParams, location]);

  const internshipCount = useMemo(
    () =>
      (allJobs || []).filter((job) => {
        const value = `${job.title || ''} ${job.category || ''} ${job.job_type || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
        return value.includes('intern');
      }).length,
    [allJobs]
  );

  const collectionSchema = useMemo(() => buildCollectionPageSchema({
    name: 'QuickUtils Jobs',
    description: jobsDescription,
    url: `${SITE_URL}/jobs`,
    items: results.slice(0, 50),
    getItem: (job) => ({
      name: job.title,
      description: job.short_description,
      url: `${SITE_URL}/jobs/${encodeURIComponent(job.slug)}`,
    }),
  }), [results]);

  const hasMoreServerResults = jobs.length >= pageSize;
  const robotsContent = initialSearchParams.hasFilters || (allJobs || []).length === 0
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large';

  const handleCategorySelect = (slug) => {
    const params = new URLSearchParams(searchParams);
    if (!slug) {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    setPageSize(20);
    const nextQuery = params.toString();
    router.push(nextQuery ? `/jobs?${nextQuery}` : '/jobs');
  };

  if (!jobsEnabled) {
    return (
      <main className="min-h-screen bg-background">
        <StaticPageSEO
          title="Jobs Temporarily Unavailable - QuickUtils"
          description="QuickUtils job listings are temporarily unavailable while published listings are reviewed."
          path="/jobs"
          robots="noindex, follow"
        />
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                Temporary Notice
              </span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Job Listings Temporarily Unavailable
            </h2>

            <p className="text-muted-foreground mt-4 text-base">
              We are currently updating and reviewing job listings to ensure
              quality and accuracy.
            </p>

            <p className="text-muted-foreground mt-2 text-sm">
              Please check back later for new opportunities.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <StaticPageSEO
        title="Jobs, Internships and Government Openings - QuickUtils"
        description={jobsDescription}
        path="/jobs"
        ogTitle="QuickUtils Jobs"
        ogDescription={jobsDescription}
        robots={robotsContent}
        jsonLd={[
          collectionSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Jobs', url: `${SITE_URL}/jobs` },
          ]),
        ]}
      />
      
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border py-12 sm:py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="absolute inset-0 hero-grid-pattern pointer-events-none" />
        <div className="hidden lg:block absolute top-10 left-[8%] w-72 h-72 rounded-full bg-primary/8 blur-3xl animate-float pointer-events-none" />
        
        <div className="relative max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-8 flex flex-col items-start text-left">
              
              {/* Sparks Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10 dark:fill-indigo-400/10" />
                <span>Latest opportunities updated regularly</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.15] text-foreground mb-4">
                Find Jobs, <br />
                <span className="text-[#6366f1]">Internships & Government Openings</span>
              </h1>

              {/* Description */}
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mb-5">
                Discover government jobs, fresher openings, internships, and career opportunities with
                related tools, workflows, and application support.
              </p>

              {/* Policies Links */}
              <div className="flex flex-wrap gap-4 text-xs font-bold text-[#6366f1] mb-6">
                <Link href="/job-sources-policy" className="hover:text-[#4f46e5] hover:underline transition-colors">Job sources policy</Link>
                <Link href="/corrections-policy" className="hover:text-[#4f46e5] hover:underline transition-colors">Report a job correction</Link>
                <Link href="/category/government-exam-tools" className="hover:text-[#4f46e5] hover:underline transition-colors">Application document tools</Link>
              </div>

              {/* Unified Search Panel Card (Image 1 Layout) */}
              <div className="w-full bg-card border border-border rounded-3xl p-5 shadow-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.2fr_auto] gap-4 items-end mb-6">
                
                {/* Search Jobs Field */}
                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold text-foreground/80 mb-1.5 block">Search Jobs</label>
                  <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all h-[42px]">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPageSize(20);
                      }}
                      placeholder="Search by job title, keyword or organization"
                      className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-sm font-medium focus:ring-0 focus:outline-none focus:ring-offset-0 p-0"
                    />
                  </div>
                </div>
                
                {/* Category Dropdown */}
                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold text-foreground/80 mb-1.5 block">Category</label>
                  <div className="relative flex items-center border border-border rounded-xl px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all h-[42px]">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
                    <select
                      value={categoryParam || ''}
                      onChange={(e) => handleCategorySelect(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-foreground text-sm font-medium focus:ring-0 focus:outline-none appearance-none pr-8 cursor-pointer p-0 dark:bg-card [&>option]:bg-card [&>option]:text-foreground"
                    >
                      <option value="">All Categories</option>
                      {jobCategories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Location Dropdown */}
                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold text-foreground/80 mb-1.5 block">Location</label>
                  <div className="relative flex items-center border border-border rounded-xl px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all h-[42px]">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
                    <select
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setPageSize(20);
                      }}
                      className="w-full bg-transparent border-none outline-none text-foreground text-sm font-medium focus:ring-0 focus:outline-none appearance-none pr-8 cursor-pointer p-0 dark:bg-card [&>option]:bg-card [&>option]:text-foreground"
                    >
                      <option value="">All Locations</option>
                      <option value="remote">Remote</option>
                      <option value="delhi">New Delhi / NCR</option>
                      <option value="bengaluru">Bengaluru</option>
                      <option value="mumbai">Mumbai</option>
                      <option value="pune">Pune</option>
                      <option value="hyderabad">Hyderabad</option>
                      <option value="india">All India</option>
                    </select>
                    <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl px-6 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm h-[42px] w-full md:w-auto mt-2 md:mt-0"
                >
                  <span>Search Jobs</span>
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Active Filter Badges */}
              {(categoryParam || activeQuickFilters.length > 0 || location) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {categoryParam && (
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                      Category: {categoryParam}
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                      Location: {location}
                    </span>
                  )}
                  {activeQuickFilters.map((filter) => (
                    <span
                      key={filter}
                      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              )}

              {/* Horizontal Stats Bar Card */}
              <div className="w-full bg-card border border-border rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-around gap-6 text-foreground/80">
                {/* Jobs available */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                    <BriefcaseBusiness className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-foreground leading-tight">
                      {allJobs.length ? `${allJobs.length.toLocaleString()} Jobs Available` : 'No Live Listings'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Latest government & private openings</div>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-border" />

                {/* Internship openings */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-foreground leading-tight">
                      {internshipCount ? `${internshipCount.toLocaleString()} Internship Openings` : 'Internships Under Review'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Fresh opportunities for students</div>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-border" />

                {/* Support tools */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-foreground leading-tight">
                      12+ Support Tools
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Application & career tools</div>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Right Column - Hero Graphic */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end w-full">
              <div className="relative w-full max-w-[340px] lg:max-w-none rounded-[1.75rem] overflow-hidden border border-border shadow-xl animate-float">
                <Image
                  src="/Job.png"
                  alt="QuickUtils Jobs Illustration"
                  width={343}
                  height={196}
                  sizes="(max-width: 1024px) 340px, 340px"
                  className="w-full h-auto object-contain bg-transparent"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile filter sheet */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="bottom" className="max-w-full h-full pt-4">
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold">
                Filters
              </SheetTitle>
            </SheetHeader>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Adjust category and quick filters for jobs.
              </p>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-14rem)] pb-28">
              <JobsFilterSidebar
                onClear={() => setIsFilterOpen(false)}
                initialCategories={jobCategories}
                queryString={queryString}
              />
            </div>

            <SheetFooter className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 p-4 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between w-full">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Clear Filters
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1.2fr)_320px] gap-6">
          
          {/* FILTER SIDEBAR */}
          <aside className="hidden xl:block">
            <div className="sticky top-28 rounded-3xl border border-border/50 bg-card p-5 shadow-sm">
              <JobsFilterSidebar
                initialCategories={jobCategories}
                queryString={queryString}
              />
            </div>
          </aside>

          {/* JOB LIST */}
          <div className="min-w-0">
            
            <div className="xl:hidden mb-6">
              <FeaturedJobs jobs={featured} />
            </div>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Latest Opportunities
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse curated opportunities and application-ready resources.
                </p>
              </div>
            </div>

            {isLoading ? (
              <JobListSkeleton count={5} />
            ) : isError ? (
              <div className="p-8 rounded-3xl border bg-card text-center">
                <p className="text-destructive font-medium text-base">
                  Failed to load jobs
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error?.message || 'Something went wrong while loading jobs.'}
                </p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="space-y-4">
                  {results.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                    />
                  ))}
                </div>

                {hasMoreServerResults && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      disabled={isFetching}
                      onClick={() => setPageSize((current) => current + 20)}
                    >
                      {isFetching ? 'Loading...' : 'Load More Jobs'}
                    </Button>
                  </div>
                )}
              </>
            ) : search.trim() ? (
              <SearchResultsEmptyState
                query={search}
                onClear={() => setSearch('')}
              />
            ) : (
              <JobsEmptyState />
            )}
          </div>

          {/* FEATURED / SIDEBAR */}
          <aside className="hidden xl:block">
            <div className="sticky top-28 space-y-5">
              
              <FeaturedJobs jobs={featured} />

              <div className="rounded-3xl border border-border/50 bg-card p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-semibold">
                      Application Support
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tools and workflow guidance for job applications.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-sm text-muted-foreground">
                  <Link href="/tool/passport-size-photo-maker" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>Photo Resizer</span>
                  </Link>

                  <Link href="/tool/photo-kb-reducer" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>Photo KB Reducer</span>
                  </Link>

                  <Link href="/tool/ssc-signature-resizer" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>Signature Resize Tools</span>
                  </Link>

                  <Link href="/tool/compress-pdf" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>PDF Compressor</span>
                  </Link>

                  <Link href="/tool/age-calculator" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>Age Calculator</span>
                  </Link>

                  <Link href="/tool/percentage-calculator" className="flex items-start gap-2 hover:text-[#6366f1] transition-colors">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] shrink-0" />
                    <span>Percentage Calculator</span>
                  </Link>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border text-center">
                  <Link href="/tools" className="inline-flex items-center gap-1 text-xs font-bold text-[#6366f1] hover:text-[#4f46e5] transition-colors">
                    Explore All Tools <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </section>
    </main>
  );
}
