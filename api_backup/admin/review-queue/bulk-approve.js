import {
  handleApiError,
  rateLimit,
  readJsonBody,
  requireMethod,
  sendJson,
  setCorsHeaders,
} from '../../_lib/fetchApi.js';
import { createAdminReviewContext } from '../../_lib/reviewApi.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return sendJson(res, 204, null);
  if (!requireMethod(req, res, 'POST')) return;
  if (rateLimit(req, res)) return;

  try {
    const { service, admin } = await createAdminReviewContext(req);
    const body = await readJsonBody(req);
    const result = await service.bulkSetDraftStatus(body.draftIds || body.ids, 'approved', {
      adminId: admin.id,
      confirm: body.confirm,
      reasonCode: body.reasonCode || null,
      notes: body.notes || null,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
