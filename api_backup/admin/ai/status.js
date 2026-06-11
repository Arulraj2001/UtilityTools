import QueueWorker from '../../../src/jobs/ai/queueWorker.js';
import {
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
    const worker = new QueueWorker(supabase, {
      logger: console,
    });
    sendJson(res, 200, await worker.getStatus());
  } catch (error) {
    handleApiError(res, error);
  }
}
