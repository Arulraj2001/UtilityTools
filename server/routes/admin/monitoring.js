import { Router } from 'express';
import {
  getAlerts,
  getCostAnalytics,
  getModerationMetrics,
  getOverview,
  getProviderHealth,
  getQualityMetrics,
  getQueueHealth,
  getScaleOperations,
} from '../../controllers/adminMonitoringController.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

// NOTE: Do NOT use .all() here — it intercepts OPTIONS preflight requests.
// The global app.options('*') + cors() middleware handles all preflights.

router.get('/providers', requireAdmin, asyncRoute(getProviderHealth));

router.get('/queue', requireAdmin, asyncRoute(getQueueHealth));

router.get('/quality', requireAdmin, asyncRoute(getQualityMetrics));

router.get('/moderation', requireAdmin, asyncRoute(getModerationMetrics));

router.get('/costs', requireAdmin, asyncRoute(getCostAnalytics));

router.get('/alerts', requireAdmin, asyncRoute(getAlerts));

router.get('/overview', requireAdmin, asyncRoute(getOverview));

router.get('/scale-ops', requireAdmin, asyncRoute(getScaleOperations));

export default router;

