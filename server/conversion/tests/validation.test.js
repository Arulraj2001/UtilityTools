import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseMultipartBody } from '../multipart.js';
import { assertSafeUpload } from '../security.js';
import { validatePdfFile } from '../validation.js';

test('validatePdfFile accepts a PDF-like output with a valid header', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'conversion-pdf-'));
  const filePath = path.join(dir, 'output.pdf');
  const fakePdf = Buffer.concat([
    Buffer.from('%PDF-1.7\n'),
    Buffer.alloc(2048, 0x20),
    Buffer.from('\n%%EOF'),
  ]);
  await fs.writeFile(filePath, fakePdf);

  const result = await validatePdfFile(filePath);
  assert.equal(result.valid, true);
  assert.equal(result.size, fakePdf.length);
});

test('assertSafeUpload validates Word extension, MIME and magic bytes', () => {
  assert.doesNotThrow(() => assertSafeUpload({
    conversionType: 'word-to-pdf',
    file: {
      filename: 'sample.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]),
    },
  }));

  assert.throws(() => assertSafeUpload({
    conversionType: 'word-to-pdf',
    file: {
      filename: 'sample.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('not a word file'),
    },
  }), /valid Word document/);
});

test('parseMultipartBody extracts fields and uploaded file', () => {
  const boundary = 'quickutils-boundary';
  const body = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="mode"',
    '',
    'editable',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="sample.docx"',
    'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '',
    'PK\u0003\u0004',
    `--${boundary}--`,
    '',
  ].join('\r\n'));

  const parsed = parseMultipartBody(body, boundary);
  assert.equal(parsed.fields.mode, 'editable');
  assert.equal(parsed.file.filename, 'sample.docx');
  assert.equal(parsed.file.contentType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(parsed.file.buffer.toString(), 'PK\u0003\u0004');
});
