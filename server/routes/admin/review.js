import { Router } from 'express';
import {
  approveReviewItem,
  bulkApproveReviewItems,
  bulkRejectReviewItems,
  convertReviewItemToJobDraft,
  getReviewItem,
  getReviewQueue,
  markReviewNeedsRevision,
  publishJob,
  rejectReviewItem,
  runReview,
} from '../../controllers/adminReviewController.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

// NOTE: Do NOT use .all() here — it intercepts OPTIONS preflight requests
// and returns 405 before the global CORS handler in app.js can respond.
// The global app.options('*') + cors() middleware handles all preflights.

router.get('/review-queue', requireAdmin, asyncRoute(getReviewQueue));

router.post('/review-queue/bulk-approve', rateLimit(), requireAdmin, asyncRoute(bulkApproveReviewItems));

router.post('/review-queue/bulk-reject', rateLimit(), requireAdmin, asyncRoute(bulkRejectReviewItems));

router.get('/review-item/:id', requireAdmin, asyncRoute(getReviewItem));

router.post('/review-item/:id/run-review', requireAdmin, asyncRoute(runReview));

router.post('/review-item/:id/needs-revision', requireAdmin, asyncRoute(markReviewNeedsRevision));

router.post('/review-item/:id/convert-to-job-draft', requireAdmin, asyncRoute(convertReviewItemToJobDraft));

router.post('/approve/:id', requireAdmin, asyncRoute(approveReviewItem));

router.post('/reject/:id', requireAdmin, asyncRoute(rejectReviewItem));

router.post('/publish/:id', rateLimit(), requireAdmin, asyncRoute(publishJob));

export default router;

