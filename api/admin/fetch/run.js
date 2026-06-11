import {
  createJobFetchService,
  createServiceClient,
  handleApiError,
  rateLimit,
  readJsonBody,
  requireAdmin,
  requireMethod,
  sendJson,
  setCorsHeaders,
} from '../../_lib/fetchApi.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 204, null);
  if (!requireMethod(req, res, 'POST')) return;
  // Fetching is network-heavy — stricter rate limit
  if (rateLimit(req, res, { maxRequests: 20 })) return;

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
