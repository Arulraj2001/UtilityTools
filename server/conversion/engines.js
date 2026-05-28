import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { runCommand } from './command.js';
import { publicError } from './security.js';
import { validatePdfFile } from './validation.js';
import { logger } from './logger.js';

export async function convertWordToPdf(job, update) {
  await update({ stage: 'converting', progress: 30, engine: 'local_libreoffice' });

  const outputDir = path.dirname(job.outputPath);
  let generated;
  try {
    generated = await runLibreOfficePdfExport(job.inputPath, outputDir);
  } catch (error) {
    logger.warn('LibreOffice export failed, retrying once', {
      jobId: job.id,
      error: error.message,
    });
    await update({ stage: 'converting', progress: 58, engine: 'local_libreoffice_retry' });
    generated = await runLibreOfficePdfExport(job.inputPath, outputDir);
  }

  if (!generated) {
    throw publicError('LibreOffice did not produce a PDF output.', 'NO_OUTPUT');
  }

  if (generated !== job.outputPath) {
    await fs.rename(generated, job.outputPath);
  }

  await update({ stage: 'validatingOutput', progress: 88 });
  const validation = await validatePdfFile(job.outputPath);

  await update({
    stage: 'completed',
    progress: 100,
    outputMeta: {
      ...validation,
      engine: 'local_libreoffice',
    },
  });
}

async function runLibreOfficePdfExport(inputPath, outputDir) {
  await runCommand(config.libreOfficeCommand, [
    '--headless',
    '--nologo',
    '--nodefault',
    '--nofirststartwizard',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ], { timeoutMs: config.conversionTimeoutMs });

  return findLibreOfficePdf(outputDir, inputPath);
}

async function findLibreOfficePdf(outputDir, inputPath) {
  const base = path.basename(inputPath).replace(/\.[^.]+$/, '.pdf');
  const expected = path.join(outputDir, base);
  try {
    await fs.access(expected);
    return expected;
  } catch {
    const files = await fs.readdir(outputDir);
    const pdf = files.find((file) => file.toLowerCase().endsWith('.pdf'));
    return pdf ? path.join(outputDir, pdf) : null;
  }
}
