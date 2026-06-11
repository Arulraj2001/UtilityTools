import { Router } from 'express';
import {
  getAiFailures,
  getAiQueueStatus,
  processAiQueue,
  processAiQueueItem,
} from '../../controllers/adminAiController.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { requireMethod } from '../../middleware/requireMethod.js';

const router = Router();

router.route('/process-queue')
  .post(rateLimit({ maxRequests: 30 }), requireAdmin, asyncRoute(processAiQueue))
  .all(requireMethod('POST'));

router.route('/process-item/:id')
  .post(requireAdmin, asyncRoute(processAiQueueItem))
  .all(requireMethod('POST'));

router.route('/status')
  .get(requireAdmin, asyncRoute(getAiQueueStatus))
  .all(requireMethod('GET'));

router.route('/failures')
  .get(requireAdmin, asyncRoute(getAiFailures))
  .all(requireMethod('GET'));

export default router;
