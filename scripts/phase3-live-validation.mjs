import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import AdminReviewService from '../src/jobs/review/adminReviewService.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('PHASE3_LIVE_VALIDATION_ERROR missing Supabase URL or service role key');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: ws,
  },
});

const service = new AdminReviewService(supabase);

const draftsResult = await supabase
  .from('ai_job_drafts')
  .select('id,status,queue_item_id,readiness_score,confidence_score')
  .order('created_at', { ascending: false })
  .limit(3);

if (draftsResult.error) {
  console.error('PHASE3_LIVE_VALIDATION_ERROR', draftsResult.error.message);
  process.exit(1);
}

const drafts = draftsResult.data || [];
const summaries = [];

for (const draft of drafts) {
  const result = await service.runReview(draft.id, { adminId: null });
  summaries.push({
    draftId: draft.id,
    previousStatus: draft.status,
    decisionBand: result.decision.decisionBand,
    publishReadiness: result.decision.publishReadiness,
    confidence: result.decision.confidence,
    blockingIssues: result.decision.verification.blockingIssues.length,
    warnings: result.decision.warnings.length,
  });
}

const reviewCount = await supabase
  .from('ai_review_results')
  .select('id', { count: 'exact', head: true });
const verificationCount = await supabase
  .from('ai_fact_verifications')
  .select('id', { count: 'exact', head: true });
const auditCount = await supabase
  .from('ai_moderation_actions')
  .select('id', { count: 'exact', head: true });

console.log('PHASE3_LIVE_VALIDATION_RESULT', JSON.stringify({
  draftsFound: drafts.length,
  reviewsRun: summaries.length,
  summaries,
  persistedCounts: {
    reviews: reviewCount.count ?? null,
    verifications: verificationCount.count ?? null,
    moderationActions: auditCount.count ?? null,
  },
}, null, 2));
