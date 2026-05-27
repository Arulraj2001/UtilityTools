# QuickUtils Conversion Service

This service powers the production PDF to Word and Word to PDF tools. It is intentionally separate from the Vite frontend so LibreOffice, Python, Poppler, Ghostscript, and OCR tools never enter the browser bundle.

## Endpoints

- `POST /api/convert/pdf-to-word`
- `POST /api/convert/word-to-pdf`
- `GET /api/convert/status/:jobId`
- `GET /api/convert/download/:jobId?token=...`
- `GET /api/convert/health`

## Engines

- PDF to Word: Python `pdf2docx` for editable DOCX output.
- Scanned PDF optional OCR: `ocrmypdf` plus Tesseract, then `pdf2docx`.
- PDF repair retry: Ghostscript.
- Word to PDF: LibreOffice headless.
- Output validation: DOCX ZIP/package checks, relationship checks, optional LibreOffice open test, and PDF header/package checks.

## Run Locally

Install system tools first:

```bash
sudo apt-get update
sudo apt-get install -y libreoffice poppler-utils ghostscript python3 python3-pip tesseract-ocr ocrmypdf
python3 -m pip install pdf2docx
npm install
npm run conversion:server
```

For Windows development, run the Docker image or install LibreOffice, Python, Poppler, Ghostscript, and Tesseract separately and set the command environment variables.

## Environment Variables

- `CONVERSION_PORT` default `8787`
- `CONVERSION_PUBLIC_BASE_URL` optional external URL used in download links
- `CONVERSION_TEMP_DIR` default `.tmp/conversions`
- `CONVERSION_MAX_UPLOAD_MB` default `100`
- `CONVERSION_MAX_PAGES` default `300`
- `CONVERSION_FILE_TTL_MINUTES` default `60`
- `CONVERSION_WORKER_CONCURRENCY` default `1`
- `CONVERSION_TIMEOUT_SECONDS` default `120`
- `CONVERSION_OCR_ENABLED` default `false`
- `CONVERSION_VALIDATE_WITH_LIBREOFFICE` default `true`
- `CONVERSION_CORS_ORIGIN` default `*`
- `CLAMAV_SCAN_COMMAND` optional virus scanning command, for example `clamscan --no-summary`
- `PYTHON_COMMAND` default `python3`
- `LIBREOFFICE_COMMAND` default `soffice`
- `PDFINFO_COMMAND` default `pdfinfo`
- `PDFTOTEXT_COMMAND` default `pdftotext`
- `GHOSTSCRIPT_COMMAND` default `gs`
- `OCRMYPDF_COMMAND` default `ocrmypdf`

Frontend:

- `VITE_CONVERSION_API_BASE` should point to this service if it is not reverse-proxied under the same origin.
- `VITE_CONVERSION_OCR_AVAILABLE=true` shows the OCR mode in the PDF to Word UI.

## Deployment Note

For production, place this service behind the same domain path `/api/convert/*` through a reverse proxy, or set `VITE_CONVERSION_API_BASE` to the conversion service origin. Do not deploy LibreOffice conversion inside the static Vite frontend.
