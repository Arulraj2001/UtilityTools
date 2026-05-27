import { config } from './config.js';
import { convertPdfToWord, convertWordToPdf } from './engines.js';
import { logger } from './logger.js';
import { cleanupExpiredJobs, removeJobFiles } from './storage.js';

const jobs = new Map();
const pending = [];
let active = 0;

export function addJob(job) {
  jobs.set(job.id, job);
  pending.push(job.id);
  drainQueue();
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function getJobs() {
  return [...jobs.values()];
}

export async function deleteJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return false;
  jobs.delete(jobId);
  await removeJobFiles(job);
  return true;
}

export function publicJob(job, reqBaseUrl = '') {
  if (!job) return null;
  const ready = job.status === 'completed' && job.downloadToken;
  const base = config.publicBaseUrl || reqBaseUrl;

  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    conversionType: job.conversionType,
    outputName: ready ? job.outputName : null,
    downloadUrl: ready ? `${base}/api/convert/download/${job.id}?token=${job.downloadToken}` : null,
    error: job.publicError || null,
    outputMeta: job.outputMeta || null,
    expiresAt: job.expiresAt,
  };
}

export async function cleanupQueue() {
  const expiredIds = await cleanupExpiredJobs(getJobs());
  expiredIds.forEach((id) => jobs.delete(id));
}

function drainQueue() {
  while (active < config.workerConcurrency && pending.length > 0) {
    const jobId = pending.shift();
    const job = jobs.get(jobId);
    if (!job || job.status !== 'queued') continue;
    active += 1;
    processJob(job).finally(() => {
      active -= 1;
      drainQueue();
    });
  }
}

async function processJob(job) {
  const update = async (patch) => {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  };

  try {
    await update({ status: 'processing', stage: 'validating', progress: 12 });
    logger.info('Conversion job started', {
      jobId: job.id,
      conversionType: job.conversionType,
      inputName: job.originalName,
    });

    if (job.conversionType === 'pdf-to-word') {
      await convertPdfToWord(job, update);
    } else if (job.conversionType === 'word-to-pdf') {
      await convertWordToPdf(job, update);
    } else {
      throw new Error(`Unsupported conversion type: ${job.conversionType}`);
    }

    await update({
      status: 'completed',
      stage: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.fileTtlMs).toISOString(),
    });
    logger.info('Conversion job completed', { jobId: job.id });
  } catch (error) {
    const publicMessage = error.publicMessage || 'Conversion failed. Please try another file or contact support if the issue continues.';
    await update({
      status: 'failed',
      stage: 'failed',
      progress: 100,
      publicError: {
        code: error.publicCode || 'CONVERSION_FAILED',
        message: publicMessage,
      },
      internalError: {
        message: error.message,
        stack: error.stack,
        stderr: error.stderr,
      },
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.fileTtlMs).toISOString(),
    });
    logger.error('Conversion job failed', {
      jobId: job.id,
      conversionType: job.conversionType,
      error: error.message,
      stderr: error.stderr,
    });
  }
}
