import {
  createFetchHealthService,
  createServiceClient,
  handleApiError,
  numericLimit,
  queryParams,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;

  try {
    const supabase = createServiceClient();
    await requireAdmin(req, supabase);
    const params = queryParams(req);
    const healthService = createFetchHealthService(supabase);
    const logs = await healthService.getLogs({
      limit: numericLimit(params.get('limit'), 50, 200),
      status: params.get('status') || null,
      sourceId: params.get('source_id') || null,
    });
    sendJson(res, 200, {
      logs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
