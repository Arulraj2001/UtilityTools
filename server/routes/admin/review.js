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
import { requireMethod } from '../../middleware/requireMethod.js';

const router = Router();

router.route('/review-queue')
  .get(requireAdmin, asyncRoute(getReviewQueue))
  .all(requireMethod('GET'));

router.route('/review-queue/bulk-approve')
  .post(rateLimit(), requireAdmin, asyncRoute(bulkApproveReviewItems))
  .all(requireMethod('POST'));

router.route('/review-queue/bulk-reject')
  .post(rateLimit(), requireAdmin, asyncRoute(bulkRejectReviewItems))
  .all(requireMethod('POST'));

router.route('/review-item/:id')
  .get(requireAdmin, asyncRoute(getReviewItem))
  .all(requireMethod('GET'));

router.route('/review-item/:id/run-review')
  .post(requireAdmin, asyncRoute(runReview))
  .all(requireMethod('POST'));

router.route('/review-item/:id/needs-revision')
  .post(requireAdmin, asyncRoute(markReviewNeedsRevision))
  .all(requireMethod('POST'));

router.route('/review-item/:id/convert-to-job-draft')
  .post(requireAdmin, asyncRoute(convertReviewItemToJobDraft))
  .all(requireMethod('POST'));

router.route('/approve/:id')
  .post(requireAdmin, asyncRoute(approveReviewItem))
  .all(requireMethod('POST'));

router.route('/reject/:id')
  .post(requireAdmin, asyncRoute(rejectReviewItem))
  .all(requireMethod('POST'));

router.route('/publish/:id')
  .post(rateLimit(), requireAdmin, asyncRoute(publishJob))
  .all(requireMethod('POST'));

export default router;
