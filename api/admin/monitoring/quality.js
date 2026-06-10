import { handleApiError, requireMethod, sendJson } from '../../_lib/fetchApi.js';
import { createMonitoringContext, servicesFor } from '../../_lib/monitoringApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  try {
    const { supabase } = await createMonitoringContext(req);
    const result = await servicesFor(supabase).quality.getQualityMetrics();
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
