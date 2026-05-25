import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { getJobCategories } from '@/api/supabaseApi'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const defaultForm = {
  title: '',
  slug: '',
  organization: '',
  category: '',
  job_type: '',
  location: '',
  qualification: '',
  experience: '',
  salary: '',
  application_start_date: '',
  last_date: '',
  official_website: '',
  apply_link: '',
  notification_pdf: '',
  short_description: '',
  full_description: '',
  eligibility: {},
  selection_process: {},
  important_dates: [],
  application_fee: '',
  tags: '',
  featured: false,
  status: 'draft',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  canonical_url: '',
  og_image: '',
}

const slugify = (value = '') => {
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const generateSlug = (title = '') => {
  const normalized = slugify(title)
  return normalized || `job-${Date.now().toString().slice(-6)}`
}

/**
 * Safely validate JSON field value
 * @param {any} value
 * @param {string} fieldName
 * @returns {{valid: boolean, error?: string}}
 */
const validateJsonFieldSafely = (value, fieldName) => {
  if (!value) return { valid: true };

  // If already an object/array, try to stringify
  if (typeof value === 'object' && value !== null) {
    try {
      JSON.stringify(value);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `${fieldName} contains non-serializable data` };
    }
  }

  // If string, try to parse
  if (typeof value === 'string') {
    if (value.trim() === '') return { valid: true };
    try {
      JSON.parse(value);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `${fieldName} contains invalid JSON: ${err.message}` };
    }
  }

  return { valid: true };
};

/**
 * Validate all JSON fields in form
 * @param {Record<string, any>} form
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
const validateFormJsonFields = (form) => {
  const jsonFields = ['eligibility', 'selection_process', 'important_dates'];
  const errors = {};

  jsonFields.forEach((field) => {
    const validation = validateJsonFieldSafely(form[field], field);
    if (!validation.valid) {
      errors[field] = validation.error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * @param {Record<string, any>} jobData
 */
const getSafeForm = (jobData = {}) => ({
  ...defaultForm,
  ...jobData,
  slug: jobData.slug ?? defaultForm.slug,
  title: jobData.title ?? defaultForm.title,
  organization: jobData.organization ?? defaultForm.organization,
  category: jobData.category ?? defaultForm.category,
  job_type: jobData.job_type ?? defaultForm.job_type,
  location: jobData.location ?? defaultForm.location,
  qualification: jobData.qualification ?? defaultForm.qualification,
  experience: jobData.experience ?? defaultForm.experience,
  salary: jobData.salary ?? defaultForm.salary,
  application_start_date: jobData.application_start_date ?? defaultForm.application_start_date,
  last_date: jobData.last_date ?? defaultForm.last_date,
  official_website: jobData.official_website ?? defaultForm.official_website,
  apply_link: jobData.apply_link ?? defaultForm.apply_link,
  notification_pdf: jobData.notification_pdf ?? defaultForm.notification_pdf,
  short_description: jobData.short_description ?? defaultForm.short_description,
  full_description: jobData.full_description ?? defaultForm.full_description,
  eligibility: jobData.eligibility ?? defaultForm.eligibility,
  selection_process: jobData.selection_process ?? defaultForm.selection_process,
  important_dates: jobData.important_dates ?? defaultForm.important_dates,
  application_fee: jobData.application_fee ?? defaultForm.application_fee,
  tags: typeof jobData.tags === 'string'
    ? jobData.tags
    : Array.isArray(jobData.tags)
    ? jobData.tags.join(', ')
    : defaultForm.tags,
  featured: jobData.featured ?? defaultForm.featured,
  status: jobData.status ?? defaultForm.status,
  seo_title: jobData.seo_title ?? defaultForm.seo_title,
  seo_description: jobData.seo_description ?? defaultForm.seo_description,
  seo_keywords: jobData.seo_keywords ?? defaultForm.seo_keywords,
  canonical_url: jobData.canonical_url ?? defaultForm.canonical_url,
  og_image: jobData.og_image ?? defaultForm.og_image,
})

/**
 * @param {{
 *   job?: Record<string, any>,
 *   onClose: () => void,
 *   onSave: (payload: Record<string, any>) => void,
 *   submitError?: any,
 *   isSubmitting?: boolean,
 * }} props
 */
