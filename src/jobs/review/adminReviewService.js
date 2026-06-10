import crypto from 'node:crypto';
import slugify from 'slugify';
import { scoreJob } from '../../lib/jobQualityScorer.js';
import { validateJobQualityGate } from '../../lib/jobQualityGate.js';
import ReviewEngine from './reviewEngine.js';
import { buildModerationItem, recordModerationAction, sortModerationQueue } from './moderationQueue.js';
import { DECISION_BANDS, REVIEW_VERSION, SCORING_VERSION, VERIFICATION_VERSION, compact, parseIsoDate } from './reviewUtils.js';

const MAX_BULK_ACTION_ITEMS = 25;

const dataOrThrow = (result, operation) => {
  if (result.error) {
    const error = new Error(`${operation} failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data;
};

const singleOrThrow = (result, operation, status = 404) => {
  const data = dataOrThrow(result, operation);
  if (!data) {
    const error = new Error(`${operation} not found.`);
    error.status = status;
    throw error;
  }
  return data;
};

const requireConfirmation = (value, message) => {
  if (value === true || value === 'true') return;
  const error = new Error(message);
  error.status = 400;
  throw error;
};

const statusError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const isDuplicateDbError = (error) => (
  error?.code === '23505' || /duplicate|unique/i.test(`${error?.message || ''} ${error?.details || ''}`)
);

const sanitizeServerHtml = (html = '') => String(html || '')
  .replace(/<\s*(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/<\s*(script|iframe|object|embed)\b[^>]*\/?>/gi, '')
  .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi, '');

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

export const draftSnapshotHash = (draft = {}) => crypto
  .createHash('sha256')
  .update(stableStringify({
    queue_item_id: draft.queue_item_id || null,
    generated_data: draft.generated_data || {},
    quality_scores: draft.quality_scores || {},
  }))
  .digest('hex');

const reviewIsCurrent = (draft, review) => {
  if (!review) return false;
  if (review.review_version !== REVIEW_VERSION) return false;
  if ((review.scoring_version || SCORING_VERSION) !== SCORING_VERSION) return false;
  if (!draft) return true;
  if (!review.draft_snapshot_hash) return false;
  return review.draft_snapshot_hash === draftSnapshotHash(draft);
};

const extractDateByEvent = (items = [], patterns = []) => {
  const match = (items || []).find((item) => {
    const event = String(item?.event || '').toLowerCase();
    return item?.date && patterns.some((pattern) => pattern.test(event));
  });
  return parseIsoDate(match?.date || '') || null;
};

const toJobPayload = async (supabase, draft, rawNotification = null, adminId = null) => {
  const data = draft.generated_data || {};
  const title = compact(data.title || 'AI Job Draft');
  const baseSlug = slugify(compact(data.slug || title), { lower: true, strict: true }) || `job-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (suffix <= 25) {
    const existing = await supabase
      .from('jobs')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing.error && !existing.data) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const importantDates = Array.isArray(data.important_dates) ? data.important_dates : [];
  const lastDate = parseIsoDate(data.last_date || '') ||
    extractDateByEvent(importantDates, [/last/, /closing/, /end date/, /submission/]);
  const startDate = parseIsoDate(data.application_start_date || '') ||
    extractDateByEvent(importantDates, [/start/, /opening/, /registration begins/]);
  const qualification = compact(data.qualification || data.eligibility?.education || '');

  return {
    title,
    slug,
    organization: compact(data.organization),
    category: compact(data.category || data.job_type || ''),
    job_type: compact(data.job_type || 'government'),
    location: compact(data.location || data.job_location),
    qualification,
    experience: compact(data.experience),
    salary: compact(data.salary),
    application_start_date: startDate,
    last_date: lastDate,
    official_website: compact(data.official_website),
    apply_link: compact(data.apply_link || data.application_link),
    notification_pdf: compact(data.notification_pdf),
    short_description: compact(data.short_description),
    full_description: sanitizeServerHtml(data.full_description || ''),
    eligibility: data.eligibility || null,
    selection_process: data.selection_process || null,
    important_dates: importantDates.length ? importantDates : null,
    application_fee: compact(data.application_fee),
    tags: data.tags || null,
    featured: false,
    status: 'draft',
    seo_title: compact(data.seo_title),
    seo_description: compact(data.seo_description),
    seo_keywords: compact(data.seo_keywords),
    canonical_url: compact(data.canonical_url),
    og_image: compact(data.og_image),
    ai_draft_id: draft.id,
    source_raw_notification_id: rawNotification?.id || data.raw_notification_id || data.phase2?.raw_notification_id || null,
    published_by: null,
    published_at: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    converted_by: adminId,
  };
};

const stripNonJobColumns = (payload = {}) => {
  const next = { ...payload };
  delete next.converted_by;
  return next;
};

const rawNotificationIdFromDraft = (draft = {}, queueItem = {}) => (
  draft.generated_data?.raw_notification_id ||
  draft.generated_data?.phase2?.raw_notification_id ||
  queueItem?.extracted_data?.raw_notification_id ||
  null
);

export class AdminReviewService {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('AdminReviewService requires a Supabase client.');
    this.supabase = supabase;
    this.reviewEngine = options.reviewEngine || new ReviewEngine(options);
  }

  async loadDraft(draftId) {
    const result = await this.supabase
      .from('ai_job_drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    return singleOrThrow(result, 'AI draft');
  }

  async loadQueueItem(queueItemId) {
    if (!queueItemId) return null;
    const result = await this.supabase
      .from('ai_research_queue')
      .select('*')
      .eq('id', queueItemId)
      .maybeSingle();
    return result.error ? null : result.data;
  }

  async loadRawNotification(draft, queueItem) {
    const rawId = rawNotificationIdFromDraft(draft, queueItem);
    if (rawId) {
      const byId = await this.supabase
        .from('raw_job_notifications')
        .select('*')
        .eq('id', rawId)
        .maybeSingle();
      if (!byId.error && byId.data) return byId.data;
    }

    if (!draft.queue_item_id) return null;
    const byQueue = await this.supabase
      .from('raw_job_notifications')
      .select('*')
      .eq('queue_item_id', draft.queue_item_id)
      .limit(1)
      .maybeSingle();
    return byQueue.error ? null : byQueue.data;
  }

  async loadJobForDraft(draftId) {
    if (!draftId) return null;
    const result = await this.supabase
      .from('jobs')
      .select('*')
      .eq('ai_draft_id', draftId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return result.error ? null : result.data;
  }

  async loadSource(queueItem, rawNotification) {
    const sourceId = queueItem?.source_id || rawNotification?.source_id || null;
    if (!sourceId) return null;
    const result = await this.supabase
      .from('ai_job_sources')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();
    return result.error ? null : result.data;
  }

  async loadDuplicateLogs(draft) {
    const byDraft = await this.supabase
      .from('ai_duplicate_log')
      .select('*')
      .eq('draft_id', draft.id)
      .order('created_at', { ascending: false })
      .limit(25);
    if (!byDraft.error && byDraft.data?.length) return byDraft.data;

    if (!draft.queue_item_id) return [];
    const byQueue = await this.supabase
      .from('ai_duplicate_log')
      .select('*')
      .eq('queue_item_id', draft.queue_item_id)
      .order('created_at', { ascending: false })
      .limit(25);
    return byQueue.error ? [] : (byQueue.data || []);
  }

  async loadContext(draftId) {
    const draft = await this.loadDraft(draftId);
    const queueItem = await this.loadQueueItem(draft.queue_item_id);
    const rawNotification = await this.loadRawNotification(draft, queueItem);
    const source = await this.loadSource(queueItem, rawNotification);
    const duplicateLogs = await this.loadDuplicateLogs(draft);
    return { draft, queueItem, rawNotification, source, duplicateLogs };
  }

  async latestReview(draftOrId) {
    const draft = typeof draftOrId === 'object' ? draftOrId : null;
    const draftId = draft?.id || draftOrId;
    const result = await this.supabase
      .from('ai_review_results')
      .select('*')
      .eq('draft_id', draftId)
      .eq('is_stale', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error || !result.data) return null;
    if (!reviewIsCurrent(draft, result.data)) {
      await this.supabase
        .from('ai_review_results')
        .update({ is_stale: true, updated_at: new Date().toISOString() })
        .eq('id', result.data.id);
      return null;
    }
    return result.data;
  }

  async latestVerification(draftId) {
    const result = await this.supabase
      .from('ai_fact_verifications')
      .select('*')
      .eq('draft_id', draftId)
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return result.error ? null : result.data;
  }

  async runReview(draftId, { adminId = null } = {}) {
    const context = await this.loadContext(draftId);
    const review = this.reviewEngine.review(context);

    await this.supabase
      .from('ai_review_results')
      .update({ is_stale: true, updated_at: new Date().toISOString() })
      .eq('draft_id', draftId)
      .eq('is_stale', false);

    const verificationPayload = {
      draft_id: context.draft.id,
      queue_item_id: context.draft.queue_item_id,
      raw_notification_id: context.rawNotification?.id || null,
      verification_score: review.verification.verificationScore,
      source_confidence: review.verification.sourceConfidence,
      field_results: review.verification.fieldResults,
      blocking_issues: review.verification.blockingIssues,
      warnings: review.verification.warnings,
      verification_version: VERIFICATION_VERSION,
      verified_at: review.verification.verifiedAt,
    };

    const verificationRow = dataOrThrow(
      await this.supabase.from('ai_fact_verifications').insert([verificationPayload]).select().maybeSingle(),
      'Insert fact verification',
    );

    const reviewPayload = {
      draft_id: context.draft.id,
      queue_item_id: context.draft.queue_item_id,
      raw_notification_id: context.rawNotification?.id || null,
      publish_readiness: review.publishReadiness,
      confidence: review.confidence,
      decision_band: review.decisionBand,
      subscores: review.subscores,
      warnings: review.warnings,
      recommendations: review.recommendations,
      category_suggestion: review.categorySuggestion,
      tag_suggestion: review.tagSuggestion,
      review_version: REVIEW_VERSION,
      scoring_version: SCORING_VERSION,
      draft_snapshot_hash: draftSnapshotHash(context.draft),
      is_stale: false,
    };

    const reviewRow = dataOrThrow(
      await this.supabase.from('ai_review_results').insert([reviewPayload]).select().maybeSingle(),
      'Insert review result',
    );

    await this.supabase
      .from('ai_job_drafts')
      .update({
        readiness_score: review.publishReadiness,
        confidence_score: review.confidence,
        latest_review_id: reviewRow.id,
        latest_verification_id: verificationRow.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.draft.id);

    await recordModerationAction(this.supabase, {
      draftId: context.draft.id,
      adminId,
      action: 'run_review',
      beforeState: { latest_review_id: context.draft.latest_review_id || null },
      afterState: { latest_review_id: reviewRow.id, latest_verification_id: verificationRow.id },
      metadata: { decisionBand: review.decisionBand, publishReadiness: review.publishReadiness },
    });

    return {
      draft: context.draft,
      review: reviewRow,
      verification: verificationRow,
      decision: review,
    };
  }

  async getReviewItem(draftId) {
    const context = await this.loadContext(draftId);
    const review = await this.latestReview(context.draft);
    const verification = await this.latestVerification(draftId);
    const actions = await this.supabase
      .from('ai_moderation_actions')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      ...context,
      review,
      verification,
      actions: actions.error ? [] : (actions.data || []),
    };
  }

  async getReviewQueue({ limit = 50, decisionBand = null } = {}) {
    let query = this.supabase
      .from('ai_job_drafts')
      .select('*')
      .order('readiness_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 100));

    const drafts = dataOrThrow(await query, 'Load review queue') || [];

    const items = [];
    for (const draft of drafts) {
      const review = await this.latestReview(draft);
      const verification = await this.latestVerification(draft.id);
      const currentReview = review && reviewIsCurrent(draft, review) ? review : null;
      if (decisionBand && currentReview?.decision_band !== decisionBand) continue;
      items.push(buildModerationItem({
        draft,
        review: currentReview ? {
          publishReadiness: currentReview.publish_readiness,
          confidence: currentReview.confidence,
          decisionBand: currentReview.decision_band,
          duplicateRisk: currentReview.subscores ? 100 - Number(currentReview.subscores.duplicateSafety ?? 100) : draft.quality_scores?.duplicateRisk,
          warnings: currentReview.warnings || [],
          subscores: currentReview.subscores || {},
        } : {},
        verification: verification ? {
          warnings: verification.warnings || [],
          blockingIssues: verification.blocking_issues || [],
        } : {},
      }));
    }

    return {
      items: sortModerationQueue(items),
      count: items.length,
    };
  }

  async setDraftStatus(draftId, status, { adminId = null, reasonCode = null, notes = null, metadata = {} } = {}) {
    const allowed = new Set(['approved', 'rejected', 'needs_revision']);
    if (!allowed.has(status)) throw statusError(`Unsupported draft status: ${status}`);

    const before = await this.loadDraft(draftId);
    if (status === 'approved') {
      let review = await this.latestReview(before);
      if (!review) {
        review = (await this.runReview(draftId, { adminId })).review;
      }
      if (review.decision_band === DECISION_BANDS.blocked) {
        throw statusError('Blocked drafts cannot be approved.');
      }
    }

    const result = await this.supabase
      .from('ai_job_drafts')
      .update({ status, admin_notes: notes || before.admin_notes || null, updated_at: new Date().toISOString() })
      .eq('id', draftId)
      .select()
      .maybeSingle();
    const after = singleOrThrow(result, 'Update AI draft status');

    await recordModerationAction(this.supabase, {
      draftId,
      adminId,
      action: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'needs_revision',
      reasonCode,
      notes,
      beforeState: before,
      afterState: after,
      metadata,
    });

    return after;
  }

  async bulkSetDraftStatus(draftIds = [], status, { adminId = null, confirm = false, reasonCode = null, notes = null } = {}) {
    requireConfirmation(confirm, 'Bulk moderation actions require confirm=true.');
    const ids = [...new Set((draftIds || []).map((id) => compact(id)).filter(Boolean))];
    if (!ids.length) throw statusError('At least one draft id is required.');
    if (ids.length > MAX_BULK_ACTION_ITEMS) throw statusError(`Bulk actions are capped at ${MAX_BULK_ACTION_ITEMS} items.`);

    const results = [];
    if (status === 'approved') {
      for (const draftId of ids) {
        const draft = await this.loadDraft(draftId);
        let review = await this.latestReview(draft);
        if (!review) review = (await this.runReview(draftId, { adminId })).review;
        if (review.decision_band === DECISION_BANDS.blocked) {
          throw statusError(`Bulk approve blocked: draft ${draftId} is blocked.`);
        }
      }
    }

    for (const draftId of ids) {
      results.push(await this.setDraftStatus(draftId, status, {
        adminId,
        reasonCode,
        notes,
        metadata: { bulk: true, bulkSize: ids.length },
      }));
    }

    await recordModerationAction(this.supabase, {
      adminId,
      action: status === 'approved' ? 'bulk_approve' : 'bulk_reject',
      reasonCode,
      notes,
      beforeState: { draftIds: ids },
      afterState: { targetStatus: status, count: results.length },
      metadata: { bulkSize: ids.length },
    });

    return { count: results.length, results };
  }

  async convertToJobDraft(draftId, {
    adminId = null,
    overrideBlocker = false,
    reasonCode = null,
    notes = null,
  } = {}) {
    let context = await this.loadContext(draftId);
    if (context.draft.published_job_id || context.draft.status === 'published') {
      throw statusError('AI draft has already been converted to a job draft.');
    }

    const orphanedJob = await this.loadJobForDraft(draftId);
    if (orphanedJob) {
      const afterDraft = singleOrThrow(
        await this.supabase
          .from('ai_job_drafts')
          .update({
            status: 'published',
            published_job_id: orphanedJob.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId)
          .select()
          .maybeSingle(),
        'Recover AI draft after conversion',
        500,
      );

      await recordModerationAction(this.supabase, {
        draftId,
        jobId: orphanedJob.id,
        adminId,
        action: 'convert_to_draft',
        reasonCode,
        notes,
        beforeState: context.draft,
        afterState: { draft: afterDraft, job: orphanedJob },
        metadata: { recovered: true, reason: 'existing_job_for_ai_draft' },
      });

      return { job: orphanedJob, draft: afterDraft, review: null, verification: null, recovered: true };
    }

    let review = await this.latestReview(context.draft);
    let verification = await this.latestVerification(draftId);

    if (!review || !verification) {
      const generated = await this.runReview(draftId, { adminId });
      review = generated.review;
      verification = generated.verification;
      context = await this.loadContext(draftId);
    }

    if (review.decision_band === DECISION_BANDS.blocked && !overrideBlocker) {
      throw statusError('Blocked drafts require an explicit override before conversion.');
    }

    if (review.decision_band === DECISION_BANDS.blocked && overrideBlocker) {
      await recordModerationAction(this.supabase, {
        draftId,
        adminId,
        action: 'override_blocker',
        reasonCode,
        notes,
        beforeState: { review, verification },
        afterState: { overrideBlocker: true },
        metadata: { decisionBand: review.decision_band },
      });
    }

    const before = context.draft;
    const jobPayload = stripNonJobColumns(await toJobPayload(this.supabase, context.draft, context.rawNotification, adminId));
    const insertResult = await this.supabase.from('jobs').insert([jobPayload]).select().maybeSingle();
    let job = null;
    if (insertResult.error && isDuplicateDbError(insertResult.error)) {
      job = await this.loadJobForDraft(draftId);
    } else {
      job = singleOrThrow(insertResult, 'Create job draft', 500);
    }

    if (!job) {
      job = singleOrThrow(insertResult, 'Create job draft', 500);
    }

    const afterDraft = singleOrThrow(
      await this.supabase
        .from('ai_job_drafts')
        .update({
          status: 'published',
          published_job_id: job.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .maybeSingle(),
      'Update AI draft after conversion',
      500,
    );

    await recordModerationAction(this.supabase, {
      draftId,
      jobId: job.id,
      adminId,
      action: 'convert_to_draft',
      reasonCode,
      notes,
      beforeState: before,
      afterState: { draft: afterDraft, job },
      metadata: { decisionBand: review.decision_band, jobStatus: job.status },
    });

    return { job, draft: afterDraft, review, verification };
  }

  async publishJob(jobId, {
    adminId = null,
    confirm = false,
    overrideBlocker = false,
    reasonCode = null,
    notes = null,
  } = {}) {
    requireConfirmation(confirm, 'Publishing requires confirm=true.');

    const before = singleOrThrow(
      await this.supabase.from('jobs').select('*').eq('id', jobId).maybeSingle(),
      'Job',
    );

    const gate = validateJobQualityGate(scoreJob(before));
    if (!gate.ok) {
      throw statusError(`Publish quality gate blocked job: ${gate.failures.join(' ')}`);
    }

    let latestReview = null;
    if (before.ai_draft_id) {
      const sourceDraft = await this.loadDraft(before.ai_draft_id);
      latestReview = await this.latestReview(sourceDraft);
      if (latestReview?.decision_band === DECISION_BANDS.blocked && !overrideBlocker) {
        throw statusError('Publishing is blocked by the latest Phase 3 review.');
      }
    }

    if (latestReview?.decision_band === DECISION_BANDS.blocked && overrideBlocker) {
      await recordModerationAction(this.supabase, {
        draftId: before.ai_draft_id,
        jobId,
        adminId,
        action: 'override_blocker',
        reasonCode,
        notes,
        beforeState: { review: latestReview },
        afterState: { overrideBlocker: true },
        metadata: { target: 'publish' },
      });
    }

    const after = singleOrThrow(
      await this.supabase
        .from('jobs')
        .update({
          status: 'published',
          published_by: adminId,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .maybeSingle(),
      'Publish job',
      500,
    );

    await recordModerationAction(this.supabase, {
      draftId: before.ai_draft_id || null,
      jobId,
      adminId,
      action: 'publish',
      reasonCode,
      notes,
      beforeState: before,
      afterState: after,
      metadata: { confirmed: true },
    });

    return after;
  }
}

export { MAX_BULK_ACTION_ITEMS };

export default AdminReviewService;
