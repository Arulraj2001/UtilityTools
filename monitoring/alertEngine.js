import { rate, safeNumber } from './monitoringUtils.js';

const DEFAULT_THRESHOLDS = {
  pendingQueueCount: 100,
  oldestQueueAgeHours: 24,
  providerSuccessRate: 70,
  providerLatencyMs: 30_000,
  validationFailureRate: 20,
  blockedDraftRate: 25,
  duplicateRisk: 70,
};

const alert = ({ type, severity, title, message, payload = {} }) => ({
  type,
  severity,
  status: 'active',
  title,
  message,
  payload,
  fingerprint: `${type}:${payload.providerName || payload.scope || 'global'}`,
});

export default class AlertEngine {
  constructor(supabase = null, options = {}) {
    this.supabase = supabase;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };
  }

  evaluate({ providers = {}, queue = {}, quality = {}, moderation = {} } = {}) {
    const alerts = [];
    const queueCounts = queue.counts || {};

    if (safeNumber(queueCounts.pending) > this.thresholds.pendingQueueCount) {
      alerts.push(alert({
        type: 'queue_pending_high',
        severity: 'high',
        title: 'Pending queue is high',
        message: `Pending queue count is ${queueCounts.pending}.`,
        payload: { pending: queueCounts.pending },
      }));
    }

    if (safeNumber(queue.oldestPendingAgeHours) > this.thresholds.oldestQueueAgeHours) {
      alerts.push(alert({
        type: 'queue_oldest_pending_stale',
        severity: 'critical',
        title: 'Oldest pending queue item is stale',
        message: `Oldest pending item age is ${queue.oldestPendingAgeHours} hours.`,
        payload: { oldestPendingAgeHours: queue.oldestPendingAgeHours },
      }));
    }

    (providers.providers || []).forEach((provider) => {
      const observedProviderTraffic = safeNumber(provider.requests) > 0 || safeNumber(provider.failures) > 0;
      if (provider.isActive && observedProviderTraffic && provider.successRate < this.thresholds.providerSuccessRate) {
        alerts.push(alert({
          type: 'provider_success_rate_low',
          severity: 'high',
          title: 'Provider success rate is low',
          message: `${provider.providerName} success rate is ${provider.successRate}%.`,
          payload: { providerName: provider.providerName, successRate: provider.successRate },
        }));
      }

      if (safeNumber(provider.p95LatencyMs || provider.averageLatencyMs) > this.thresholds.providerLatencyMs) {
        alerts.push(alert({
          type: 'provider_latency_high',
          severity: 'high',
          title: 'Provider latency is high',
          message: `${provider.providerName} latency is above 30 seconds.`,
          payload: { providerName: provider.providerName, p95LatencyMs: provider.p95LatencyMs, averageLatencyMs: provider.averageLatencyMs },
        }));
      }
    });

    const validationFailureRate = rate(quality.validationFailures || 0, quality.counts?.verifications || 0);
    if (validationFailureRate > this.thresholds.validationFailureRate) {
      alerts.push(alert({
        type: 'validation_failure_rate_high',
        severity: 'high',
        title: 'Validation failure rate is high',
        message: `Validation failure rate is ${validationFailureRate}%.`,
        payload: { validationFailureRate, validationFailures: quality.validationFailures || 0 },
      }));
    }

    const blocked = quality.distributions?.decisionBands?.blocked || 0;
    const reviewCount = quality.counts?.reviews || 0;
    const blockedRate = rate(blocked, reviewCount);
    if (blockedRate > this.thresholds.blockedDraftRate) {
      alerts.push(alert({
        type: 'blocked_draft_rate_high',
        severity: 'medium',
        title: 'Blocked draft rate is high',
        message: `Blocked draft rate is ${blockedRate}%.`,
        payload: { blockedRate, blocked, reviewCount },
      }));
    }

    if (safeNumber(quality.averages?.duplicateRisk) > this.thresholds.duplicateRisk) {
      alerts.push(alert({
        type: 'duplicate_risk_spike',
        severity: 'high',
        title: 'Duplicate risk spike',
        message: `Average duplicate risk is ${quality.averages.duplicateRisk}.`,
        payload: { duplicateRisk: quality.averages.duplicateRisk },
      }));
    }

    if (safeNumber(moderation.totals?.overrides) > 0) {
      alerts.push(alert({
        type: 'publish_override_detected',
        severity: 'critical',
        title: 'Publish or blocker override occurred',
        message: `${moderation.totals.overrides} override action(s) occurred in the selected window.`,
        payload: { overrides: moderation.totals.overrides },
      }));
    }

    return alerts;
  }

  async persistAlerts(alerts = []) {
    if (!this.supabase) return alerts;
    const persisted = [];

    for (const item of alerts) {
      const existing = await this.supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('fingerprint', item.fingerprint)
        .eq('status', 'active')
        .maybeSingle();

      if (!existing.error && existing.data?.id) {
        const update = await this.supabase
          .from('monitoring_alerts')
          .update({
            severity: item.severity,
            title: item.title,
            message: item.message,
            payload: item.payload,
            last_seen_at: new Date().toISOString(),
            occurrence_count: safeNumber(existing.data.occurrence_count, 1) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.data.id)
          .select()
          .maybeSingle();
        persisted.push(update.data || { ...existing.data, ...item });
        continue;
      }

      const inserted = await this.supabase
        .from('monitoring_alerts')
        .insert([{
          ...item,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          occurrence_count: 1,
        }])
        .select()
        .maybeSingle();
      if (!inserted.error && inserted.data) persisted.push(inserted.data);
    }

    return persisted;
  }

  async getActiveAlerts({ limit = 100 } = {}) {
    if (!this.supabase) return [];
    const result = await this.supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('status', 'active')
      .order('severity')
      .order('last_seen_at', { ascending: false })
      .limit(limit);
    return result.error ? [] : (result.data || []);
  }
}
