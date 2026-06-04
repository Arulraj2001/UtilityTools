import QueueWorker from '../../../src/jobs/ai/queueWorker.js';
import {
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
    const admin = await requireAdmin(req, supabase);
    const body = await readJsonBody(req);
    const worker = new QueueWorker(supabase, {
      logger: console,
    });
    const result = await worker.processQueue({
      adminId: admin.id,
      limit: Number.isInteger(body.limit) ? body.limit : 5,
      itemIds: Array.isArray(body.itemIds) ? body.itemIds : null,
      force: Boolean(body.force),
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
