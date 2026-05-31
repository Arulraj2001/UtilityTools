/**
 * Job Quality Scorer
 * Produces 7 quality scores for a job post object.
 * All scores are 0-100 unless noted.
 */

// ── Spam phrases to detect ────────────────────────────────────────────────────

const SPAM_PHRASES = [
  "apply now before it's too late",
  'golden opportunity',
  'dream job',
  'limited seats',
  ' hurry',
  "don't miss",
  'last chance',
  'grab this',
  'urgent vacancy',
  'immediate joining',
  'guaranteed',
  'amazing opportunity',
  'incredible offer',
  'fantastic chance',
  'once in a lifetime',
]

const AI_FLUFF = [
  "it's important to note",
  "it's worth mentioning",
  'delve into',
  'in conclusion',
  'in summary',
  'in essence',
  'to summarize',
  'as mentioned earlier',
]

const stripHtml = (html) =>
  String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length

// ── Individual scorers ────────────────────────────────────────────────────────

const scoreContent = (job) => {
  let score = 0
  const desc = stripHtml(job.full_description || job.short_description || '')
  const wc = wordCount(desc)

  if (wc >= 2000)      score += 30
  else if (wc >= 1000) score += 20
  else if (wc >= 500)  score += 12
  else if (wc >= 200)  score += 5

  if (job.organization?.trim())            score += 10
  if (job.eligibility)                      score += 10
  if (job.selection_process?.length > 0)   score += 10
  if (job.important_dates?.length > 0)     score += 10
  if (job.application_fee?.trim())         score += 5
  if (job.short_description?.length > 80) score += 10
  if (job.official_website?.trim())        score += 5

  return Math.min(100, score)
}

const scoreSEO = (job) => {
  let score = 0

  if (job.seo_title) {
    const len = job.seo_title.length
    if (len >= 40 && len <= 70) score += 30
    else if (len > 0)           score += 15
  }
  if (job.seo_description) {
    const len = job.seo_description.length
    if (len >= 120 && len <= 160) score += 25
    else if (len > 0)             score += 12
  }
  if (job.seo_keywords?.trim())   score += 15
  if (job.canonical_url?.trim())  score += 10
  if (job.slug?.trim())           score += 10
  if (job.og_image?.trim())       score += 10

  return Math.min(100, score)
}

const scoreEEAT = (job) => {
  let score = 0
  // Experience: content depth
  const wc = wordCount(stripHtml(job.full_description || ''))
  if (wc >= 1500) score += 20
  else if (wc >= 800) score += 10

  // Expertise: structured data
  if (job.eligibility)                    score += 20
  if (job.selection_process?.length > 0) score += 15

  // Authoritativeness: official sources
  if (job.official_website?.trim())  score += 20
  if (job.apply_link?.trim())        score += 15
  if (job.notification_pdf?.trim())  score += 10

  return Math.min(100, score)
}

const scoreAdsense = (job) => {
  let score = 100
  const text = stripHtml((job.full_description || '') + ' ' + (job.short_description || ''))

  SPAM_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) score -= 12
  })

  // Thin content penalty
  const wc = wordCount(text)
  if (wc < 300)  score -= 30
  if (wc < 100)  score -= 30

  // Exaggerated salary claims
  if (/\b(crore|lakh)\b/i.test(text) && !/official|notification|as per/i.test(text)) {
    score -= 15
  }

  return Math.max(0, score)
}

const scoreSpamRisk = (job) => {
  let risk = 0
  const text = stripHtml((job.full_description || '') + ' ' + (job.short_description || ''))

  SPAM_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) risk += 15
  })
  AI_FLUFF.forEach((phrase) => {
    if (text.includes(phrase)) risk += 8
  })

  // Excessive exclamation marks
  const exclamations = (text.match(/!/g) || []).length
  if (exclamations > 5) risk += exclamations * 3

  // ALL CAPS words
  const capsWords = ((job.full_description || '').match(/\b[A-Z]{4,}\b/g) || []).length
  if (capsWords > 10) risk += capsWords

  return Math.min(100, risk)
}

