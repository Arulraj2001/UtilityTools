import { Router } from 'express';
import { fetchJobs } from '../controllers/cronController.js';
import { asyncRoute } from '../middleware/asyncRoute.js';
import { requireCronSecret } from '../middleware/requireCronSecret.js';
import { requireMethod } from '../middleware/requireMethod.js';

const router = Router();

router.route('/fetch-jobs')
  .get(requireCronSecret, asyncRoute(fetchJobs))
  .post(requireCronSecret, asyncRoute(fetchJobs))
  .all(requireMethod(['GET', 'POST']));

export default router;
