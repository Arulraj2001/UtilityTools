import { numericLimit, queryParams, readJsonBody } from '../lib/request.js';
import { sendJson } from '../lib/response.js';
import { createAdminReviewService } from '../lib/services.js';

const reviewService = (req) => createAdminReviewService(req.supabase);

export const getReviewQueue = async (req, res) => {
  const params = queryParams(req);
  const result = await reviewService(req).getReviewQueue({
    limit: numericLimit(params.get('limit'), 50, 100),
    decisionBand: params.get('decisionBand') || null,
  });
  sendJson(res, 200, result);
};

export const getReviewItem = async (req, res) => {
  const result = await reviewService(req).getReviewItem(req.params.id || '');
  sendJson(res, 200, result);
};

export const runReview = async (req, res) => {
  const result = await reviewService(req).runReview(req.params.id || '', {
    adminId: req.admin.id,
  });
  sendJson(res, 200, result);
};

export const approveReviewItem = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).setDraftStatus(req.params.id || '', 'approved', {
    adminId: req.admin.id,
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const rejectReviewItem = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).setDraftStatus(req.params.id || '', 'rejected', {
    adminId: req.admin.id,
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const markReviewNeedsRevision = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).setDraftStatus(req.params.id || '', 'needs_revision', {
    adminId: req.admin.id,
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const convertReviewItemToJobDraft = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).convertToJobDraft(req.params.id || '', {
    adminId: req.admin.id,
    overrideBlocker: Boolean(body.overrideBlocker),
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const publishJob = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).publishJob(req.params.id || '', {
    adminId: req.admin.id,
    confirm: body.confirm,
    overrideBlocker: Boolean(body.overrideBlocker),
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const bulkApproveReviewItems = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).bulkSetDraftStatus(body.draftIds || body.ids, 'approved', {
    adminId: req.admin.id,
    confirm: body.confirm,
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};

export const bulkRejectReviewItems = async (req, res) => {
  const body = await readJsonBody(req);
  const result = await reviewService(req).bulkSetDraftStatus(body.draftIds || body.ids, 'rejected', {
    adminId: req.admin.id,
    confirm: body.confirm,
    reasonCode: body.reasonCode || null,
    notes: body.notes || null,
  });
  sendJson(res, 200, result);
};
