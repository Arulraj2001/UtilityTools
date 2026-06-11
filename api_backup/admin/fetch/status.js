import {
  createFetchHealthService,
  createServiceClient,
  handleApiError,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;

  try {
    const supabase = createServiceClient();
    await requireAdmin(req, supabase);
    const healthService = createFetchHealthService(supabase);
    const status = await healthService.getStatus();
    sendJson(res, 200, status);
  } catch (error) {
    handleApiError(res, error);
  }
}
