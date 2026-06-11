import {
  createServiceClient,
  handleApiError,
  numericLimit,
  queryParams,
  requireAdmin,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;

  try {
    const supabase = createServiceClient();
    await requireAdmin(req, supabase);
    const params = queryParams(req);
    const limit = numericLimit(params.get('limit'), 50, 200);
    const result = await supabase
      .from('ai_provider_failures')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (result.error) throw result.error;
    sendJson(res, 200, {
      failures: result.data || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
