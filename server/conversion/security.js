import path from 'node:path';
import { config } from './config.js';
import { runCommand } from './command.js';

const signatures = {
  doc: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
};

const allowed = {
  'word-to-pdf': {
    extensions: ['.docx', '.doc'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
      'application/zip',
    ],
  },
};

export function assertSafeUpload({ conversionType, file }) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw publicError('No uploaded file was received.', 'NO_FILE');
  }

  if (file.buffer.length === 0) {
    throw publicError('The uploaded file is empty.', 'EMPTY_FILE');
  }

  if (file.buffer.length > config.maxUploadBytes) {
    throw publicError(`File is too large. Maximum size is ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`, 'FILE_TOO_LARGE');
  }

  const rules = allowed[conversionType];
  if (!rules) {
    throw publicError('Unsupported conversion type.', 'UNSUPPORTED_CONVERSION');
  }

  const extension = path.extname(file.filename || '').toLowerCase();
  if (!rules.extensions.includes(extension)) {
    throw publicError(`Unsupported file extension. Allowed: ${rules.extensions.join(', ')}`, 'UNSUPPORTED_EXTENSION');
  }

  const mime = String(file.contentType || '').toLowerCase();
  if (mime && !rules.mimeTypes.includes(mime)) {
    throw publicError('The uploaded file type does not match this converter.', 'UNSUPPORTED_MIME');
  }

  if (conversionType === 'word-to-pdf') {
    const isDocx = file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const isDoc = file.buffer.subarray(0, signatures.doc.length).equals(signatures.doc);
    if (!isDocx && !isDoc) {
      throw publicError('This file does not look like a valid Word document.', 'BAD_SIGNATURE');
    }
  }
}

export async function runVirusScan(filePath) {
  if (!config.clamavScanCommand) return { skipped: true };

  const [command, ...args] = splitCommand(config.clamavScanCommand);
  await runCommand(command, [...args, filePath], {
    timeoutMs: Math.min(config.conversionTimeoutMs, 60000),
  });
  return { skipped: false };
}

export function publicError(message, code = 'CONVERSION_ERROR', status = 400) {
  const error = new Error(message);
  error.publicMessage = message;
  error.publicCode = code;
  error.status = status;
  return error;
}

function splitCommand(value) {
  return String(value).match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, '')) || [];
}
