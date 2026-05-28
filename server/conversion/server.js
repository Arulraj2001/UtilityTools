import http from 'node:http';
import path from 'node:path';

import { config } from './config.js';
import { logger } from './logger.js';
import { parseMultipartRequest } from './multipart.js';
import { assertSafeUpload, publicError, runVirusScan } from './security.js';
import { createJobPaths, ensureStorage, openDownloadStream, statFile, writeJobInput } from './storage.js';
import { addJob, cleanupQueue, getJob, publicJob } from './queue.js';

await ensureStorage();
setInterval(() => {
  cleanupQueue().catch((error) => logger.warn('Cleanup failed', { error: error.message }));
}, config.cleanupIntervalMs).unref();

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'POST' && url.pathname === '/api/convert/word-to-pdf') {
      await handleCreateJob(req, res, 'word-to-pdf', 'pdf');
      return;
    }

    const statusMatch = /^\/api\/convert\/status\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && statusMatch) {
      const job = getJob(statusMatch[1]);
      if (!job) throw publicError('Conversion job was not found or has expired.', 'JOB_NOT_FOUND', 404);
      sendJson(res, 200, publicJob(job, getRequestBase(req)));
      return;
    }

    const downloadMatch = /^\/api\/convert\/download\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && downloadMatch) {
      await handleDownload(req, res, downloadMatch[1], url.searchParams.get('token'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/convert/health') {
      sendJson(res, 200, {
        ok: true,
        engines: {
          wordToPdf: 'local_libreoffice',
        },
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.status || 500;
    const message = error.publicMessage || 'Unexpected conversion service error.';
    logger.error('Request failed', { status, message: error.message, path: req.url });
    sendJson(res, status, {
      error: {
        code: error.publicCode || 'SERVER_ERROR',
        message,
      },
    });
  }
});

server.listen(config.port, () => {
  logger.info('Conversion service listening', {
    port: config.port,
    tempDir: config.tempDir,
    maxUploadBytes: config.maxUploadBytes,
  });
});

async function handleCreateJob(req, res, conversionType, outputExtension) {
  const { fields, file } = await parseMultipartRequest(req);
  assertSafeUpload({ conversionType, file });

  const jobPaths = createJobPaths(file.filename, outputExtension);
  await writeJobInput(jobPaths, file.buffer);
  await runVirusScan(jobPaths.inputPath);

  const now = new Date().toISOString();
  const job = {
    id: jobPaths.jobId,
    conversionType,
    mode: fields.mode || 'standard',
    status: 'queued',
    stage: 'queued',
    progress: 5,
    attempts: 0,
    originalName: file.filename,
    inputMime: file.contentType,
    inputSize: file.buffer.length,
    inputPath: jobPaths.inputPath,
    outputPath: jobPaths.outputPath,
    outputName: jobPaths.outputName,
    jobDir: jobPaths.jobDir,
    downloadToken: jobPaths.token,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + config.fileTtlMs).toISOString(),
  };

  addJob(job);
  sendJson(res, 202, publicJob(job, getRequestBase(req)));
}

async function handleDownload(req, res, jobId, token) {
  const job = getJob(jobId);
  if (!job) throw publicError('Conversion job was not found or has expired.', 'JOB_NOT_FOUND', 404);
  if (job.status !== 'completed') throw publicError('Conversion output is not ready yet.', 'NOT_READY', 409);
  if (!token || token !== job.downloadToken) throw publicError('Invalid or expired download token.', 'BAD_DOWNLOAD_TOKEN', 403);

  const stat = await statFile(job.outputPath);
  if (!stat) throw publicError('Converted file has expired.', 'OUTPUT_EXPIRED', 404);

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${path.basename(job.outputName).replace(/"/g, '')}"`,
    'Cache-Control': 'private, no-store',
  });
  openDownloadStream(job.outputPath).pipe(res);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function setCors(res) {
  const origins = config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  // If wildcard or single origin, use directly
  if (origins.length === 1) {
    res.setHeader('Access-Control-Allow-Origin', origins[0]);
  } else {
    // Multiple origins: reflect the request origin if it's allowed, otherwise fallback to first
    const reqOrigin = res.req?.headers?.origin || '';
    const allowed = origins.find((o) => o === reqOrigin || o === '*' || (o.includes('*') && reqOrigin.match(new RegExp('^' + o.replace(/\*/g, '.*') + '$'))));
    res.setHeader('Access-Control-Allow-Origin', allowed || origins[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function getRequestBase(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}
