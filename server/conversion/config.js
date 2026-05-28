import path from 'node:path';

const MB = 1024 * 1024;

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.CONVERSION_PORT, 8787),
  publicBaseUrl: (process.env.CONVERSION_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  tempDir: path.resolve(process.env.CONVERSION_TEMP_DIR || '.tmp/conversions'),
  maxUploadBytes: parseNumber(process.env.CONVERSION_MAX_UPLOAD_MB, 100) * MB,
  fileTtlMs: parseNumber(process.env.CONVERSION_FILE_TTL_MINUTES, 60) * 60 * 1000,
  cleanupIntervalMs: parseNumber(process.env.CONVERSION_CLEANUP_INTERVAL_MINUTES, 10) * 60 * 1000,
  conversionTimeoutMs: parseNumber(process.env.CONVERSION_TIMEOUT_SECONDS, 120) * 1000,
  workerConcurrency: parseNumber(process.env.CONVERSION_WORKER_CONCURRENCY, 1),
  corsOrigin: process.env.CONVERSION_CORS_ORIGIN || '*',
  clamavScanCommand: process.env.CLAMAV_SCAN_COMMAND || '',
  libreOfficeCommand: process.env.LIBREOFFICE_COMMAND || 'soffice',
  cloudApiUrl: process.env.CONVERSION_CLOUD_API_URL || '',
  cloudApiKey: process.env.CONVERSION_CLOUD_API_KEY || '',
};

export const statusStages = {
  queued: 'Queued',
  validating: 'Validating file',
  converting: 'Converting',
  validatingOutput: 'Validating output',
  completed: 'Ready to download',
  failed: 'Failed',
};
