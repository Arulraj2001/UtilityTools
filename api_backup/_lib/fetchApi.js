import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import JobFetchService from '../../src/jobs/jobFetchService.js';
import FetchHealthService from '../../src/jobs/fetchHealthService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRETS = [
  process.env.JOB_FETCH_CRON_SECRET,
  process.env.CRON_FETCH_SECRET,
  process.env.CRON_SECRET,
]
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index);

// ── In-memory rate limiter (no external deps) ──────────────────────────────
// Sliding window counter per IP. Default: 60 req/min per IP.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit check for admin API routes.
 * Returns true if rate limit exceeded (caller should return 429).
 * @param {Request} req
 * @param {Response} res
 * @param {{ maxRequests?: number, windowMs?: number }} options
 * @returns {boolean} true if rate limited (response already sent)
 */
export const rateLimit = (req, res, {
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
} = {}) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(ip, entry);
  }

  entry.count += 1;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + windowMs) / 1000)));

  if (entry.count > maxRequests) {
    sendJson(res, 429, {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000),
    });
    return true;
  }

  return false;
};

export const sendJson = (res, status, body, headers = {}) => {
  Object.entries({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).json(body);
};

export const requireMethod = (req, res, methods) => {
  const allowed = Array.isArray(methods) ? methods : [methods];
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Method not allowed' });
  return false;
};

export const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Supabase service environment is not configured.');
    error.status = 500;
    throw error;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: ws,
    },
  });
};

const authHeader = (req) => req.headers.authorization || req.headers.Authorization || '';

const bearerToken = (value = '') => String(value || '').replace(/^Bearer\s+/i, '').trim();

export const requireAdmin = async (req, supabase) => {
  const token = bearerToken(authHeader(req));
  if (!token) {
    const error = new Error('Authorization required.');
    error.status = 401;
    throw error;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    const error = new Error('Invalid or expired admin session.');
    error.status = 401;
    throw error;
  }

  // Verify the user's email is confirmed (prevents unverified account abuse)
  if (!user.email_confirmed_at && !user.confirmed_at) {
    const error = new Error('Email not confirmed.');
    error.status = 401;
    throw error;
  }

  // Verify JWT audience matches expected value (prevents token reuse from other Supabase projects)
  if (user.aud && user.aud !== 'authenticated') {
    const error = new Error('Invalid token audience.');
    error.status = 401;
    throw error;
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError || !admin?.is_admin) {
    const error = new Error('Admin role required.');
    error.status = 403;
    throw error;
  }

  return user;
};

export const requireCronSecret = (req) => {
  if (!CRON_SECRETS.length) {
    const error = new Error('Cron secret is not configured.');
    error.status = 500;
    throw error;
  }

  const headerSecret = req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'];
  const authSecret = bearerToken(authHeader(req));
  const providedSecret = String(headerSecret || authSecret || '').trim();

  if (!providedSecret || !CRON_SECRETS.includes(providedSecret)) {
    const error = new Error('Invalid cron secret.');
    error.status = 401;
    throw error;
  }
};

export const readJsonBody = async (req) => {
  if (req.body === null) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return {};
    return JSON.parse(req.body);
  }

  if (typeof req[Symbol.asyncIterator] !== 'function') return {};

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? JSON.parse(raw) : {};
};

export const queryParams = (req) => {
  const url = new URL(req.url || '/', 'https://quickutils.local');
  return url.searchParams;
};

export const numericLimit = (value, fallback = 50, max = 200) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
};

export const createJobFetchService = (supabase) => new JobFetchService({
  supabase,
  logger: console,
});

export const createFetchHealthService = (supabase) => new FetchHealthService(supabase, {
  logger: console,
});

export const handleApiError = (res, error) => {
  const status = error?.status || error?.cause?.status || 500;
  sendJson(res, status, {
    error: error?.message || 'Request failed.',
  });
};

// ── SSRF Protection ────────────────────────────────────────────────────────────
// Validates URLs to prevent Server-Side Request Forgery attacks.
// Block private IP ranges, loopback, link-local, and metadata endpoints.

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
  /^localhost$/i,
];

/**
 * Returns true if the given URL is safe to fetch (not a private/internal address).
 * @param {string} rawUrl - The URL to validate
 * @returns {{ safe: boolean, reason?: string }}
 */
export const validateFetchUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'Empty or invalid URL.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Malformed URL.' };
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: `Protocol ${parsed.protocol} is not allowed. Use http or https.` };
  }

  // Check hostname against private IP patterns
  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: `Hostname ${hostname} resolves to a private/internal address.` };
    }
  }

  // Block common cloud metadata endpoints
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.internal')
  ) {
    return { safe: false, reason: `Hostname ${hostname} is a cloud metadata endpoint.` };
  }

  return { safe: true };
};

// ── CORS Headers ───────────────────────────────────────────────────────────────

export const setCorsHeaders = (res, origin = '*') => {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');
};

