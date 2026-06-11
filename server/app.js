import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import apiRoutes from './routes/index.js';
import { apiConfig } from './config/apiConfig.js';
import { createCorsMiddleware, handlePreflight } from './middleware/cors.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { sendJson } from './lib/response.js';

export const createApp = () => {
  const app = express();
  const corsMiddleware = createCorsMiddleware();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // ── CORS must be first — before helmet, before anything else ──────────────
  // helmet's crossOriginResourcePolicy can strip CORS response headers if
  // it runs first. cors() must set its headers before helmet touches the res.
  app.use(corsMiddleware);

  // Handle ALL OPTIONS preflights globally before any route or auth middleware.
  // This ensures the browser's preflight request always gets a 204 with the
  // correct CORS headers, even on routes that require authentication.
  app.options('*', handlePreflight);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Disable HSTS in development so localhost works without SSL
    hsts: process.env.NODE_ENV === 'production',
  }));
  app.use(compression());
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

