import DuplicateDetector, { isDuplicateDbError, buildContentHash } from './duplicateDetector.js';
import FetchHealthService from './fetchHealthService.js';
import { getFetcherForSource } from './fetchers/fetcherRegistry.js';
import { cleanWhitespace, normalizeUrl } from './normalizeNotification.js';

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const MAX_QUEUE_INPUT_CHARS = 120_000;

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

const serializeError = (error, context = {}) => ({
  message: error?.message || String(error || 'Unknown error'),
  code: error?.code || error?.cause?.code || null,
  details: error?.details || error?.cause?.details || null,
  context,
});

const statusFromErrors = (saved, errors) => {
  if (errors.length === 0) return 'success';
  return saved > 0 ? 'partial' : 'failed';
};

const sourceJobType = (source = {}) => {
  const haystack = `${source.category || ''} ${source.name || ''}`.toLowerCase();
  if (haystack.includes('bank') || haystack.includes('ibps') || haystack.includes('sbi')) return 'bank';
  if (haystack.includes('railway') || haystack.includes('rrb')) return 'railway';
  if (haystack.includes('it') || haystack.includes('software')) return 'it';
  if (haystack.includes('remote')) return 'remote';
  if (haystack.includes('private')) return 'private';
  return source.category || 'government';
};

const buildRawInput = (notification = {}) => {
  const parts = [
    `Title: ${notification.title || ''}`,
    `Organization: ${notification.organization || ''}`,
    `Notification URL: ${notification.notification_url || ''}`,
    `PDF URL: ${notification.pdf_url || ''}`,
    `Published Date: ${notification.published_date || ''}`,
    `Last Date: ${notification.last_date || ''}`,
    '',
    notification.raw_content || '',
  ];
  return cleanWhitespace(parts.join('\n')).slice(0, MAX_QUEUE_INPUT_CHARS);
};

export default class JobFetchService {
  constructor(options = {}) {
    if (!options.supabase) {
      throw new Error('JobFetchService requires a Supabase client.');
    }

    this.supabase = options.supabase;
    this.logger = options.logger || noopLogger;
    this.fetcherFactory = options.fetcherFactory || getFetcherForSource;
    this.duplicateDetector = options.duplicateDetector || new DuplicateDetector(this.supabase, {
      logger: this.logger,
    });
    this.healthService = options.healthService || new FetchHealthService(this.supabase, {
      logger: this.logger,
    });
    this.fetcherOptions = options.fetcherOptions || {};
  }

  async loadActiveSources() {
    const result = await this.supabase
      .from('ai_job_sources')
      .select('*')
      .eq('is_active', true)
      .order('tier')
      .order('name');
    return dataOrThrow(result, 'Load active sources');
  }

  async loadSource(sourceId) {
    const result = await this.supabase
      .from('ai_job_sources')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();
    return singleOrThrow(result, 'Load source');
  }

  async loadSourcesByIds(sourceIds = []) {
    if (!sourceIds.length) return [];
    const result = await this.supabase
      .from('ai_job_sources')
      .select('*')
      .in('id', sourceIds)
      .order('tier')
      .order('name');
    return dataOrThrow(result, 'Load selected sources');
  }

  async hasRecentRunningFetch(windowMinutes = 30) {
    const startedAfter = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const result = await this.supabase
      .from('job_fetch_logs')
      .select('id,source_id,started_at')
      .eq('status', 'running')
      .gte('started_at', startedAfter)
      .limit(1);

    if (result.error) {
      this.logger.warn?.(`Unable to check running fetch logs: ${result.error.message}`);
      return false;
    }

    return (result.data || []).length > 0;
  }

