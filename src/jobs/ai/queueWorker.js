import NotificationExtractor from './notificationExtractor.js';
import { generateDraft } from './draftGenerator.js';
import DuplicateAnalyzer from './duplicateAnalyzer.js';
import { runQualityGate } from './qualityGate.js';

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
    const result = await this.supabase
      .from('ai_research_queue')
      .select('*')
      .eq('status', 'pending')
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

  async saveDraft({ queueItem, rawNotification, extractionResult, draft, qualityScores }) {
    const payload = {
      queue_item_id: queueItem.id,
      job_type: queueItem.job_type || draft.job_type || 'government',
      ai_provider: extractionResult.provider || 'unknown',
      prompt_id: null,
      generated_data: {
        ...draft,
        phase2: {
          extraction_model: extractionResult.model || '',
          provider_attempts: extractionResult.attempts || [],
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

  async handleFailure(queueItem, error) {
    const previous = queueItem.extracted_data?.phase2_retries || 0;
    const retries = previous + 1;
    const finalFailure = retries > this.maxRetries;
    const serialized = serializeError(error);

    await this.updateQueue(queueItem.id, {
      status: finalFailure ? 'rejected' : 'pending',
      extracted_data: {
        ...(queueItem.extracted_data || {}),
        phase2_retries: retries,
        phase2_last_error: serialized,
      },
      notes: finalFailure
        ? `Phase 2 failed after ${retries} attempt(s): ${serialized.message}`
        : `Phase 2 retry scheduled: ${serialized.message}`,
    });

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

    await this.updateQueue(queueItem.id, { status: 'processing' });
    const activeQueueItem = {
      ...queueItem,
      status: 'processing',
    };

    try {
      const rawNotification = await this.loadRawNotification(activeQueueItem);
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
      const qualityScores = this.qualityGate({
        extraction: extractionResult.extraction,
        draft,
        duplicateAnalysis,
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
      }, error);
    }
  }

  async processQueue(options = {}) {
    const limit = Number.isInteger(options.limit) ? options.limit : 5;
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
      processed: results.length,
      results,
    };
  }

  async getStatus() {
    const [queue, drafts, failures] = await Promise.all([
      this.supabase.from('ai_research_queue').select('status', { count: 'exact', head: false }),
      this.supabase.from('ai_job_drafts').select('status', { count: 'exact', head: false }),
      this.supabase.from('ai_provider_failures').select('id', { count: 'exact', head: true }),
    ]);

    const queueCounts = {};
    (queue.data || []).forEach((item) => {
      queueCounts[item.status] = (queueCounts[item.status] || 0) + 1;
    });
    const draftCounts = {};
    (drafts.data || []).forEach((item) => {
      draftCounts[item.status] = (draftCounts[item.status] || 0) + 1;
    });

    return {
      queue: queueCounts,
      drafts: draftCounts,
      providerFailures: failures.count || 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
