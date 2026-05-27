import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { config } from './config.js';
import { runCommand } from './command.js';
import { publicError } from './security.js';

export async function validateDocxPackage(filePath, {
  runLibreOfficeOpenTest = config.validateWithLibreOffice,
  workDir = path.dirname(filePath),
} = {}) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 1024) {
    throw publicError('Generated Word file is empty or incomplete.', 'BROKEN_DOCX');
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw publicError('Generated Word file is not a valid DOCX package.', 'BROKEN_DOCX');
  }

  const required = [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
  ];

  for (const name of required) {
    if (!zip.file(name)) {
      throw publicError(`Generated Word file is missing ${name}.`, 'BROKEN_DOCX');
    }
  }

  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/') && !zip.files[name].dir);
  const rels = zip.file('word/_rels/document.xml.rels');
  if (mediaFiles.length > 0 && !rels) {
    throw publicError('Generated Word file has media but no document relationships.', 'BROKEN_DOCX');
  }

  if (rels) {
    const relXml = await rels.async('string');
    const targets = [...relXml.matchAll(/Target="([^"]+)"/g)].map((match) => match[1]);
    for (const target of targets) {
      if (/^https?:\/\//i.test(target)) {
        throw publicError('Generated Word file contains external image links.', 'BROKEN_DOCX');
      }
      if (target.startsWith('media/')) {
        const mediaPath = `word/${target}`;
        if (!zip.file(mediaPath)) {
          throw publicError(`Generated Word file references missing media: ${mediaPath}.`, 'BROKEN_DOCX');
        }
      }
    }
  }

  if (runLibreOfficeOpenTest) {
    const validationDir = path.join(workDir, 'docx-open-test');
    await fs.mkdir(validationDir, { recursive: true });
    await runCommand(config.libreOfficeCommand, [
      '--headless',
      '--nologo',
      '--nodefault',
      '--nofirststartwizard',
      '--convert-to',
      'pdf',
      '--outdir',
      validationDir,
      filePath,
    ], { timeoutMs: Math.min(config.conversionTimeoutMs, 60000) });
  }

  return {
    valid: true,
    size: buffer.length,
    mediaCount: mediaFiles.length,
  };
}

export async function validatePdfFile(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    if (header.toString() !== '%PDF-') {
      throw publicError('Generated PDF is not a valid PDF file.', 'BROKEN_PDF');
    }
  } finally {
    await handle.close();
  }

  const buffer = await fs.readFile(filePath);
  if (buffer.length < 1024) {
    throw publicError('Generated PDF is empty or incomplete.', 'BROKEN_PDF');
  }

  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return {
      valid: true,
      size: buffer.length,
      pages: doc.getPageCount(),
    };
  } catch {
    return {
      valid: true,
      size: buffer.length,
      pages: null,
    };
  }
}

export async function validateInputPageCount(filePath) {
  try {
    const { stdout } = await runCommand(config.pdfInfoCommand, [filePath], {
      timeoutMs: 30000,
    });
    const pagesMatch = /Pages:\s+(\d+)/i.exec(stdout);
    const encrypted = /Encrypted:\s+yes/i.test(stdout);
    const pages = pagesMatch ? Number(pagesMatch[1]) : null;

    if (encrypted) {
      throw publicError('This PDF is password protected. Password-protected PDF conversion is not supported yet.', 'ENCRYPTED_PDF');
    }

    if (pages && pages > config.maxPages) {
      throw publicError(`This PDF has ${pages} pages. Maximum supported pages: ${config.maxPages}.`, 'TOO_MANY_PAGES');
    }

    return { pages, encrypted: false };
  } catch (error) {
    if (error.publicCode) throw error;
    return { pages: null, encrypted: false, warning: error.message };
  }
}
