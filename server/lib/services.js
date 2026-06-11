import JobFetchService from '../../src/jobs/jobFetchService.js';
import FetchHealthService from '../../src/jobs/fetchHealthService.js';
import QueueWorker from '../../src/jobs/ai/queueWorker.js';
import AdminReviewService from '../../src/jobs/review/adminReviewService.js';
import ProviderHealthService from '../../src/monitoring/providerHealthService.js';
import QueueMonitoringService from '../../src/monitoring/queueMonitoringService.js';
import DraftQualityService from '../../src/monitoring/draftQualityService.js';
import ModerationMonitoringService from '../../src/monitoring/moderationMonitoringService.js';
import CostAnalyticsService from '../../src/monitoring/costAnalyticsService.js';
import AlertEngine from '../../src/monitoring/alertEngine.js';
import DashboardAggregator from '../../src/monitoring/dashboardAggregator.js';
import OperationalMetricsService from '../../src/monitoring/operationalMetricsService.js';
import ScaleOperationsService from '../../src/monitoring/scaleOperationsService.js';

export const createJobFetchService = (supabase) => new JobFetchService({
  supabase,
  logger: console,
});

export const createFetchHealthService = (supabase) => new FetchHealthService(supabase, {
  logger: console,
});

export const createQueueWorker = (supabase) => new QueueWorker(supabase, {
  logger: console,
});

export const createAdminReviewService = (supabase) => new AdminReviewService(supabase);

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
