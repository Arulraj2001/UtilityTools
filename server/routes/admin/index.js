import { Router } from 'express';
import aiRouter from './ai.js';
import fetchRouter from './fetch.js';
import monitoringRouter from './monitoring.js';
import reviewRouter from './review.js';

const router = Router();

router.use('/ai', aiRouter);
router.use('/fetch', fetchRouter);
router.use('/monitoring', monitoringRouter);
router.use('/', reviewRouter);

export default router;
