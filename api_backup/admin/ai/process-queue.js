import QueueWorker from '../../../src/jobs/ai/queueWorker.js';
import {
  createServiceClient,
  handleApiError,
  rateLimit,
  readJsonBody,
  requireAdmin,
  requireMethod,
  sendJson,
  setCorsHeaders,
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
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 204, null);
  if (!requireMethod(req, res, 'POST')) return;
  // AI processing is expensive — stricter rate limit (30/min)
  if (rateLimit(req, res, { maxRequests: 30 })) return;

  try {
    const supabase = createServiceClient();
    const admin = await requireAdmin(req, supabase);
    const body = await readJsonBody(req);
    const worker = new QueueWorker(supabase, {
      logger: console,
    });
    const itemIds = queueItemIds(body.itemIds);

    // Security: force=true without explicit itemIds could re-process the entire queue
    // and amplify AI costs. Only allow force when targeting specific items.
    const forceRequested = Boolean(body.force);
    const forceAllowed = forceRequested && itemIds && itemIds.length > 0;
    if (forceRequested && !forceAllowed) {
      return sendJson(res, 400, {
        error: 'force=true requires explicit itemIds. Blanket re-processing is not allowed to prevent cost amplification.',
      });
    }

    const result = await worker.processQueue({
      adminId: admin.id,
      limit: queueLimit(body.limit),
      itemIds,
      force: forceAllowed,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