const scoreDuplicateRisk = (job, existingJobs = []) => {
  if (!existingJobs.length) return 0

  const title = String(job.title || '').toLowerCase()
  const org = String(job.organization || '').toLowerCase()

  let maxRisk = 0
  for (const existing of existingJobs) {
    const eTitle = String(existing.title || '').toLowerCase()
    const eOrg = String(existing.organization || '').toLowerCase()

    // Title similarity (simple word overlap)
    const titleWords = new Set(title.split(/\s+/).filter((w) => w.length > 3))
    const eTitleWords = new Set(eTitle.split(/\s+/).filter((w) => w.length > 3))
    const intersection = [...titleWords].filter((w) => eTitleWords.has(w)).length
    const union = new Set([...titleWords, ...eTitleWords]).size
    const titleSim = union > 0 ? (intersection / union) * 100 : 0

    // Org match boost
    const orgMatch = org && eOrg && org === eOrg ? 20 : 0
    const risk = Math.min(100, titleSim + orgMatch)
    if (risk > maxRisk) maxRisk = risk
  }
  return Math.round(maxRisk)
}

const scoreFreshness = (job) => {
  const now = Date.now()
  let score = 100

  // Content age
  if (job.created_at) {
    const daysOld = (now - new Date(job.created_at).getTime()) / 86400000
    if (daysOld > 90) score -= 40
    else if (daysOld > 30) score -= 20
    else if (daysOld > 14) score -= 10
  }

  // Application deadline
  if (job.last_date) {
    const deadline = new Date(job.last_date)
    const daysToDeadline = (deadline.getTime() - now) / 86400000
    if (daysToDeadline < 0)   score = 0   // Expired
    else if (daysToDeadline < 3)  score -= 30  // Expiring very soon
    else if (daysToDeadline < 7)  score -= 15  // Expiring soon
  }

  // Has important dates
  if (!job.important_dates?.length && !job.last_date) score -= 10

  return Math.max(0, score)
}

// ── Main scorer ───────────────────────────────────────────────────────────────

/**
 * Score a job object across all 7 dimensions.
 * existingJobs: array of jobs to check for duplicates (optional)
 * Returns { content, seo, eeat, adsense, spamRisk, duplicateRisk, freshness, overall, label, issues }
 */
export const scoreJob = (job, existingJobs = []) => {
  const content       = scoreContent(job)
  const seo           = scoreSEO(job)
  const eeat          = scoreEEAT(job)
  const adsense       = scoreAdsense(job)
  const spamRisk      = scoreSpamRisk(job)
  const duplicateRisk = scoreDuplicateRisk(job, existingJobs)
  const freshness     = scoreFreshness(job)

  // Overall: weighted average (higher is better; spam/duplicate are inverted)
  const overall = Math.round(
    (content * 0.25) +
    (seo * 0.20) +
    (eeat * 0.20) +
    (adsense * 0.15) +
    ((100 - spamRisk) * 0.10) +
    ((100 - duplicateRisk) * 0.05) +
    (freshness * 0.05)
  )

  const label =
    overall >= 80 ? 'Excellent' :
    overall >= 65 ? 'Good' :
    overall >= 45 ? 'Fair' : 'Needs Work'

  // Build issue list
  const issues = []
  if (content < 50)       issues.push('Content too thin — expand with more details')
  if (seo < 50)           issues.push('SEO fields incomplete — add title, description, keywords')
  if (eeat < 40)          issues.push('Add official website and apply links to improve authority')
  if (adsense < 70)       issues.push('Adsense risk — remove promotional language')
  if (spamRisk > 30)      issues.push('Spam risk detected — review content for prohibited phrases')
  if (duplicateRisk > 60) issues.push('High duplicate risk — verify this is a unique posting')
  if (freshness === 0)    issues.push('Application deadline has passed — verify or archive')
  if (freshness < 30)     issues.push('Application deadline is approaching soon')

  return { content, seo, eeat, adsense, spamRisk, duplicateRisk, freshness, overall, label, issues }
}

// ── Score colour helpers (for UI badges) ─────────────────────────────────────

export const scoreColor = (score, inverted = false) => {
  const s = inverted ? 100 - score : score
  if (s >= 75) return 'text-green-500'
  if (s >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

export const scoreBg = (score, inverted = false) => {
  const s = inverted ? 100 - score : score
  if (s >= 75) return 'bg-green-500/10 text-green-500'
  if (s >= 50) return 'bg-yellow-500/10 text-yellow-600'
  return 'bg-red-500/10 text-red-500'
}
