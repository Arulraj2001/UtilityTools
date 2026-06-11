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
    const result = await service.convertToJobDraft(idFromRequest(req), {
      adminId: admin.id,
      overrideBlocker: Boolean(body.overrideBlocker),
      reasonCode: body.reasonCode || null,
      notes: body.notes || null,
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