  async runAll(options = {}) {
    const startedAt = Date.now();
    const sources = options.sourceIds?.length
      ? await this.loadSourcesByIds(options.sourceIds)
      : await this.loadActiveSources();

    const selectedSources = Number.isInteger(options.maxSources)
      ? sources.slice(0, options.maxSources)
      : sources;

    const results = [];
    for (const source of selectedSources) {
      results.push(await this.processSource(source));
    }

    const totals = results.reduce((summary, result) => ({
      sources: summary.sources + 1,
      items_found: summary.items_found + (result.items_found || 0),
      items_saved: summary.items_saved + (result.items_saved || 0),
      duplicates: summary.duplicates + (result.duplicates || 0),
      failures: summary.failures + (result.status === 'failed' ? 1 : 0),
      skipped: summary.skipped + (result.status === 'skipped' ? 1 : 0),
    }), {
      sources: 0,
      items_found: 0,
      items_saved: 0,
      duplicates: 0,
      failures: 0,
      skipped: 0,
    });

    return {
      status: totals.failures > 0 ? 'partial' : 'success',
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      totals,
      results,
    };
  }

  async runSource(sourceId) {
    const source = await this.loadSource(sourceId);
    if (!source) {
      const error = new Error('Source not found.');
      error.status = 404;
      throw error;
    }
    return this.processSource(source);
  }

  async processSource(source) {
    const runStartedAt = Date.now();
    const log = await this.startLog(source);
    const errors = [];
    let notifications = [];
    let saved = 0;
    let duplicates = 0;

    const finish = async (status, extra = {}) => {
      const durationMs = Date.now() - runStartedAt;
      const result = {
        source_id: source.id,
        source_name: source.name,
        log_id: log?.id || null,
        status,
        items_found: notifications.length,
        items_saved: saved,
        duplicates,
        errors,
        duration_ms: durationMs,
        ...extra,
      };

      await this.updateLog(log?.id, {
        status,
        completed_at: new Date().toISOString(),
        items_found: notifications.length,
        items_saved: saved,
        errors,
        duration_ms: durationMs,
      });
      await this.updateSourceStats(source, notifications.length);
      await this.healthService.recordSourceRun(source, result);
      return result;
    };

    const fetcher = this.fetcherFactory(source, {
      ...this.fetcherOptions,
      logger: this.logger,
    });

    if (!fetcher) {
      errors.push(serializeError(new Error('No Phase 1 fetcher is registered for this source.'), {
        source: source.name,
        url: source.url,
      }));
      return finish('skipped');
    }

    try {
      notifications = await fetcher.fetch(source);
      if (fetcher.errors?.length) {
        errors.push(...fetcher.errors);
      }
    } catch (error) {
      errors.push(serializeError(error, { source: source.name, url: source.url }));
      await this.recordFailure(source, source.url, error, { phase: 'sourceFetch' });
      return finish('failed');
    }

    for (const notification of notifications) {
      try {
        const duplicate = await this.duplicateDetector.check(notification);
        if (duplicate.isDuplicate) {
          duplicates += 1;
          await this.duplicateDetector.recordDuplicate({
            sourceId: source.id,
            notification,
            duplicate,
          });
          continue;
        }

        const savedResult = await this.saveNotification(source, notification, duplicate.hash);
        if (savedResult.saved) saved += 1;
      } catch (error) {
        if (isDuplicateDbError(error?.cause || error)) {
          duplicates += 1;
          await this.duplicateDetector.recordDuplicate({
            sourceId: source.id,
            notification,
            duplicate: {
              hash: buildContentHash(notification),
              matches: [{ reason: 'database_unique_constraint' }],
            },
          });
          continue;
        }

        const serialized = serializeError(error, {
          title: notification.title,
          notification_url: notification.notification_url,
          pdf_url: notification.pdf_url,
        });
        errors.push(serialized);
        await this.recordFailure(
          source,
          notification.notification_url || notification.pdf_url || source.url,
          error,
          { phase: 'saveNotification', title: notification.title },
        );
      }
    }

    return finish(statusFromErrors(saved, errors));
  }

  async startLog(source) {
    const result = await this.supabase
      .from('job_fetch_logs')
      .insert([{
        source_id: source.id,
        started_at: new Date().toISOString(),
        status: 'running',
        items_found: 0,
        items_saved: 0,
        errors: [],
      }])
      .select()
      .maybeSingle();

    return singleOrThrow(result, 'Start fetch log');
  }

