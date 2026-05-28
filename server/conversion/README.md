# QuickUtils Conversion Service

This service powers the production Word to PDF tool. It stays separate from the Vite frontend so LibreOffice never enters the browser bundle.

## Endpoints

- `POST /api/convert/word-to-pdf`
- `GET /api/convert/status/:jobId`
- `GET /api/convert/download/:jobId?token=...`
- `GET /api/convert/health`

## Engine

- Word to PDF: LibreOffice headless.
- Output validation: PDF header check plus pdf-lib parsing where possible.

## Run Locally

Install LibreOffice first:

```bash
sudo apt-get update
sudo apt-get install -y libreoffice
npm install
npm run conversion:server
```

For Windows development, run the Docker image or install LibreOffice and set `LIBREOFFICE_COMMAND` if needed.

## Environment Variables

- `CONVERSION_PORT` default `8787`
- `CONVERSION_PUBLIC_BASE_URL` optional external URL used in download links
- `CONVERSION_TEMP_DIR` default `.tmp/conversions`
- `CONVERSION_MAX_UPLOAD_MB` default `100`
- `CONVERSION_FILE_TTL_MINUTES` default `60`
- `CONVERSION_WORKER_CONCURRENCY` default `1`
- `CONVERSION_TIMEOUT_SECONDS` default `120`
- `CONVERSION_CORS_ORIGIN` default `*`
- `CLAMAV_SCAN_COMMAND` optional virus scanning command, for example `clamscan --no-summary`
- `LIBREOFFICE_COMMAND` default `soffice`

Frontend:

- `VITE_CONVERSION_API_BASE` can point to this service when it is hosted on a different origin. Leave it empty for same-origin `/api/convert/*` rewrites.

## Deployment Note

For production, place this service behind the same domain path `/api/convert/*` through a reverse proxy, or set `VITE_CONVERSION_API_BASE` to the conversion service origin. Do not deploy LibreOffice conversion inside the static Vite frontend.
