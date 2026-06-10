import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('PHASE3_5_LIVE_AUDIT_ERROR missing Supabase URL or service role key');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
});

const anonClient = anonKey ? createClient(url, anonKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
}) : null;

const countTable = async (table) => {
  const result = await supabase.from(table).select('id', { count: 'exact', head: true });
  return { table, count: result.count ?? 0, error: result.error?.message || null };
};

const [
  drafts,
  reviews,
  verifications,
  actions,
  jobs,
] = await Promise.all([
  countTable('ai_job_drafts'),
  countTable('ai_review_results'),
  countTable('ai_fact_verifications'),
  countTable('ai_moderation_actions'),
  countTable('jobs'),
]);

const latestReviews = await supabase
  .from('ai_review_results')
  .select('id,draft_id,publish_readiness,confidence,decision_band,review_version,scoring_version,draft_snapshot_hash,is_stale,created_at')
  .order('created_at', { ascending: false })
  .limit(10);

const latestVerifications = await supabase
  .from('ai_fact_verifications')
  .select('id,draft_id,verification_score,source_confidence,verification_version,blocking_issues,warnings,verified_at')
  .order('verified_at', { ascending: false })
  .limit(10);

const latestActions = await supabase
  .from('ai_moderation_actions')
  .select('id,draft_id,job_id,action,admin_id,created_at')
  .order('created_at', { ascending: false })
  .limit(10);

const convertedJobs = await supabase
  .from('jobs')
  .select('id,title,status,ai_draft_id,source_raw_notification_id,published_by,published_at')
  .not('ai_draft_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(10);

const anonProbeTable = async (table) => {
  if (!anonClient) return { table, configured: false, visibleRows: null, error: 'anon key not configured' };
  const result = await anonClient.from(table).select('id').limit(1);
  return {
    table,
    configured: true,
    visibleRows: result.data?.length ?? 0,
    error: result.error?.message || null,
  };
};

const anonRlsProbe = await Promise.all([
  anonProbeTable('ai_review_results'),
  anonProbeTable('ai_fact_verifications'),
  anonProbeTable('ai_moderation_actions'),
]);

const summarizeReviews = (latestReviews.data || []).reduce((summary, review) => {
  summary.byBand[review.decision_band] = (summary.byBand[review.decision_band] || 0) + 1;
  if (!review.scoring_version) summary.missingScoringVersion += 1;
  if (!review.review_version) summary.missingReviewVersion += 1;
  if (!review.draft_snapshot_hash) summary.missingSnapshotHash += 1;
  if (review.is_stale) summary.stale += 1;
  return summary;
}, {
  byBand: {},
  missingScoringVersion: 0,
  missingReviewVersion: 0,
  missingSnapshotHash: 0,
  stale: 0,
});

console.log('PHASE3_5_LIVE_AUDIT_RESULT', JSON.stringify({
  counts: { drafts, reviews, verifications, actions, jobs },
  latestReviewSummary: summarizeReviews,
  latestVerificationIssues: (latestVerifications.data || []).map((item) => ({
    id: item.id,
    draftId: item.draft_id,
    score: item.verification_score,
    sourceConfidence: item.source_confidence,
    blockingIssues: Array.isArray(item.blocking_issues) ? item.blocking_issues.length : 0,
    warnings: Array.isArray(item.warnings) ? item.warnings.length : 0,
    verificationVersion: item.verification_version,
  })),
  latestActions: (latestActions.data || []).map((item) => ({
    action: item.action,
    draftId: item.draft_id,
    jobId: item.job_id,
    hasAdmin: Boolean(item.admin_id),
    createdAt: item.created_at,
  })),
  convertedJobs: (convertedJobs.data || []).map((item) => ({
    id: item.id,
    status: item.status,
    hasAiDraftId: Boolean(item.ai_draft_id),
    hasRawProvenance: Boolean(item.source_raw_notification_id),
    published: Boolean(item.published_at),
  })),
  anonRlsProbe,
  errors: {
    latestReviews: latestReviews.error?.message || null,
    latestVerifications: latestVerifications.error?.message || null,
    latestActions: latestActions.error?.message || null,
    convertedJobs: convertedJobs.error?.message || null,
  },
}, null, 2));
