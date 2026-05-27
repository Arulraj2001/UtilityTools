# Document Conversion Deployment

This document describes the QuickUtils PDF to Word and Word to PDF backend conversion service.

## Why the old converters failed

The previous PDF to Word tool ran only in the browser and reconstructed a DOCX with JavaScript. That approach could not provide a production-grade editable Word conversion because browser PDF libraries do not have a full PDF-to-DOCX layout engine, OCR pipeline, font resolver, table reconstruction engine, or DOCX repair/open validation. Older implementations also risked returning documents that looked usable but were not truly editable.

The previous Word to PDF tool used Mammoth plus pdf-lib. Mammoth is useful for extracting document content, but it is not a high-fidelity Word rendering engine. It can lose headers, footers, page breaks, tables, images, fonts, numbering, margins, and document layout.

## New architecture

The frontend keeps the existing QuickUtils routes:

- `/tool/pdf-to-word`
- `/tool/word-to-pdf`

Those pages now call an isolated backend service:

- `POST /api/convert/pdf-to-word`
- `POST /api/convert/word-to-pdf`
- `GET /api/convert/status/:jobId`
- `GET /api/convert/download/:jobId?token=...`
- `GET /api/convert/health`

The service validates uploads, stores temporary files, creates an async conversion job, processes the job in a worker queue, validates the output, and returns a tokenized temporary download URL.

## Conversion engines

PDF to Word:

- Text-based PDFs are inspected with Poppler `pdftotext`.
- Editable DOCX conversion uses Python `pdf2docx`.
- Failed PDF conversions retry once after Ghostscript repair.
- Scanned PDFs are rejected with a clear OCR-required message unless OCR is enabled.
- OCR mode uses `ocrmypdf` before `pdf2docx` when `CONVERSION_OCR_ENABLED=true`.
- DOCX output is validated as a ZIP package and can be opened by LibreOffice headless before completion.

Word to PDF:

- DOC and DOCX files are converted with LibreOffice headless.
- PDF output is validated by magic byte and parsed with pdf-lib where possible.
- Mammoth/pdf-lib are no longer used as the primary converter.

## Security controls

- Maximum upload size with `CONVERSION_MAX_UPLOAD_MB`.
- Allowed extensions per converter.
- MIME type checks.
- Magic-byte signature checks for PDF, DOC, and DOCX.
- Random job IDs and temporary filenames.
- No internal filesystem paths are returned to the browser.
- Tokenized download URLs.
- Temporary file TTL and cleanup interval.
- Worker timeout with process termination.
- Password-protected PDFs are rejected unless password support is added later.
- Optional antivirus hook with `CLAMAV_SCAN_COMMAND`.

## Environment variables

```bash
CONVERSION_PORT=8787
CONVERSION_PUBLIC_BASE_URL=https://quickutils.page
CONVERSION_TEMP_DIR=.tmp/conversions
CONVERSION_MAX_UPLOAD_MB=100
CONVERSION_MAX_PAGES=300
CONVERSION_FILE_TTL_MINUTES=60
CONVERSION_CLEANUP_INTERVAL_MINUTES=10
CONVERSION_TIMEOUT_SECONDS=120
CONVERSION_WORKER_CONCURRENCY=1
CONVERSION_OCR_ENABLED=false
CONVERSION_VALIDATE_WITH_LIBREOFFICE=true
CONVERSION_CORS_ORIGIN=https://quickutils.page
CLAMAV_SCAN_COMMAND=
PYTHON_COMMAND=python3
LIBREOFFICE_COMMAND=soffice
PDFINFO_COMMAND=pdfinfo
PDFTOTEXT_COMMAND=pdftotext
GHOSTSCRIPT_COMMAND=gs
OCRMYPDF_COMMAND=ocrmypdf
VITE_CONVERSION_API_BASE=
VITE_CONVERSION_OCR_AVAILABLE=false
```

Use `VITE_CONVERSION_API_BASE` only when the conversion service is hosted on a different origin. For same-origin deployment, leave it blank and reverse-proxy `/api/convert/*` to the conversion service.

## Docker deployment

Build the worker/API image:

```bash
docker build -f Dockerfile.conversion -t quickutils-conversion .
```

Run locally:

```bash
docker run --rm -p 8787:8787 \
  -e CONVERSION_CORS_ORIGIN=http://localhost:5173 \
  -e CONVERSION_PUBLIC_BASE_URL=http://localhost:8787 \
  quickutils-conversion
```

Or with Docker Compose:

```bash
docker compose -f docker-compose.conversion.yml up --build
```

Production recommendation:

- Put the conversion service behind the same HTTPS domain as QuickUtils.
- Proxy `/api/convert/*` to port `8787`.
- Mount a fast temporary disk for `CONVERSION_TEMP_DIR`.
- Set worker CPU and memory limits in Docker/Kubernetes.
- Keep `CONVERSION_WORKER_CONCURRENCY` low until real load testing is complete.
- Add ClamAV or a managed malware scanning hook before public launch.

## Queue and status flow

1. Browser uploads a file to the converter endpoint.
2. API validates extension, MIME, file signature, and size.
3. API writes the upload to a random temporary job folder.
4. API creates an in-memory async job and immediately returns `202`.
5. Frontend polls `/api/convert/status/:jobId`.
6. Worker updates stages: validating, inspecting, converting, repairing, OCR, validating output, completed or failed.
7. Completed jobs expose a tokenized download URL.
8. Expired jobs and files are cleaned automatically.

## Limitations

- The included queue is process-local. For multi-instance production, replace it with Redis/BullMQ or another durable queue before horizontal scaling.
- The minimal multipart parser buffers each upload up to the configured size limit. For very high traffic, replace it with a streaming upload parser and object storage adapter.
- `pdf2docx` is good for many text-based PDFs but will not match Adobe-level fidelity for every complex document.
- OCR is disabled by default and requires `ocrmypdf`, Tesseract language data, and `CONVERSION_OCR_ENABLED=true`.
- Image-based Word fallback is intentionally not enabled because non-editable output must be clearly separated from editable conversion.
- Password-protected PDFs are rejected.
- DOCX validation can run LibreOffice open tests, but final human QA is still needed for complex legal, academic, or designed documents.
