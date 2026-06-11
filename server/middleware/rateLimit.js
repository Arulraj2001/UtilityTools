import { sendJson } from '../lib/response.js';

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

const requestIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.headers['x-real-ip']
  || req.ip
  || req.socket?.remoteAddress
  || 'unknown'
);

export const rateLimit = ({
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
} = {}) => (req, res, next) => {
  const ip = requestIp(req);
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(ip, entry);
  }

  entry.count += 1;

  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + windowMs) / 1000)));

  if (entry.count > maxRequests) {
    sendJson(res, 429, {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000),
    });
    return;
  }

  next();
};
