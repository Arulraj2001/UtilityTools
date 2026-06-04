import {
  createJobFetchService,
  createServiceClient,
  handleApiError,
  readJsonBody,
  requireCronSecret,
  requireMethod,
  sendJson,
} from '../_lib/fetchApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, ['GET', 'POST'])) return;

  try {
    requireCronSecret(req);
    const supabase = createServiceClient();
    const body = await readJsonBody(req);
    const service = createJobFetchService(supabase);

    if (await service.hasRecentRunningFetch(30)) {
      sendJson(res, 202, {
        status: 'skipped',
        reason: 'A fetch run is already active or recently started.',
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const result = await service.runAll({
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : null,
      maxSources: Number.isInteger(body.maxSources) ? body.maxSources : undefined,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
