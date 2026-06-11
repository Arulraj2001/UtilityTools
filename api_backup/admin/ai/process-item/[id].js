import QueueWorker from '../../../../src/jobs/ai/queueWorker.js';
import {
  createServiceClient,
  handleApiError,
  readJsonBody,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../../_lib/fetchApi.js';

const itemIdFromRequest = (req) => {
  if (req.query?.id) return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const url = new URL(req.url || '/', 'https://quickutils.local');
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
};

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;

  try {
    const supabase = createServiceClient();
    const admin = await requireAdmin(req, supabase);
    const body = await readJsonBody(req);
    const worker = new QueueWorker(supabase, {
      logger: console,
    });
    const result = await worker.processItem(itemIdFromRequest(req), {
      adminId: admin.id,
      force: Boolean(body.force),
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
