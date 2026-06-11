import {
  handleApiError,
  requireMethod,
  sendJson,
} from '../../../_lib/fetchApi.js';
import { createAdminReviewContext, idFromRequest } from '../../../_lib/reviewApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;

  try {
    const { service, admin } = await createAdminReviewContext(req);
    const result = await service.runReview(idFromRequest(req), { adminId: admin.id });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
