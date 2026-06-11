import { Router } from 'express';
import { getHomepageSummary } from '../controllers/homepageController.js';
import { asyncRoute } from '../middleware/asyncRoute.js';
import { requireMethod } from '../middleware/requireMethod.js';

const router = Router();

router.route('/')
  .get(asyncRoute(getHomepageSummary))
  .all(requireMethod('GET'));

export default router;