  async updateLog(logId, patch) {
    if (!logId) return null;
    const result = await this.supabase
      .from('job_fetch_logs')
      .update(patch)
      .eq('id', logId)
      .select()
      .maybeSingle();

    if (result.error) {
      this.logger.warn?.(`Unable to update fetch log: ${result.error.message}`);
      return null;
    }
    return result.data || null;
  }

  async updateSourceStats(source, itemsFound) {
    if (!source?.id) return null;

    const patch = {
      last_checked: new Date().toISOString(),
      check_count: (source.check_count || 0) + 1,
      items_found: (source.items_found || 0) + itemsFound,
      updated_at: new Date().toISOString(),
    };

    const result = await this.supabase
      .from('ai_job_sources')
      .update(patch)
      .eq('id', source.id);

    if (result.error) {
      this.logger.warn?.(`Unable to update source stats: ${result.error.message}`);
    }
    return result.data || null;
  }

  async recordFailure(source, url, error, details = {}) {
    const payload = {
      source_id: source?.id || null,
      url: normalizeUrl(url || source?.url || '') || null,
      error_message: cleanWhitespace(error?.message || String(error || 'Unknown error')).slice(0, 2_000),
      details,
    };

    const result = await this.supabase
      .from('fetch_failures')
      .insert([payload])
      .select()
      .maybeSingle();

    if (result.error) {
      this.logger.warn?.(`Unable to record fetch failure: ${result.error.message}`);
      return null;
    }
    return result.data || null;
  }

  async saveNotification(source, notification, hash) {
    const notificationUrl = normalizeUrl(notification.notification_url || '') || null;
    const pdfUrl = normalizeUrl(notification.pdf_url || '') || null;
    const contentHash = hash || buildContentHash(notification);

    const rawPayload = {
      source_id: source.id,
      source_name: source.name,
      notification_url: notificationUrl,
      pdf_url: pdfUrl,
      title: notification.title || null,
      organization: notification.organization || source.name || null,
      raw_html: notification.raw_html || null,
      raw_text: notification.raw_content || null,
      fetched_at: new Date().toISOString(),
      hash: contentHash,
      status: 'new',
      published_date: notification.published_date || null,
      last_date: notification.last_date || null,
      metadata: {
        source_category: source.category || null,
        source_tier: source.tier || null,
        discovered_by: 'phase1_fetcher',
      },
    };

    const rawResult = await this.supabase
      .from('raw_job_notifications')
      .insert([rawPayload])
      .select()
      .maybeSingle();

    const raw = singleOrThrow(rawResult, 'Insert raw job notification');

    const queuePayload = {
      title: notification.title || raw.title || 'Official Job Notification',
      organization: notification.organization || source.name || null,
      source_url: notificationUrl || pdfUrl || source.url,
      source_id: source.id,
      raw_input: buildRawInput(notification),
      job_type: sourceJobType(source),
      extracted_data: {
        raw_notification_id: raw.id,
        source_name: source.name,
        notification_url: notificationUrl,
        pdf_url: pdfUrl,
        published_date: notification.published_date || null,
        last_date: notification.last_date || null,
        content_hash: contentHash,
      },
      duplicate_check: {
        status: 'checked',
        matched_jobs: [],
        risk_score: 0,
      },
      status: 'pending',
      priority: source.tier === 1 ? 5 : 0,
      notes: 'Created automatically by the Phase 1 official job fetcher.',
    };

    const queueResult = await this.supabase
      .from('ai_research_queue')
      .insert([queuePayload])
      .select('id')
      .maybeSingle();

    if (queueResult.error) {
      await this.supabase
        .from('raw_job_notifications')
        .update({
          status: 'failed',
          metadata: {
            ...rawPayload.metadata,
            queue_error: queueResult.error.message,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', raw.id);

      const error = new Error(`Enqueue research item failed: ${queueResult.error.message}`);
      error.cause = queueResult.error;
      throw error;
    }

    await this.supabase
      .from('raw_job_notifications')
      .update({
        status: 'queued',
        queue_item_id: queueResult.data?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', raw.id);

    return {
      saved: true,
      raw,
      queue: queueResult.data || null,
    };
  }
}
