import {
  createJobFetchService,
  createServiceClient,
  handleApiError,
  readJsonBody,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;

  try {
    const supabase = createServiceClient();
    await requireAdmin(req, supabase);
    const body = await readJsonBody(req);
    const service = createJobFetchService(supabase);
    const result = await service.runAll({
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : null,
      maxSources: Number.isInteger(body.maxSources) ? body.maxSources : undefined,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
