import {
  createServiceClient,
  numericLimit,
  queryParams,
  requireAdmin,
} from './fetchApi.js';
import ProviderHealthService from '../../src/monitoring/providerHealthService.js';
import QueueMonitoringService from '../../src/monitoring/queueMonitoringService.js';
import DraftQualityService from '../../src/monitoring/draftQualityService.js';
import ModerationMonitoringService from '../../src/monitoring/moderationMonitoringService.js';
import CostAnalyticsService from '../../src/monitoring/costAnalyticsService.js';
import AlertEngine from '../../src/monitoring/alertEngine.js';
import DashboardAggregator from '../../src/monitoring/dashboardAggregator.js';
import OperationalMetricsService from '../../src/monitoring/operationalMetricsService.js';
import ScaleOperationsService from '../../src/monitoring/scaleOperationsService.js';

export const createMonitoringContext = async (req) => {
  const supabase = createServiceClient();
  const admin = await requireAdmin(req, supabase);
  return { supabase, admin };
};

export const monitoringDays = (req, fallback = 30, max = 365) => {
  const params = queryParams(req);
  return numericLimit(params.get('days'), fallback, max);
};

export const monitoringLimit = (req, fallback = 100, max = 500) => {
  const params = queryParams(req);
  return numericLimit(params.get('limit'), fallback, max);
};

export const servicesFor = (supabase) => ({
  providers: new ProviderHealthService(supabase),
  queue: new QueueMonitoringService(supabase),
  quality: new DraftQualityService(supabase),
  moderation: new ModerationMonitoringService(supabase),
  costs: new CostAnalyticsService(supabase),
  alerts: new AlertEngine(supabase),
  metrics: new OperationalMetricsService(supabase),
  dashboard: new DashboardAggregator(supabase),
  scaleOps: new ScaleOperationsService(supabase),
});
