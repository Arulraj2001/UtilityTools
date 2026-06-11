import { supabase } from '@/api/supabaseClient'

const BATCH_SIZE = 10
const BATCH_TIMEOUT = 30000 // 30 seconds

let eventBatch = []
let batchTimer = null

/**
 * Track a job analytics event
 */
export const trackJobEvent = async (
  jobId,
  eventType,
  {
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
    referrer = typeof document !== 'undefined' ? document.referrer : '',
    sessionId = getSessionId(),
  } = {}
) => {
  try {
    const event = {
      job_id: jobId,
      event_type: eventType,
      user_agent: userAgent,
      referrer: referrer,
      session_id: sessionId,
    }

    // Add to batch
    eventBatch.push(event)

    // If batch is full, flush immediately
    if (eventBatch.length >= BATCH_SIZE) {
      await flushEventBatch()
    } else if (!batchTimer) {
      // Otherwise schedule flush after timeout
      batchTimer = setTimeout(flushEventBatch, BATCH_TIMEOUT)
    }
  } catch (error) {
    console.error('Failed to track job event:', error)
  }
}

/**
 * Flush queued events to database
 */
const flushEventBatch = async () => {
  if (eventBatch.length === 0) return

  const events = [...eventBatch]
  eventBatch = []

  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }

  try {
    const { error } = await supabase
      .from('job_analytics_events')
      .insert(events)

    if (error) {
      console.error('Failed to insert analytics events:', error)
      // Re-queue events if insert failed
      eventBatch.unshift(...events)
    }
  } catch (error) {
    console.error('Analytics batch insert error:', error)
    eventBatch.unshift(...events)
  }
}

/**
 * Get or create session ID
 */
const getSessionId = () => {
  const key = 'job_analytics_session'
  if (typeof sessionStorage === 'undefined') return 'session-' + Date.now()

  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(key, id)
  }
  return id
}

/**
 * Track job page view — deduplicated per session.
 * Prevents inflated counts from page refreshes, back-nav, and SPA re-renders.
 */
const VIEWED_JOBS_KEY = 'job_views_dedup';

const getViewedJobs = () => {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(VIEWED_JOBS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const markViewed = (jobId) => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const set = getViewedJobs();
    set.add(jobId);
    // Cap at 200 entries to avoid storage overflow
    const arr = [...set].slice(-200);
    sessionStorage.setItem(VIEWED_JOBS_KEY, JSON.stringify(arr));
  } catch { /* quota exceeded — ignore */ }
};

export const trackJobView = (jobId) => {
  if (!jobId) return Promise.resolve();
  const viewed = getViewedJobs();
  if (viewed.has(jobId)) return Promise.resolve(); // Already counted this session
  markViewed(jobId);
  return trackJobEvent(jobId, 'view');
}

/**
 * Track apply button click
 */
export const trackJobApply = (jobId) => {
  return trackJobEvent(jobId, 'apply_click')
}

/**
 * Track featured job impression
 */
export const trackFeaturedImpression = (jobId) => {
  return trackJobEvent(jobId, 'featured_impression')
}

/**
 * Track job click/open
 */
export const trackJobClick = (jobId) => {
  return trackJobEvent(jobId, 'click')
}

/**
 * Get job analytics summary
 */
export const getJobAnalytics = async (jobId) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('views_count, apply_clicks, last_viewed_at')
      .eq('id', jobId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch job analytics:', error)
    return null
  }
}

/**
 * Get most viewed jobs
 */
export const getMostViewedJobs = async ({ limit = 10 } = {}) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, slug, views_count, apply_clicks')
      .order('views_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch most viewed jobs:', error)
    return []
  }
}

/**
 * Get most applied jobs
 */
export const getMostAppliedJobs = async ({ limit = 10 } = {}) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, slug, views_count, apply_clicks')
      .order('apply_clicks', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch most applied jobs:', error)
    return []
  }
}

/**
 * Get trending jobs (recently viewed)
 */
export const getTrendingJobs = async ({ limit = 10, hours = 24 } = {}) => {
  try {
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, slug, views_count, last_viewed_at')
      .gte('last_viewed_at', cutoffDate)
      .order('last_viewed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch trending jobs:', error)
    return []
  }
}

/**
 * Get featured job performance
 */
export const getFeaturedJobPerformance = async ({ limit = 10 } = {}) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, slug, views_count, apply_clicks, featured')
      .eq('featured', true)
      .order('views_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch featured job performance:', error)
    return []
  }
}

/**
 * Get job analytics comparison (for dashboard)
 */
export const getJobsAnalyticsSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('views_count, apply_clicks, featured')

    if (error) throw error

    const summary = {
      totalViews: (data || []).reduce((sum, j) => sum + (j.views_count || 0), 0),
      totalApplies: (data || []).reduce((sum, j) => sum + (j.apply_clicks || 0), 0),
      averageViewsPerJob: 0,
      averageApplesPerJob: 0,
      conversionRate: 0,
      featuredCount: (data || []).filter(j => j.featured).length,
    }

    if (data && data.length > 0) {
      summary.averageViewsPerJob = summary.totalViews / data.length
      summary.averageApplesPerJob = summary.totalApplies / data.length
      summary.conversionRate = summary.totalApplies / Math.max(1, summary.totalViews)
    }

    return summary
  } catch (error) {
    console.error('Failed to fetch analytics summary:', error)
    return null
  }
}

/**
 * Ensure events are flushed before page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Sync flush for unload
    if (eventBatch.length > 0) {
      const events = [...eventBatch]
      eventBatch = []
      navigator.sendBeacon(
        '/api/analytics',
        JSON.stringify({ events })
      )
    }
  })
}

export default {
  trackJobEvent,
  trackJobView,
  trackJobApply,
  trackFeaturedImpression,
  trackJobClick,
  getJobAnalytics,
  getMostViewedJobs,
  getMostAppliedJobs,
  getTrendingJobs,
  getFeaturedJobPerformance,
  getJobsAnalyticsSummary,
}
