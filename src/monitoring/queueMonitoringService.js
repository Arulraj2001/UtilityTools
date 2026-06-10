import { ageHours, countBy, dataOrEmpty, daysAgoIso, safeNumber } from './monitoringUtils.js';

export default class QueueMonitoringService {
  constructor(supabase) {
    if (!supabase) throw new Error('QueueMonitoringService requires a Supabase client.');
    this.supabase = supabase;
  }

  async getQueueHealth({ days = 7 } = {}) {
    const since = daysAgoIso(days);
    const result = await this.supabase
      .from('ai_research_queue')
      .select('id,status,priority,created_at,updated_at,extracted_data,notes')
      .order('created_at', { ascending: true })
      .limit(2000);

    const rows = dataOrEmpty(result);
    const counts = countBy(rows, (row) => row.status || 'unknown');
    const pending = rows.filter((row) => row.status === 'pending');
    const processing = rows.filter((row) => row.status === 'processing');
    const completedRecent = rows.filter((row) => (
      ['drafted', 'rejected'].includes(row.status) &&
      row.updated_at &&
      new Date(row.updated_at).getTime() >= new Date(since).getTime()
    ));

    const retryCount = rows.reduce((sum, row) => (
      sum +
      safeNumber(row.extracted_data?.phase2_retries) +
      safeNumber(row.extracted_data?.phase3_retries)
    ), 0);

    return {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      counts: {
        pending: counts.pending || 0,
        processing: counts.processing || 0,
        drafted: counts.drafted || 0,
        rejected: counts.rejected || 0,
        savedLater: counts.saved_later || 0,
        total: rows.length,
      },
      oldestPendingAgeHours: pending.length ? ageHours(pending[0].created_at) : 0,
      oldestProcessingAgeHours: processing.length ? Math.max(...processing.map((row) => ageHours(row.updated_at || row.created_at))) : 0,
      retryCount,
      throughput: {
        windowDays: days,
        completed: completedRecent.length,
        perDay: Math.round((completedRecent.length / Math.max(1, days)) * 10) / 10,
      },
      attention: {
        pendingOver100: (counts.pending || 0) > 100,
        oldestPendingOver24h: pending.length ? ageHours(pending[0].created_at) > 24 : false,
        processingOver24h: processing.some((row) => ageHours(row.updated_at || row.created_at) > 24),
      },
    };
  }
}
