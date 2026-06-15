import NotificationExtractor from './notificationExtractor.js';
import { generateDraft } from './draftGenerator.js';
import DuplicateAnalyzer from './duplicateAnalyzer.js';
import { runQualityGate } from './qualityGate.js';
import { verifyUrls } from './linkVerifier.js';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const dataOrThrow = (result, operation) => {
  if (result.error) {
    const error = new Error(`${operation} failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data || [];
};

const singleOrThrow = (result, operation) => {
  if (result.error) {
    const error = new Error(`${operation} failed: ${result.error.message}`);
    error.cause = result.error;
    throw error;
  }
  return result.data || null;
};

const isDuplicateDbError = (error) => (
  error?.code === '23505' || /duplicate|unique/i.test(`${error?.message || ''} ${error?.details || ''}`)
);

const serializeError = (error) => ({
  message: error?.message || String(error || 'Unknown error'),
  code: error?.code || error?.cause?.code || null,
  errorType: error?.errorType || null,
  validation: error?.validation || null,
  attempts: Array.isArray(error?.attempts) ? error.attempts.map((attempt) => ({
    providerName: attempt.providerName || attempt.provider?.provider_name || 'unknown',
    ok: Boolean(attempt.ok),
    errorType: attempt.errorType || null,
    durationMs: attempt.durationMs || 0,
  })) : [],
});

const sanitizeProviderAttempts = (attempts = []) => (
  (Array.isArray(attempts) ? attempts : []).map((attempt) => ({
    providerId: attempt.providerId || attempt.provider?.id || null,
    providerName: attempt.providerName || attempt.provider?.provider_name || 'unknown',
    model: attempt.model || null,
    ok: Boolean(attempt.ok),
    durationMs: Number(attempt.durationMs || 0),
    tokensUsed: Number(attempt.tokensUsed || 0),
    errorType: attempt.errorType || null,
    error: attempt.error || null,
  }))
);

const calculateBackoffDelay = (retryCount, baseDelayMs = 15_000, maxDelayMs = 300_000) => {
  const exponent = Math.min(retryCount, 6);
  const rawDelay = baseDelayMs * Math.pow(2, exponent);
  const jitter = (Math.random() * 0.4 - 0.2) * rawDelay; // +/- 20% jitter
  return Math.min(Math.round(rawDelay + jitter), maxDelayMs);
};

export default class QueueWorker {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('QueueWorker requires a Supabase client.');
    this.supabase = supabase;
    this.logger = options.logger || noopLogger;
    this.extractor = options.extractor || new NotificationExtractor({
      providerSelector: options.providerSelector,
    });
    this.duplicateAnalyzer = options.duplicateAnalyzer || new DuplicateAnalyzer(supabase);
    this.generateDraft = options.generateDraft || generateDraft;
    this.qualityGate = options.qualityGate || runQualityGate;
    this.maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 1;
  }

  async loadPending(limit = 5) {
    const now = new Date().toISOString();
    const result = await this.supabase
      .from('ai_research_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`extracted_data->>run_after.is.null,extracted_data->>run_after.lte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);
    return dataOrThrow(result, 'Load pending AI queue');
  }

  async loadItem(id) {
    const result = await this.supabase
      .from('ai_research_queue')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return singleOrThrow(result, 'Load AI queue item');
  }

  async loadRawNotification(queueItem = {}) {
    const rawId = queueItem.extracted_data?.raw_notification_id;
    let query = this.supabase
      .from('raw_job_notifications')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (rawId) {
      query = this.supabase
        .from('raw_job_notifications')
        .select('*')
        .eq('id', rawId)
        .maybeSingle();
    } else {
      query = this.supabase
        .from('raw_job_notifications')
        .select('*')
        .eq('queue_item_id', queueItem.id)
        .limit(1)
        .maybeSingle();
    }

    const result = await query;
    if (result.error) {
      this.logger.warn?.(`Unable to load raw notification: ${result.error.message}`);
      return null;
    }
    return result.data || null;
  }

  async loadDraftForQueue(queueItemId) {
    if (!queueItemId) return null;
    const result = await this.supabase
      .from('ai_job_drafts')
      .select('*')
      .eq('queue_item_id', queueItemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      this.logger.warn?.(`Unable to load existing AI draft for queue item: ${result.error.message}`);
      return null;
    }
    return result.data || null;
  }

  async updateQueue(id, patch) {
    const result = await this.supabase
      .from('ai_research_queue')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    return singleOrThrow(result, 'Update AI queue item');
  }

  async recoverExistingDraft(queueItem, rawNotification = null, existingDraft = null) {
    const draft = existingDraft || await this.loadDraftForQueue(queueItem.id);
    if (!draft) return null;

    const qualityScores = draft.quality_scores || {};
    const queueStatus = qualityScores.queueStatus || (draft.status === 'rejected' ? 'rejected' : 'drafted');
    await this.updateQueue(queueItem.id, {
      status: queueStatus,
      extracted_data: {
        ...(queueItem.extracted_data || {}),
        phase2_draft_id: draft.id,
        phase2_quality: qualityScores,
        phase2_recovered_at: new Date().toISOString(),
      },
      notes: 'Recovered existing Phase 2 draft after interrupted worker run.',
    });
    await this.markRawProcessed(rawNotification, draft.id);

    return {
      id: queueItem.id,
      status: queueStatus,
      draft_id: draft.id,
      draft_status: draft.status,
      finalScore: qualityScores.finalScore || qualityScores.overall || null,
      duplicateRisk: qualityScores.duplicateRisk || 0,
      provider: draft.ai_provider || 'unknown',
      recovered: true,
    };
  }

  async recoverStaleProcessing({ olderThanMinutes = 30, limit = 100 } = {}) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
    const result = await this.supabase
      .from('ai_research_queue')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', cutoff)
      .limit(limit);

    const staleItems = dataOrThrow(result, 'Load stale processing AI queue items');
    const recovered = [];

    for (const item of staleItems) {
      const rawNotification = await this.loadRawNotification(item);
      const existingDraft = await this.loadDraftForQueue(item.id);
      if (existingDraft) {
        recovered.push(await this.recoverExistingDraft(item, rawNotification, existingDraft));
        continue;
      }

      const previousRecoveries = Number(item.extracted_data?.phase2_recovery_count || 0);
      const recoveryCount = previousRecoveries + 1;
      const exhausted = recoveryCount > (this.maxRetries + 1);
      const serialized = {
        message: `Recovered stale processing item after ${olderThanMinutes} minute worker timeout.`,
        code: 'STALE_PROCESSING_RECOVERY',
        errorType: exhausted ? 'stale_processing_exhausted' : 'stale_processing_recovered',
        validation: null,
        attempts: [],
      };

      await this.updateQueue(item.id, {
        status: exhausted ? 'rejected' : 'pending',
        extracted_data: {
          ...(item.extracted_data || {}),
          phase2_recovery_count: recoveryCount,
          phase2_last_error: serialized,
          phase2_recovered_at: new Date().toISOString(),
        },
        notes: exhausted
          ? `Phase 2 stale processing recovery exhausted after ${recoveryCount} recovery attempt(s).`
          : 'Phase 2 stale processing item returned to pending for retry.',
      });

      if (exhausted) {
        await this.markRawFailed(rawNotification, serialized, recoveryCount);
      }

      recovered.push({
        id: item.id,
        status: exhausted ? 'rejected' : 'pending',
        recovered: true,
        recoveryCount,
      });
    }

    return recovered;
  }

  async saveDraft({ queueItem, rawNotification, extractionResult, draft, qualityScores }) {
    const existingDraft = await this.loadDraftForQueue(queueItem.id);
    if (existingDraft) return existingDraft;

    const payload = {
      queue_item_id: queueItem.id,
      job_type: queueItem.job_type || draft.job_type || 'government',
      ai_provider: extractionResult.provider || 'unknown',
      prompt_id: null,
      generated_data: {
        ...draft,
        phase2: {
          extraction_model: extractionResult.model || '',
          provider_attempts: sanitizeProviderAttempts(extractionResult.attempts),
          raw_notification_id: rawNotification?.id || null,
        },
      },
      quality_scores: qualityScores,
      status: qualityScores.status,
      tokens_used: Number(extractionResult.tokensUsed || 0),
      generation_ms: Number(extractionResult.durationMs || 0),
    };

    const result = await this.supabase
      .from('ai_job_drafts')
      .insert([payload])
      .select()
      .maybeSingle();

    if (result.error && isDuplicateDbError(result.error)) {
      const recovered = await this.loadDraftForQueue(queueItem.id);
      if (recovered) return recovered;
    }

    return singleOrThrow(result, 'Insert AI job draft');
  }

  async markRawProcessed(rawNotification, draftId) {
    if (!rawNotification?.id) return;
    await this.supabase
      .from('raw_job_notifications')
      .update({
        status: 'processed',
        metadata: {
          ...(rawNotification.metadata || {}),
          phase2_draft_id: draftId,
          processed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawNotification.id);
  }

  async markRawFailed(rawNotification, serialized, retries) {
    if (!rawNotification?.id) return;
    await this.supabase
      .from('raw_job_notifications')
      .update({
        status: 'failed',
        metadata: {
          ...(rawNotification.metadata || {}),
          phase2_failed_at: new Date().toISOString(),
          phase2_retries: retries,
          phase2_last_error: serialized,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawNotification.id);
  }

  async handleFailure(queueItem, error, rawNotification = null) {
    const previous = queueItem.extracted_data?.phase2_retries || 0;
    const retries = previous + 1;
    const finalFailure = retries > this.maxRetries;
    const serialized = serializeError(error);
    const delayMs = calculateBackoffDelay(retries);
    const runAfter = new Date(Date.now() + delayMs).toISOString();

    await this.updateQueue(queueItem.id, {
      status: finalFailure ? 'rejected' : 'pending',
      extracted_data: {
        ...(queueItem.extracted_data || {}),
        phase2_retries: retries,
        phase2_last_error: serialized,
        run_after: finalFailure ? null : runAfter,
      },
      notes: finalFailure
        ? `Phase 2 failed after ${retries} attempt(s): ${serialized.message}`
        : `Phase 2 retry scheduled (running after ${runAfter}): ${serialized.message}`,
    });

    if (finalFailure) {
      await this.markRawFailed(rawNotification, serialized, retries);
    }

    return {
      id: queueItem.id,
      status: finalFailure ? 'rejected' : 'retry_scheduled',
      error: serialized,
    };
  }

  async processItem(id, options = {}) {
    const queueItem = typeof id === 'object' ? id : await this.loadItem(id);
    if (!queueItem) {
      const error = new Error('AI queue item not found.');
      error.status = 404;
      throw error;
    }

    if (!options.force && queueItem.status !== 'pending') {
      return {
        id: queueItem.id,
        status: 'skipped',
        reason: `Queue item status is ${queueItem.status}.`,
      };
    }

    const existingDraft = await this.loadDraftForQueue(queueItem.id);
    if (existingDraft && !options.forceRegenerate) {
      const rawNotification = await this.loadRawNotification(queueItem);
      return this.recoverExistingDraft(queueItem, rawNotification, existingDraft);
    }

    // Optimistic locking: only claim if still pending (prevents race conditions)
    const claimed = await this.supabase
      .from('ai_research_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', queueItem.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (!claimed.data) {
      // Another worker already claimed this item
      return {
        id: queueItem.id,
        status: 'skipped',
        reason: 'Queue item was claimed by another worker.',
      };
    }

    const activeQueueItem = claimed.data;

    let rawNotification = null;

    try {
      rawNotification = await this.loadRawNotification(activeQueueItem);
      const extractionResult = await this.extractor.extract({
        supabase: this.supabase,
        queueItem: activeQueueItem,
        rawNotification: rawNotification || {},
        adminId: options.adminId || null,
        signal: options.signal,
      });

      const draft = this.generateDraft({
        extraction: extractionResult.extraction,
        queueItem: activeQueueItem,
        rawNotification: rawNotification || {},
        siteUrl: options.siteUrl,
      });

      const duplicateAnalysis = await this.duplicateAnalyzer.analyze(draft, {
        rawNotificationId: rawNotification?.id || null,
      });

      // Verify URLs asynchronously
      const linkVerification = await verifyUrls({
        notification_pdf: draft.notification_pdf,
        official_website: draft.official_website,
        application_link: draft.application_link,
      }, options.linkTimeoutMs || 5000).catch((err) => {
        this.logger.warn?.(`Link verification failed: ${err.message}`);
        return {};
      });

      const qualityScores = this.qualityGate({
        extraction: extractionResult.extraction,
        draft,
        duplicateAnalysis,
        linkVerification,
      });

      const savedDraft = await this.saveDraft({
        queueItem: activeQueueItem,
        rawNotification,
        extractionResult,
        draft,
        qualityScores,
      });

      await this.duplicateAnalyzer.recordLogs({
        queueItemId: activeQueueItem.id,
        draftId: savedDraft.id,
        analysis: duplicateAnalysis,
      });

      await this.updateQueue(activeQueueItem.id, {
        status: qualityScores.queueStatus,
        extracted_data: {
          ...(activeQueueItem.extracted_data || {}),
          phase2_extraction: extractionResult.extraction,
          phase2_draft_id: savedDraft.id,
          phase2_quality: qualityScores,
        },
        duplicate_check: {
          risk_score: duplicateAnalysis.duplicateRisk,
          matched_jobs: duplicateAnalysis.evidence,
        },
        notes: qualityScores.issues?.length
          ? qualityScores.issues.join(' ')
          : 'Phase 2 AI draft generated successfully.',
      });

      await this.markRawProcessed(rawNotification, savedDraft.id);

      return {
        id: activeQueueItem.id,
        status: qualityScores.queueStatus,
        draft_id: savedDraft.id,
        draft_status: savedDraft.status,
        finalScore: qualityScores.finalScore,
        duplicateRisk: duplicateAnalysis.duplicateRisk,
        provider: extractionResult.provider,
      };
    } catch (error) {
      this.logger.error?.(`Phase 2 queue item failed: ${error.message}`);
      return this.handleFailure({
        ...activeQueueItem,
        extracted_data: activeQueueItem.extracted_data || {},
      }, error, rawNotification);
    }
  }

  async processQueue(options = {}) {
    const limit = Number.isInteger(options.limit) ? options.limit : 5;
    const recovered = options.recoverStaleProcessing === false || options.itemIds?.length
      ? []
      : await this.recoverStaleProcessing({
        olderThanMinutes: options.staleProcessingMinutes || 30,
        limit,
      });
    const items = options.itemIds?.length
      ? await Promise.all(options.itemIds.map((id) => this.loadItem(id)))
      : await this.loadPending(limit);

    const results = [];
    for (const item of items.filter(Boolean)) {
      results.push(await this.processItem(item, options));
    }

    return {
      status: results.some((result) => result.status === 'retry_scheduled' || result.status === 'rejected')
        ? 'partial'
        : 'success',
      recovered: recovered.length,
      processed: results.length,
      results,
    };
  }

  async getStatus() {
    // Use individual count queries instead of fetching all rows
    // This is O(1) per status instead of O(N) for the entire table
    const countByStatus = async (table, statusValues) => {
      const counts = {};
      for (const status of statusValues) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        if (!error) counts[status] = count || 0;
      }
      return counts;
    };

    const [queueCounts, draftCounts, failures] = await Promise.all([
      countByStatus('ai_research_queue', ['pending', 'processing', 'drafted', 'rejected']),
      countByStatus('ai_job_drafts', ['pending_review', 'approved', 'rejected', 'published']),
      this.supabase.from('ai_provider_failures').select('id', { count: 'exact', head: true }),
    ]);

    return {
      queue: queueCounts,
      drafts: draftCounts,
      providerFailures: failures.count || 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
