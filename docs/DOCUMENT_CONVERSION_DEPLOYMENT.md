# Document Conversion Deployment

This document describes the QuickUtils Word to PDF backend conversion service.

## Architecture

The frontend route `/tool/word-to-pdf` calls an isolated backend service:

- `POST /api/convert/word-to-pdf`
- `GET /api/convert/status/:jobId`
- `GET /api/convert/download/:jobId?token=...`
- `GET /api/convert/health`

The service validates uploads, stores temporary files, creates an async conversion job, processes the job in a worker queue, validates the output, and returns a tokenized temporary download URL.

## Conversion Engine

- DOC and DOCX files are converted with LibreOffice headless.
- PDF output is validated by magic byte and parsed with pdf-lib where possible.
- Mammoth/pdf-lib browser conversion is not used as the primary converter.

## Security Controls

- Maximum upload size with `CONVERSION_MAX_UPLOAD_MB`.
- Allowed extensions for DOC and DOCX.
- MIME type checks.
- Magic-byte signature checks for DOC and DOCX.
- Random job IDs and temporary filenames.
- No internal filesystem paths are returned to the browser.
- Tokenized download URLs.
- Temporary file TTL and cleanup interval.
- Worker timeout with process termination.
- Optional antivirus hook with `CLAMAV_SCAN_COMMAND`.

## Environment Variables

```bash
CONVERSION_PORT=8787
CONVERSION_PUBLIC_BASE_URL=https://quickutils.page
CONVERSION_TEMP_DIR=.tmp/conversions
CONVERSION_MAX_UPLOAD_MB=100
CONVERSION_FILE_TTL_MINUTES=60
CONVERSION_CLEANUP_INTERVAL_MINUTES=10
CONVERSION_TIMEOUT_SECONDS=120
CONVERSION_WORKER_CONCURRENCY=1
CONVERSION_CORS_ORIGIN=https://quickutils.page
CLAMAV_SCAN_COMMAND=
LIBREOFFICE_COMMAND=soffice
VITE_CONVERSION_API_BASE=
```

Use `VITE_CONVERSION_API_BASE` only when the conversion service is hosted on a different origin. For same-origin deployment, leave it blank and reverse-proxy `/api/convert/*` to the conversion service.

## Docker Deployment

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

## Queue and Status Flow

1. Browser uploads a file to the converter endpoint.
2. API validates extension, MIME, file signature, and size.
3. API writes the upload to a random temporary job folder.
4. API creates an in-memory async job and immediately returns `202`.
5. Frontend polls `/api/convert/status/:jobId`.
6. Worker updates stages: validating, converting, validating output, completed or failed.
7. Completed jobs expose a tokenized download URL.
8. Expired jobs and files are cleaned automatically.

## Limitations

- The included queue is process-local. For multi-instance production, replace it with Redis/BullMQ or another durable queue before horizontal scaling.
- The minimal multipart parser buffers each upload up to the configured size limit. For very high traffic, replace it with a streaming upload parser and object storage adapter.
- LibreOffice provides strong document conversion, but some Microsoft Word-specific features can render differently. Final human QA is still needed for complex legal, academic, or designed documents.
