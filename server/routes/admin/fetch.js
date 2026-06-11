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

const router = Router();

// NOTE: Do NOT use .all() here — it intercepts OPTIONS preflight requests.
// The global app.options('*') + cors() middleware handles all preflights.

router.post('/run', rateLimit({ maxRequests: 20 }), requireAdmin, asyncRoute(runFetchAll));

router.get('/status', requireAdmin, asyncRoute(getFetchStatus));

router.get('/logs', requireAdmin, asyncRoute(getFetchLogs));

router.post('/source/:id', requireAdmin, asyncRoute(runFetchSource));

export default router;

