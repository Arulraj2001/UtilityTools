import cors from 'cors';
import { apiConfig } from '../config/apiConfig.js';

// ── Allowed origins list ───────────────────────────────────────────────────
// Built from env var API_CORS_ORIGIN (comma-separated).
// Hardcoded production origins are always included as a safety net
// so a missing env var never causes a CORS outage in production.
const ALWAYS_ALLOWED = [
  'https://www.quickutils.page',
  'https://quickutils.page',
  'http://localhost:5173',
  'http://localhost:3000',
];

const buildAllowedOrigins = () => {
  const fromEnv = apiConfig.corsOrigins.filter((o) => o !== '*');
  const merged = [...new Set([...ALWAYS_ALLOWED, ...fromEnv])];
  return merged;
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

const originIsAllowed = (requestOrigin) => {
  // Requests with no Origin header (curl, server-to-server) always pass
  if (!requestOrigin) return true;
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed === requestOrigin) return true;
    // Wildcard sub-domain pattern e.g. https://*.quickutils.page
    if (allowed.includes('*')) {
      const pattern = new RegExp(
        `^${allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
      );
      return pattern.test(requestOrigin);
    }
    return false;
  });
};

export const createCorsMiddleware = () => cors({
  origin(requestOrigin, callback) {
    if (originIsAllowed(requestOrigin)) {
      // Must echo the exact request origin (never '*') when credentials:true
      callback(null, requestOrigin || ALLOWED_ORIGINS[0]);
      return;
    }
    // Do NOT throw — return false so cors() sends a 200 without ACAO header
    // (throwing causes errorHandler to run AFTER headers are gone, giving a
    // bare network error with no CORS header the browser can read)
    callback(null, false);
  },
  credentials: true,                          // Required for Authorization header
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Cron-Secret',
    'Accept',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,                              // 24-hour preflight cache
  optionsSuccessStatus: 204,                  // IE11 compat
});

// Standalone OPTIONS handler — use this BEFORE auth middleware on any router
// that needs to accept preflights without a valid token.
export const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '';
    if (originIsAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization,X-Cron-Secret,Accept,X-Requested-With'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      res.sendStatus(204);
      return;
    }
    res.sendStatus(403);
    return;
  }
  next();
};

