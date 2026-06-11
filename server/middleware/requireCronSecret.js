import { bearerToken } from '../lib/supabase.js';

const cronSecrets = () => [
  process.env.JOB_FETCH_CRON_SECRET,
  process.env.CRON_FETCH_SECRET,
  process.env.CRON_SECRET,
]
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index);

export const validateCronSecret = (req) => {
  const secrets = cronSecrets();
  if (!secrets.length) {
    const error = new Error('Cron secret is not configured.');
    error.status = 500;
    throw error;
  }

  const headerSecret = req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'];
  const authSecret = bearerToken(req.headers.authorization || req.headers.Authorization || '');
  const providedSecret = String(headerSecret || authSecret || '').trim();

  if (!providedSecret || !secrets.includes(providedSecret)) {
    const error = new Error('Invalid cron secret.');
    error.status = 401;
    throw error;
  }
};

export const requireCronSecret = (req, res, next) => {
  try {
    validateCronSecret(req);
    next();
  } catch (error) {
    next(error);
  }
};