export default function JobEditor({ job = {}, onClose, onSave, submitError, isSubmitting = false }) {
  const [form, setForm] = useState(/** @type {Record<string, any>} */ (getSafeForm(job)))
  const [tab, setTab] = useState('content')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [validationErrors, setValidationErrors] = useState(/** @type {{ [key: string]: string }} */ ({}))

  const { data: categories = [] } = useQuery({
    queryKey: ['job-categories'],
    queryFn: () => getJobCategories({ orderBy: 'sort_order', ascending: true, limit: 500 }),
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    setForm(getSafeForm(job))
    setSlugManuallyEdited(!!job.slug)
    setValidationErrors({})
  }, [job])

  useEffect(() => {
    if (!slugManuallyEdited && !form.slug && form.title) {
      setForm((s) => ({ ...s, slug: generateSlug(form.title) }))
    }
  }, [form.title, slugManuallyEdited])

  useEffect(() => {
    if (submitError?.fieldErrors && typeof submitError.fieldErrors === 'object') {
      setValidationErrors((prev) => ({ ...prev, ...submitError.fieldErrors }))
    }
  }, [submitError])

  /**
   * @type {(k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void}
   */
  const handle = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target ? e.target.value : e }))

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const handleTitleChange = (e) => {
    const title = e.target.value
    setForm((s) => ({
      ...s,
      title,
      slug: slugManuallyEdited ? s.slug : generateSlug(title),
    }))
  }

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const handleSlugChange = (e) => {
    const slug = slugify(e.target.value)
    setSlugManuallyEdited(!!slug)
    setForm((s) => ({ ...s, slug }))
  }

  /** @param {string} k */
  const toggle = (k) => () => setForm((s) => ({ ...s, [k]: !s[k] }))

  /** @returns {Record<string, any> | null} */
  const validateForm = () => {
    const nextSlug = form.slug ? slugify(form.slug) : generateSlug(form.title)
    const nextErrors = /** @type {{ [key: string]: string }} */ ({})

    if (!form.title?.trim()) nextErrors.title = 'Title is required.'
    if (!nextSlug) nextErrors.slug = 'Slug is required.'

    // Validate JSON fields
    const jsonValidation = validateFormJsonFields(form);
    if (!jsonValidation.valid) {
      Object.assign(nextErrors, jsonValidation.errors);
    }

    // Validate canonical URL if provided
    if (form.canonical_url && form.canonical_url.trim()) {
      try {
        new URL(form.canonical_url);
      } catch (err) {
        nextErrors.canonical_url = 'Invalid URL format. Must start with http:// or https://';
      }
    }

    setValidationErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return null

    return {
      ...form,
      slug: nextSlug,
    }
  }

  const save = () => {
    const validated = /** @type {Record<string, any> | null} */ (validateForm())
    if (!validated) return

    const payload = {
      ...validated,
      category: validated.category === 'none' ? null : validated.category,
      seo_keywords: validated.seo_keywords?.trim() || null,
      tags: typeof validated.tags === 'string'
        ? validated.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : Array.isArray(validated.tags)
        ? validated.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    }
    onSave(payload)
  }

  const renderError = () => {
    if (!submitError) return null;

    // Extract specific error information
    const fieldErrors = submitError?.fieldErrors || {};
    const mainMessage = submitError?.message || 'An unexpected error occurred.';
    const hint = submitError?.hint;
    const details = submitError?.details;
    const code = submitError?.code;

    // Determine error type for messaging
    let errorType = 'Save Failed';
    let errorTitle = 'Save Failed';
    
    if (/conflict|duplicate|409/i.test(mainMessage + code + details)) {
      errorType = 'Conflict Detected';
      errorTitle = '⚠️ Conflict Error';
    } else if (/json|parse|serialize/i.test(mainMessage)) {
      errorType = 'Invalid Data Format';
      errorTitle = '⚠️ Invalid Format';
    } else if (/validation|invalid|required/i.test(mainMessage)) {
      errorType = 'Validation Error';
      errorTitle = '⚠️ Validation Error';
    }

    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 mb-6 shadow-sm">
        {/* Main Error Header */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-destructive">{errorTitle}</p>
            <p className="text-sm text-destructive/85 mt-1">{mainMessage}</p>

            {/* Field-Specific Errors */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="mt-3 space-y-2 bg-background/50 rounded-2xl p-3">
                <p className="text-xs font-semibold text-muted-foreground">Issues with:</p>
                <ul className="space-y-1">
                  {Object.entries(fieldErrors).map(([field, error]) => (
                    <li key={field} className="flex items-start gap-2 text-xs text-destructive">
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 flex-shrink-0">•</span>
                      <span>
                        <strong>{field}:</strong> {error}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Helpful Hints */}
            {(hint || details) && (
              <div className="mt-3 space-y-1">
                {hint && (
                  <p className="text-xs text-muted-foreground">
                    <strong>💡 Suggestion:</strong> {hint}
                  </p>
                )}
                {details && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Details:</strong> {details}
                  </p>
                )}
              </div>
            )}

            {/* Conflict Resolution Help */}
            {/conflict|duplicate|409/i.test(mainMessage + code + details) && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Resolution steps:</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Try editing the job title or slug to make it unique</li>
                  <li>If using a canonical URL, ensure it's different from other jobs</li>
                  <li>The system auto-generates unique slugs, so changing the title helps</li>
                  <li>If the problem persists, contact support with error code: {code}</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = form.status === 'published' ? 'Published' : 'Draft'
  const sectionCard = 'rounded-[2rem] border border-border/70 bg-background/80 p-5 shadow-sm'
  const fieldBase = 'w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10'
  const fieldArea = `${fieldBase} min-h-[120px] resize-none`

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-xl px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{form.title?.trim() || 'New Job'}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${form.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-700'}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Premium job CMS workflow with structured content, SEO controls, and publication status.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onClose} className="rounded-2xl border border-border/80 bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={isSubmitting} className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Saving...' : 'Save job'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 lg:p-6">
        {renderError()}

        <div className="flex flex-col gap-3 overflow-x-auto pb-4">
          {['content','dates','seo','related'].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition ${tab === item ? 'bg-primary text-white shadow-md shadow-primary/20' : 'border-border/70 bg-background text-foreground hover:bg-muted'}`}>
              {item === 'content' ? 'Content' : item === 'dates' ? 'Dates' : item === 'seo' ? 'SEO' : 'Related'}
            </button>
          ))}
        </div>

        <div className="grid gap-6">
          {tab === 'content' && (
            <>
              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Basic details</p>
                  <p className="text-sm text-muted-foreground">Set the job title, slug, organization, and category for search and listing pages.</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Job title</label>
                    <input placeholder="Job title" value={form.title ?? ''} onChange={handleTitleChange} className={fieldBase} />
                    {validationErrors.title && <p className="text-xs text-destructive">{validationErrors.title}</p>}
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Slug</label>
                    <input placeholder="Job slug" value={form.slug ?? ''} onChange={handleSlugChange} className={fieldBase} />
                    <p className="text-xs text-muted-foreground">SEO-friendly URL segment. Lowercase, hyphen-separated.</p>
                    {validationErrors.slug && <p className="text-xs text-destructive">{validationErrors.slug}</p>}
                  </div>
                </div>
              </section>

              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Organization info</p>
                  <p className="text-sm text-muted-foreground">Capture organization, location, category, job type, and experience level.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Organization</label>
                    <input placeholder="Staff Selection Commission (SSC)" value={form.organization ?? ''} onChange={handle('organization')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={form.category || 'none'} onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Array.isArray(categories) && categories.filter((c) => c?.slug).map((c) => (
                          <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select a reusable job category (slug stored).</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Location</label>
                    <input placeholder="India" value={form.location ?? ''} onChange={handle('location')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Job type</label>
                    <input placeholder="Full Time" value={form.job_type ?? ''} onChange={handle('job_type')} className={fieldBase} />
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 mt-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Qualification</label>
                    <input placeholder="Bachelor Degree" value={form.qualification ?? ''} onChange={handle('qualification')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Experience</label>
                    <input placeholder="Freshers Eligible" value={form.experience ?? ''} onChange={handle('experience')} className={fieldBase} />
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 mt-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Salary</label>
                    <input placeholder="₹35,000 – ₹65,000" value={form.salary ?? ''} onChange={handle('salary')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Application fee</label>
                    <input placeholder="₹100" value={form.application_fee ?? ''} onChange={handle('application_fee')} className={fieldBase} />
                  </div>
                </div>
              </section>

              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Job overview</p>
                  <p className="text-sm text-muted-foreground">Add a short description and the complete job description for the public listing.</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Short description</label>
                    <textarea placeholder="Apply online for SSC CGL Recruitment 2026..." value={form.short_description ?? ''} onChange={(e) => setForm((s) => ({ ...s, short_description: e.target.value }))} className={fieldArea} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Full description</label>
                    <textarea placeholder="The Staff Selection Commission has released..." value={form.full_description ?? ''} onChange={(e) => setForm((s) => ({ ...s, full_description: e.target.value }))} className={fieldArea} />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'dates' && (
            <>
              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Application timeline</p>
                  <p className="text-sm text-muted-foreground">Set the application opening and closing dates for the job posting.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Application start date</label>
                    <input type="date" value={form.application_start_date ? form.application_start_date.split('T')[0] : ''} onChange={handle('application_start_date')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Last date</label>
                    <input type="date" value={form.last_date ? form.last_date.split('T')[0] : ''} onChange={handle('last_date')} className={fieldBase} />
                  </div>
                </div>
              </section>

              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">External links</p>
                  <p className="text-sm text-muted-foreground">Add the official website, application page, and notification resources.</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Official website</label>
                    <input placeholder="https://ssc.gov.in" value={form.official_website ?? ''} onChange={handle('official_website')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Apply link</label>
                    <input placeholder="https://ssc.gov.in" value={form.apply_link ?? ''} onChange={handle('apply_link')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Notification PDF URL</label>
                    <input placeholder="https://example.com/notification.pdf" value={form.notification_pdf ?? ''} onChange={handle('notification_pdf')} className={fieldBase} />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'seo' && (
            <>
              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Meta settings</p>
                  <p className="text-sm text-muted-foreground">Optimize title and description for search and social visibility.</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">SEO title</label>
                    <input placeholder="SSC CGL Recruitment 2026 Apply Online" value={form.seo_title ?? ''} onChange={handle('seo_title')} className={fieldBase} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">SEO description</label>
                    <textarea placeholder="Apply online for SSC CGL Recruitment 2026..." value={form.seo_description ?? ''} onChange={handle('seo_description')} className={fieldArea} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">SEO keywords</label>
                    <input
                      placeholder="ssc, exam, government jobs, online apply, 2026"
                      value={form.seo_keywords ?? ''}
                      onChange={handle('seo_keywords')}
                      className={fieldBase}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated keywords for metadata and future content matching.</p>
                  </div>
                </div>
              </section>

              <section className={sectionCard}>
                <div className="mb-5 flex flex-col gap-2">
                  <p className="text-sm font-semibold">Open Graph & canonical</p>
                  <p className="text-sm text-muted-foreground">Control social previews and the canonical landing URL.</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Canonical URL</label>
                    <input placeholder="https://yourdomain.com/jobs/ssc-cgl-recruitment-2026" value={form.canonical_url ?? ''} onChange={handle('canonical_url')} className={fieldBase} />
                    <p className="text-xs text-muted-foreground">Optional: Sets the preferred URL for search engines. Leave blank to auto-generate.</p>
                    {validationErrors.canonical_url && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span>❌</span> {validationErrors.canonical_url}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Open Graph image</label>
                    <input placeholder="https://example.com/og-image.jpg" value={form.og_image ?? ''} onChange={handle('og_image')} className={fieldBase} />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'related' && (
            <section className={sectionCard}>
              <div className="mb-5 flex flex-col gap-2">
                <p className="text-sm font-semibold">Related & publication</p>
                <p className="text-sm text-muted-foreground">Control tags, featured placement, and publication state for the job listing.</p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tags</label>
                  <input placeholder="ssc, cgl, government-jobs, central-government, freshers" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags ?? ''} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} className={fieldBase} />
                  <p className="text-xs text-muted-foreground">Comma-separated tags improve related content matching.</p>
                  {validationErrors.tags && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>❌</span> {validationErrors.tags}
                    </p>
                  )}
                  {validationErrors.eligibility && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>❌ Eligibility:</span> {validationErrors.eligibility}
                    </p>
                  )}
                  {validationErrors.selection_process && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>❌ Selection Process:</span> {validationErrors.selection_process}
                    </p>
                  )}
                  {validationErrors.important_dates && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>❌ Important Dates:</span> {validationErrors.important_dates}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-4">
                    <div>
                      <p className="text-sm font-medium">Featured job</p>
                      <p className="text-xs text-muted-foreground">Show this job in featured sections.</p>
                    </div>
                    <Switch checked={!!form.featured} onCheckedChange={(checked) => setForm((s) => ({ ...s, featured: checked }))} />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-4">
                    <div>
                      <p className="text-sm font-medium">Publish status</p>
                      <p className="text-xs text-muted-foreground">Toggle to publish or keep as draft.</p>
                    </div>
                    <Switch checked={form.status === 'published'} onCheckedChange={(checked) => setForm((s) => ({ ...s, status: checked ? 'published' : 'draft' }))} />
                  </label>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
