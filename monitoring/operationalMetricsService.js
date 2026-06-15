import ProviderHealthService from './providerHealthService.js';
import QueueMonitoringService from './queueMonitoringService.js';
import DraftQualityService from './draftQualityService.js';
import ModerationMonitoringService from './moderationMonitoringService.js';
import CostAnalyticsService from './costAnalyticsService.js';
import AlertEngine from './alertEngine.js';

export default class OperationalMetricsService {
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('OperationalMetricsService requires a Supabase client.');
    this.supabase = supabase;
    this.providers = options.providers || new ProviderHealthService(supabase);
    this.queue = options.queue || new QueueMonitoringService(supabase);
    this.quality = options.quality || new DraftQualityService(supabase);
    this.moderation = options.moderation || new ModerationMonitoringService(supabase);
    this.costs = options.costs || new CostAnalyticsService(supabase, options.costOptions);
    this.alerts = options.alerts || new AlertEngine(supabase, options.alertOptions);
  }

  async getMetrics({ days = 30, persistAlerts = false } = {}) {
    const [providers, queue, quality, moderation, costs] = await Promise.all([
      this.providers.getProviderHealth({ days }),
      this.queue.getQueueHealth({ days }),
      this.quality.getQualityMetrics({ days }),
      this.moderation.getModerationMetrics({ days }),
      this.costs.getCostAnalytics({ days }),
    ]);

    const computedAlerts = this.alerts.evaluate({ providers, queue, quality, moderation, costs });
    const alerts = persistAlerts ? await this.alerts.persistAlerts(computedAlerts) : computedAlerts;

    return {
      generatedAt: new Date().toISOString(),
      providers,
      queue,
      quality,
      moderation,
      costs,
      alerts,
    };
  }

  async persistSnapshot({ snapshotType = 'overview', payload } = {}) {
    const data = payload || await this.getMetrics({ persistAlerts: false });
    const result = await this.supabase
      .from('monitoring_metrics_snapshots')
      .insert([{
        snapshot_type: snapshotType,
        payload: data,
        captured_at: new Date().toISOString(),
      }])
      .select()
      .maybeSingle();
    if (result.error) {
      const error = new Error(`Monitoring snapshot insert failed: ${result.error.message}`);
      error.cause = result.error;
      throw error;
    }
    return result.data;
  }
}
