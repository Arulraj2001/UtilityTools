import {
  handleApiError,
  numericLimit,
  queryParams,
  requireMethod,
  sendJson,
} from '../../_lib/fetchApi.js';
import { createAdminReviewContext } from '../../_lib/reviewApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;

  try {
    const { service } = await createAdminReviewContext(req);
    const params = queryParams(req);
    const result = await service.getReviewQueue({
      limit: numericLimit(params.get('limit'), 50, 100),
      decisionBand: params.get('decisionBand') || null,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
