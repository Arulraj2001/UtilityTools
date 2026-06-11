import { handleApiError, requireMethod, sendJson } from '../../_lib/fetchApi.js';
import { createMonitoringContext, monitoringDays, monitoringLimit, servicesFor } from '../../_lib/monitoringApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  try {
    const { supabase } = await createMonitoringContext(req);
    const services = servicesFor(supabase);
    const overview = await services.metrics.getMetrics({ days: monitoringDays(req), persistAlerts: true });
    const active = await services.alerts.getActiveAlerts({ limit: monitoringLimit(req) });
    sendJson(res, 200, {
      generatedAt: new Date().toISOString(),
      computed: overview.alerts,
      active,
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
