import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import DashboardAggregator from '../src/monitoring/dashboardAggregator.js';
import OperationalMetricsService from '../src/monitoring/operationalMetricsService.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('PHASE4_LIVE_VALIDATION_ERROR missing Supabase URL or service role key');
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
});

const anon = anonKey ? createClient(url, anonKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
  realtime: { transport: ws },
}) : null;

const dashboard = new DashboardAggregator(service);
const metricsService = new OperationalMetricsService(service);
const overview = await dashboard.getOverview({ days: 30, persistAlerts: true });
const snapshot = await metricsService.persistSnapshot({
  snapshotType: 'phase4_live_validation',
  payload: overview,
});

const countTable = async (table) => {
  const result = await service.from(table).select('id', { count: 'exact', head: true });
  return { table, count: result.count ?? 0, error: result.error?.message || null };
};

const anonProbe = async (table) => {
  if (!anon) return { table, configured: false, visibleRows: null, error: 'anon key not configured' };
  const result = await anon.from(table).select('id').limit(1);
  return {
    table,
    configured: true,
    visibleRows: result.data?.length ?? 0,
    error: result.error?.message || null,
  };
};

const [alertsCount, snapshotsCount] = await Promise.all([
  countTable('monitoring_alerts'),
  countTable('monitoring_metrics_snapshots'),
]);

const anonRlsProbe = await Promise.all([
  anonProbe('monitoring_alerts'),
  anonProbe('monitoring_metrics_snapshots'),
]);

console.log('PHASE4_LIVE_VALIDATION_RESULT', JSON.stringify({
  generatedAt: overview.generatedAt,
  providers: {
    count: overview.providers.providers.length,
    active: overview.providers.totals.activeProviders,
    totalRequests: overview.providers.totals.requests,
    failures: overview.providers.totals.failures,
  },
  queue: overview.queue.counts,
  quality: {
    averages: overview.quality.averages,
    decisionBands: overview.quality.distributions.decisionBands,
    validationFailures: overview.quality.validationFailures,
  },
  moderation: overview.moderation.totals,
  costs: overview.costs.totals,
  alerts: {
    computed: overview.alerts.length,
    persistedCount: alertsCount.count,
  },
  snapshot: {
    id: snapshot.id,
    type: snapshot.snapshot_type,
    persistedCount: snapshotsCount.count,
  },
  anonRlsProbe,
  errors: {
    alerts: alertsCount.error,
    snapshots: snapshotsCount.error,
  },
}, null, 2));
