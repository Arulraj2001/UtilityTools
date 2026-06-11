import { numericLimit, queryParams, readJsonBody } from '../lib/request.js';
import { sendJson } from '../lib/response.js';
import { createFetchHealthService, createJobFetchService } from '../lib/services.js';

export const runFetchAll = async (req, res) => {
  const body = await readJsonBody(req);
  const service = createJobFetchService(req.supabase);
  const result = await service.runAll({
    sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : null,
    maxSources: Number.isInteger(body.maxSources) ? body.maxSources : undefined,
  });
  sendJson(res, 200, result);
};

export const getFetchStatus = async (req, res) => {
  const healthService = createFetchHealthService(req.supabase);
  const status = await healthService.getStatus();
  sendJson(res, 200, status);
};

export const getFetchLogs = async (req, res) => {
  const params = queryParams(req);
  const healthService = createFetchHealthService(req.supabase);
  const logs = await healthService.getLogs({
    limit: numericLimit(params.get('limit'), 50, 200),
    status: params.get('status') || null,
    sourceId: params.get('source_id') || params.get('sourceId') || null,
  });
  sendJson(res, 200, {
    logs,
    generatedAt: new Date().toISOString(),
  });
};

export const runFetchSource = async (req, res) => {
  const service = createJobFetchService(req.supabase);
  const result = await service.runSource(req.params.id || '');
  sendJson(res, 200, result);
};
