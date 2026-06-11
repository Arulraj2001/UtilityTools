import { Router } from 'express';
import adminRouter from './admin/index.js';
import cronRouter from './cron.js';
import homepageRouter from './homepage.js';

const router = Router();

router.use('/admin', adminRouter);
router.use('/cron', cronRouter);
router.use('/homepage', homepageRouter);

export default router;
