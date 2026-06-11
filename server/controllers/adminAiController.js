import { numericLimit, queryParams, readJsonBody } from '../lib/request.js';
import { sendJson } from '../lib/response.js';
import { createQueueWorker } from '../lib/services.js';

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

export const processAiQueue = async (req, res) => {
  const body = await readJsonBody(req);
  const worker = createQueueWorker(req.supabase);
  const itemIds = queueItemIds(body.itemIds);
  const forceRequested = Boolean(body.force);
  const forceAllowed = forceRequested && itemIds && itemIds.length > 0;

  if (forceRequested && !forceAllowed) {
    sendJson(res, 400, {
      error: 'force=true requires explicit itemIds. Blanket re-processing is not allowed to prevent cost amplification.',
    });
    return;
  }

  const result = await worker.processQueue({
    adminId: req.admin.id,
    limit: queueLimit(body.limit),
    itemIds,
    force: forceAllowed,
  });
  sendJson(res, 200, result);
};

export const processAiQueueItem = async (req, res) => {
  const body = await readJsonBody(req);
  const worker = createQueueWorker(req.supabase);
  const result = await worker.processItem(req.params.id || '', {
    adminId: req.admin.id,
    force: Boolean(body.force),
  });
  sendJson(res, 200, result);
};

export const getAiQueueStatus = async (req, res) => {
  const worker = createQueueWorker(req.supabase);
  sendJson(res, 200, await worker.getStatus());
};

export const getAiFailures = async (req, res) => {
  const params = queryParams(req);
  const limit = numericLimit(params.get('limit'), 50, 200);
  const result = await req.supabase
    .from('ai_provider_failures')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (result.error) throw result.error;
  sendJson(res, 200, {
    failures: result.data || [],
    generatedAt: new Date().toISOString(),
  });
};
