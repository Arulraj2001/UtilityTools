import { Router } from 'express';
import {
  getFetchLogs,
  getFetchStatus,
  runFetchAll,
  runFetchSource,
} from '../../controllers/adminFetchController.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { requireMethod } from '../../middleware/requireMethod.js';

const router = Router();

router.route('/run')
  .post(rateLimit({ maxRequests: 20 }), requireAdmin, asyncRoute(runFetchAll))
  .all(requireMethod('POST'));

router.route('/status')
  .get(requireAdmin, asyncRoute(getFetchStatus))
  .all(requireMethod('GET'));

router.route('/logs')
  .get(requireAdmin, asyncRoute(getFetchLogs))
  .all(requireMethod('GET'));

router.route('/source/:id')
  .post(requireAdmin, asyncRoute(runFetchSource))
  .all(requireMethod('POST'));

export default router;
