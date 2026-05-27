import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { config } from './config.js';
import { logger } from './logger.js';

export async function ensureStorage() {
  await fs.mkdir(config.tempDir, { recursive: true });
}

export function safeBaseName(name = 'document') {
  const base = path.basename(String(name));
  return base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'document';
}

export function createJobPaths(originalName, outputExtension) {
  const jobId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('hex');
  const jobDir = path.join(config.tempDir, jobId);
  const inputName = `input-${safeBaseName(originalName)}`;
  const outputName = `${safeBaseName(originalName).replace(/\.[^.]+$/, '')}.${outputExtension}`;

  return {
    jobId,
    token,
    jobDir,
    inputPath: path.join(jobDir, inputName),
    outputPath: path.join(jobDir, outputName),
    outputName,
  };
}

export async function writeJobInput(jobPaths, fileBuffer) {
  await fs.mkdir(jobPaths.jobDir, { recursive: true });
  await fs.writeFile(jobPaths.inputPath, fileBuffer, { mode: 0o600 });
}

export async function statFile(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

export function openDownloadStream(filePath) {
  return createReadStream(filePath);
}

export async function removeJobFiles(job) {
  if (!job?.jobDir) return;
  await fs.rm(job.jobDir, { recursive: true, force: true });
}

export async function cleanupExpiredJobs(jobs, now = Date.now()) {
  const expired = [];

  for (const job of jobs) {
    const expiry = job.expiresAt ? new Date(job.expiresAt).getTime() : 0;
    if (expiry && expiry <= now) {
      expired.push(job);
    }
  }

  for (const job of expired) {
    try {
      await removeJobFiles(job);
      logger.info('Expired conversion files removed', { jobId: job.id });
    } catch (error) {
      logger.warn('Failed to remove expired conversion files', {
        jobId: job.id,
        error: error.message,
      });
    }
  }

  return expired.map((job) => job.id);
}
