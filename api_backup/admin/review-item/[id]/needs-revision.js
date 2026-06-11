import {
  handleApiError,
  readJsonBody,
  requireMethod,
  sendJson,
} from '../../../_lib/fetchApi.js';
import { createAdminReviewContext, idFromRequest } from '../../../_lib/reviewApi.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;

  try {
    const { service, admin } = await createAdminReviewContext(req);
    const body = await readJsonBody(req);
    const result = await service.setDraftStatus(idFromRequest(req), 'needs_revision', {
      adminId: admin.id,
      reasonCode: body.reasonCode || null,
      notes: body.notes || null,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
