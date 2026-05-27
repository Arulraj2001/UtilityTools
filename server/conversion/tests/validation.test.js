import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { parseMultipartBody } from '../multipart.js';
import { assertSafeUpload } from '../security.js';
import { validateDocxPackage, validatePdfFile } from '../validation.js';

test('validateDocxPackage accepts a minimal valid DOCX package', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'conversion-docx-'));
  const filePath = path.join(dir, 'valid.docx');
  await fs.writeFile(filePath, await createDocxBuffer());

  const result = await validateDocxPackage(filePath, {
    runLibreOfficeOpenTest: false,
    workDir: dir,
  });

  assert.equal(result.valid, true);
  assert.equal(result.mediaCount, 0);
});

test('validateDocxPackage rejects missing DOCX core files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'conversion-bad-docx-'));
  const filePath = path.join(dir, 'broken.docx');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types />');
  zip.file('padding.txt', 'padding-'.repeat(300));
  await fs.writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer' }));

  await assert.rejects(
    () => validateDocxPackage(filePath, { runLibreOfficeOpenTest: false, workDir: dir }),
    /missing _rels\/.rels/,
  );
});

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

test('assertSafeUpload validates extension, MIME and magic bytes', () => {
  assert.doesNotThrow(() => assertSafeUpload({
    conversionType: 'pdf-to-word',
    file: {
      filename: 'sample.pdf',
      contentType: 'application/pdf',
      buffer: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(64)]),
    },
  }));

  assert.throws(() => assertSafeUpload({
    conversionType: 'pdf-to-word',
    file: {
      filename: 'sample.pdf',
      contentType: 'application/pdf',
      buffer: Buffer.from('not a pdf'),
    },
  }), /valid PDF/);
});

test('parseMultipartBody extracts fields and uploaded file', () => {
  const boundary = 'quickutils-boundary';
  const body = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="mode"',
    '',
    'editable',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="sample.pdf"',
    'Content-Type: application/pdf',
    '',
    '%PDF-1.7',
    `--${boundary}--`,
    '',
  ].join('\r\n'));

  const parsed = parseMultipartBody(body, boundary);
  assert.equal(parsed.fields.mode, 'editable');
  assert.equal(parsed.file.filename, 'sample.pdf');
  assert.equal(parsed.file.contentType, 'application/pdf');
  assert.equal(parsed.file.buffer.toString(), '%PDF-1.7');
});

async function createDocxBuffer() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Hello QuickUtils</w:t></w:r></w:p></w:body>
</w:document>`);
  zip.file('word/styles.xml', 'style-data-'.repeat(300));
  return zip.generateAsync({ type: 'nodebuffer' });
}
