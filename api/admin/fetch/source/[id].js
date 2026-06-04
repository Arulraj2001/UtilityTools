import {
  createJobFetchService,
  createServiceClient,
  handleApiError,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../../_lib/fetchApi.js';

const sourceIdFromRequest = (req) => {
  if (req.query?.id) return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const url = new URL(req.url || '/', 'https://quickutils.local');
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
};

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;

  try {
    const supabase = createServiceClient();
    await requireAdmin(req, supabase);
    const sourceId = sourceIdFromRequest(req);
    const service = createJobFetchService(supabase);
    const result = await service.runSource(sourceId);
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
