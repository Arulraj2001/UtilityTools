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
    const error = new Error('Authentication required.');
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
