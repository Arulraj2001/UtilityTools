import fs from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { publicError } from './security.js';

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
