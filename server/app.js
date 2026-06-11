import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import apiRoutes from './routes/index.js';
import { apiConfig } from './config/apiConfig.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { sendJson } from './lib/response.js';

export const createApp = () => {
  const app = express();
  const corsMiddleware = createCorsMiddleware();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());
  app.use(corsMiddleware);
  app.use(express.json({ limit: apiConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: apiConfig.bodyLimit }));

  app.get('/health', (req, res) => {
    sendJson(res, 200, {
      ok: true,
      service: 'quickutils-api',
      uptime: process.uptime(),
      generatedAt: new Date().toISOString(),
    });
  });

  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
