import { config } from './config.js';
import { publicError } from './security.js';

export async function readRequestBuffer(req, limit = config.maxUploadBytes + 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) {
      throw publicError('Upload is too large.', 'UPLOAD_TOO_LARGE', 413);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function parseMultipartRequest(req) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    throw publicError('Expected multipart form data.', 'BAD_MULTIPART');
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const body = await readRequestBuffer(req);
  return parseMultipartBody(body, boundary);
}

export function parseMultipartBody(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  let file = null;

  let offset = 0;
  while (offset < body.length) {
    const start = body.indexOf(delimiter, offset);
    if (start === -1) break;
    const partStart = start + delimiter.length;
    if (body.subarray(partStart, partStart + 2).toString() === '--') break;

    const headerStart = body.subarray(partStart, partStart + 2).toString() === '\r\n'
      ? partStart + 2
      : partStart;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const next = body.indexOf(delimiter, headerEnd + 4);
    if (next === -1) break;

    const headersText = body.subarray(headerStart, headerEnd).toString('utf8');
    let content = body.subarray(headerEnd + 4, next);
    if (content.subarray(content.length - 2).toString() === '\r\n') {
      content = content.subarray(0, content.length - 2);
    }

    const headers = parseHeaders(headersText);
    const disposition = headers['content-disposition'] || '';
    const name = getDispositionValue(disposition, 'name');
    const filename = getDispositionValue(disposition, 'filename');

    if (filename) {
      file = {
        fieldName: name || 'file',
        filename,
        contentType: headers['content-type'] || '',
        buffer: content,
      };
    } else if (name) {
      fields[name] = content.toString('utf8');
    }

    offset = next;
  }

  return { fields, file };
}

function parseHeaders(headersText) {
  return headersText.split('\r\n').reduce((acc, line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return acc;
    acc[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    return acc;
  }, {});
}

function getDispositionValue(disposition, key) {
  const match = new RegExp(`${key}="([^"]*)"`, 'i').exec(disposition);
  return match ? match[1] : '';
}
