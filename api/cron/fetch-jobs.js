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
    const url = new URL(req.url || '/', 'https://quickutils.local');
    const queryMaxSources = url.searchParams.has('maxSources')
      ? Number(url.searchParams.get('maxSources'))
      : null;
    const querySourceIds = url.searchParams.get('sourceIds');
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds
      : querySourceIds
        ? querySourceIds.split(',').map((value) => value.trim()).filter(Boolean)
        : null;
    const maxSources = Number.isInteger(body.maxSources)
      ? body.maxSources
      : Number.isInteger(queryMaxSources)
        ? queryMaxSources
        : undefined;
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
      sourceIds,
      maxSources,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
