import OperationalMetricsService from './operationalMetricsService.js';

export default class DashboardAggregator {
  constructor(supabase, options = {}) {
    this.metrics = options.metrics || new OperationalMetricsService(supabase, options);
  }

  async getOverview({ days = 30, persistAlerts = true } = {}) {
    return this.metrics.getMetrics({ days, persistAlerts });
  }
}
