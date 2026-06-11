import cors from 'cors';
import { apiConfig } from '../config/apiConfig.js';

const originIsAllowed = (requestOrigin, allowedOrigins) => {
  if (!requestOrigin || allowedOrigins.includes('*')) return true;
  return allowedOrigins.some((origin) => {
    if (origin === requestOrigin) return true;
    if (!origin.includes('*')) return false;
    const pattern = new RegExp(`^${origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    return pattern.test(requestOrigin);
  });
};

export const createCorsMiddleware = () => cors({
  origin(origin, callback) {
    if (originIsAllowed(origin, apiConfig.corsOrigins)) {
      callback(null, apiConfig.corsOrigins.includes('*') ? '*' : origin || apiConfig.corsOrigins[0]);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret', 'Accept'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
});
