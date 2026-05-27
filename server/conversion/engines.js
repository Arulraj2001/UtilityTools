import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { runCommand } from './command.js';
import { publicError } from './security.js';
import { validateDocxPackage, validateInputPageCount, validatePdfFile } from './validation.js';
import { logger } from './logger.js';

export async function convertPdfToWord(job, update) {
  await update({ stage: 'inspecting', progress: 20, engine: 'local_pdf2docx' });
  const inspection = await inspectPdf(job.inputPath);

  if (inspection.pages && inspection.pages > config.maxPages) {
    throw publicError(`This PDF has ${inspection.pages} pages. Maximum supported pages: ${config.maxPages}.`, 'TOO_MANY_PAGES');
  }

  if (inspection.encrypted) {
    throw publicError('This PDF is password protected. Password-protected PDF conversion is not supported yet.', 'ENCRYPTED_PDF');
  }

  if (job.mode === 'image_based_fallback') {
    throw publicError('Image-based Word fallback is not enabled in this deployment.', 'IMAGE_FALLBACK_NOT_ENABLED');
  }

  if (!inspection.hasSelectableText) {
    if (!config.ocrEnabled) {
      throw publicError('This PDF appears to be scanned. Editable Word conversion requires OCR.', 'SCANNED_PDF_REQUIRES_OCR');
    }

    await update({ stage: 'ocr', progress: 32, engine: 'local_ocrmypdf' });
    const ocrPdfPath = path.join(job.jobDir, 'ocr-searchable.pdf');
    await runOcr(job.inputPath, ocrPdfPath);
    await runPdf2DocxWithRetry({ ...job, inputPath: ocrPdfPath }, update);
  } else {
    await runPdf2DocxWithRetry(job, update);
  }

  await update({ stage: 'validatingOutput', progress: 86 });
  const validation = await validateDocxPackage(job.outputPath, { workDir: job.jobDir });

  await update({
    stage: 'completed',
    progress: 100,
    outputMeta: {
      ...validation,
      pages: inspection.pages,
      editable: true,
      engine: job.engine || 'local_pdf2docx',
    },
  });
}

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

async function inspectPdf(filePath) {
  const pageInfo = await validateInputPageCount(filePath);
  let text = '';

  try {
    const result = await runCommand(config.pdfToTextCommand, [
      '-enc',
      'UTF-8',
      filePath,
      '-',
    ], { timeoutMs: 45000 });
    text = result.stdout || '';
  } catch (error) {
    logger.warn('pdftotext inspection failed', { error: error.message });
  }

  const normalizedTextLength = text.replace(/\s+/g, '').length;
  return {
    ...pageInfo,
    textLength: normalizedTextLength,
    hasSelectableText: normalizedTextLength >= 20,
  };
}

async function runPdf2DocxWithRetry(job, update) {
  try {
    await update({ stage: 'converting', progress: 45, engine: 'local_pdf2docx' });
    await runPdf2Docx(job.inputPath, job.outputPath);
    job.engine = 'local_pdf2docx';
    return;
  } catch (error) {
    logger.warn('pdf2docx failed, trying repaired PDF once', {
      jobId: job.id,
      error: error.message,
    });
  }

  const repairedPath = path.join(job.jobDir, 'repaired.pdf');
  await update({ stage: 'repairing', progress: 56, engine: 'ghostscript' });
  await repairPdf(job.inputPath, repairedPath);

  await update({ stage: 'converting', progress: 66, engine: 'local_pdf2docx_repaired' });
  await runPdf2Docx(repairedPath, job.outputPath);
  job.engine = 'local_pdf2docx_repaired';
}

async function runPdf2Docx(inputPath, outputPath) {
  await runCommand(config.pythonCommand, [
    '-m',
    'pdf2docx',
    'convert',
    inputPath,
    outputPath,
  ], { timeoutMs: config.conversionTimeoutMs });
}

async function repairPdf(inputPath, outputPath) {
  await runCommand(config.ghostscriptCommand, [
    '-o',
    outputPath,
    '-sDEVICE=pdfwrite',
    '-dPDFSETTINGS=/prepress',
    '-dSAFER',
    '-dNOPAUSE',
    '-dBATCH',
    inputPath,
  ], { timeoutMs: config.conversionTimeoutMs });
}

async function runOcr(inputPath, outputPath) {
  await runCommand(config.ocrMyPdfCommand, [
    '--force-ocr',
    '--optimize',
    '0',
    inputPath,
    outputPath,
  ], { timeoutMs: config.conversionTimeoutMs });
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
