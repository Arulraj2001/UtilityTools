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
import { requireMethod } from '../../middleware/requireMethod.js';

const router = Router();

router.route('/providers')
  .get(requireAdmin, asyncRoute(getProviderHealth))
  .all(requireMethod('GET'));

router.route('/queue')
  .get(requireAdmin, asyncRoute(getQueueHealth))
  .all(requireMethod('GET'));

router.route('/quality')
  .get(requireAdmin, asyncRoute(getQualityMetrics))
  .all(requireMethod('GET'));

router.route('/moderation')
  .get(requireAdmin, asyncRoute(getModerationMetrics))
  .all(requireMethod('GET'));

router.route('/costs')
  .get(requireAdmin, asyncRoute(getCostAnalytics))
  .all(requireMethod('GET'));

router.route('/alerts')
  .get(requireAdmin, asyncRoute(getAlerts))
  .all(requireMethod('GET'));

router.route('/overview')
  .get(requireAdmin, asyncRoute(getOverview))
  .all(requireMethod('GET'));

router.route('/scale-ops')
  .get(requireAdmin, asyncRoute(getScaleOperations))
  .all(requireMethod('GET'));

export default router;
