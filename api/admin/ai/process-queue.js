import QueueWorker from '../../../src/jobs/ai/queueWorker.js';
import {
  createServiceClient,
  handleApiError,
  readJsonBody,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';

const MAX_AI_QUEUE_BATCH_SIZE = 25;

const queueLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, MAX_AI_QUEUE_BATCH_SIZE);
};

const queueItemIds = (value) => {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, MAX_AI_QUEUE_BATCH_SIZE);
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
    const itemIds = queueItemIds(body.itemIds);
    const result = await worker.processQueue({
      adminId: admin.id,
      limit: queueLimit(body.limit),
      itemIds,
      force: Boolean(body.force),
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
