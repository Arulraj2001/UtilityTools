import { countBy, dataOrEmpty, dateBucket, daysAgoIso } from './monitoringUtils.js';

export default class ModerationMonitoringService {
  constructor(supabase) {
    if (!supabase) throw new Error('ModerationMonitoringService requires a Supabase client.');
    this.supabase = supabase;
  }

  async getModerationMetrics({ days = 30 } = {}) {
    const since = daysAgoIso(days);
    const result = await this.supabase
      .from('ai_moderation_actions')
      .select('id,draft_id,job_id,admin_id,action,reason_code,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);

    const actions = dataOrEmpty(result);
    const byAction = countBy(actions, (action) => action.action || 'unknown');

    const grouped = (granularity) => actions.reduce((counts, action) => {
      const bucket = dateBucket(action.created_at, granularity);
      counts[bucket] = counts[bucket] || {};
      counts[bucket][action.action] = (counts[bucket][action.action] || 0) + 1;
      return counts;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      windowDays: days,
      totals: {
        approvals: byAction.approve || 0,
        rejections: byAction.reject || 0,
        revisions: byAction.needs_revision || 0,
        conversions: byAction.convert_to_draft || 0,
        publishes: byAction.publish || 0,
        overrides: byAction.override_blocker || 0,
        bulkApprovals: byAction.bulk_approve || 0,
        bulkRejections: byAction.bulk_reject || 0,
        reviews: byAction.run_review || 0,
        total: actions.length,
      },
      byAction,
      byDay: grouped('day'),
      byWeek: grouped('week'),
      byMonth: grouped('month'),
      byAdmin: countBy(actions, (action) => action.admin_id || 'system'),
      recent: actions.slice(0, 20),
    };
  }
}
