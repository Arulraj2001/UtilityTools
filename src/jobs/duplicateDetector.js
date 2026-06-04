import { buildContentHash, normalizeUrl, cleanWhitespace } from './normalizeNotification.js';

const noopLogger = {
  warn: () => {},
  error: () => {},
};

const isDuplicateDbError = (error) => (
  error?.code === '23505' || /duplicate|unique/i.test(`${error?.message || ''} ${error?.details || ''}`)
);

const safeValue = (value = '') => cleanWhitespace(value).slice(0, 1_000);

export { buildContentHash, isDuplicateDbError };

export default class DuplicateDetector {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.logger = options.logger || noopLogger;
  }

  async findSingle(table, column, value, select = 'id') {
    const normalized = column.includes('url') || column.includes('link') || column.includes('pdf')
      ? normalizeUrl(value)
      : cleanWhitespace(value);
    if (!normalized) return null;

    const result = await this.supabase
      .from(table)
      .select(select)
      .eq(column, normalized)
      .limit(1)
      .maybeSingle();

    if (result.error) {
      this.logger.warn?.(`Duplicate check failed for ${table}.${column}: ${result.error.message}`);
      return null;
    }

    return result.data || null;
  }

  async check(notification = {}) {
    const hash = buildContentHash(notification);
    const notificationUrl = normalizeUrl(notification.notification_url || '');
    const pdfUrl = normalizeUrl(notification.pdf_url || '');
    const matches = [];

    const checks = [
      ['raw_job_notifications', 'notification_url', notificationUrl, 'raw_job_notifications'],
      ['raw_job_notifications', 'pdf_url', pdfUrl, 'raw_job_notifications'],
      ['raw_job_notifications', 'hash', hash, 'raw_job_notifications'],
      ['ai_research_queue', 'source_url', notificationUrl, 'ai_research_queue'],
      ['ai_research_queue', 'source_url', pdfUrl, 'ai_research_queue'],
      ['jobs', 'notification_pdf', pdfUrl, 'jobs'],
      ['jobs', 'apply_link', notificationUrl, 'jobs'],
      ['jobs', 'canonical_url', notificationUrl, 'jobs'],
    ];

    for (const [table, column, value, matchedTable] of checks) {
      if (!value) continue;
      const found = await this.findSingle(table, column, value, 'id');
      if (found?.id) {
        matches.push({
          matched_table: matchedTable,
          matched_id: String(found.id),
          column,
          reason: `${matchedTable}.${column}`,
        });
      }
    }

    return {
      isDuplicate: matches.length > 0,
      hash,
      matches,
    };
  }

  async recordDuplicate({ sourceId = null, notification = {}, duplicate = {} } = {}) {
    const firstMatch = duplicate.matches?.[0] || {};
    const payload = {
      source_id: sourceId,
      notification_url: normalizeUrl(notification.notification_url || '') || null,
      pdf_url: normalizeUrl(notification.pdf_url || '') || null,
      hash: duplicate.hash || buildContentHash(notification),
      matched_table: firstMatch.matched_table || null,
      matched_id: firstMatch.matched_id || null,
      reason: safeValue(firstMatch.reason || 'duplicate_notification'),
    };

    const result = await this.supabase
      .from('job_fetch_duplicates')
      .insert([payload])
      .select()
      .maybeSingle();

    if (result.error) {
      this.logger.warn?.(`Unable to record duplicate notification: ${result.error.message}`);
      return null;
    }

    return result.data || null;
  }
}
