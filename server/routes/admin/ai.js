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

const router = Router();

// NOTE: Do NOT use .all() here — it intercepts OPTIONS preflight requests.
// The global app.options('*') + cors() middleware handles all preflights.

router.post('/process-queue', rateLimit({ maxRequests: 30 }), requireAdmin, asyncRoute(processAiQueue));

router.post('/process-item/:id', requireAdmin, asyncRoute(processAiQueueItem));

router.get('/status', requireAdmin, asyncRoute(getAiQueueStatus));

router.get('/failures', requireAdmin, asyncRoute(getAiFailures));

export default router;

