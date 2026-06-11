const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value) => String(value || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const apiConfig = {
  port: parsePort(process.env.PORT || process.env.API_PORT, 3001),
  corsOrigins: parseOrigins(process.env.API_CORS_ORIGIN || process.env.CORS_ORIGIN || '*'),
  bodyLimit: process.env.API_BODY_LIMIT || '1mb',
};
