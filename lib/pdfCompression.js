import { PDFDocument } from 'pdf-lib';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData, yieldToMainThread } from '@/lib/fileProcessing';

const MAX_CANVAS_PIXELS = 60_000_000;

function toGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = g;
  }
}

async function loadPdfJsDocument(pdfData) {
  const pdfjsLib = await getPdfJsLib();
  return pdfjsLib.getDocument({ data: clonePdfData(pdfData) }).promise;
}

async function renderPageAsJpeg(page, { scale, quality, grayscale }) {
  let viewport = page.getViewport({ scale });
  const pixels = viewport.width * viewport.height;
  if (pixels > MAX_CANVAS_PIXELS) {
    const safeScale = scale * Math.sqrt(MAX_CANVAS_PIXELS / pixels);
    viewport = page.getViewport({ scale: safeScale });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));

  const ctx = canvas.getContext('2d', { willReadFrequently: Boolean(grayscale) });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;

  if (grayscale) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    toGrayscale(imageData.data);
    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, width, height };
}

async function buildRasterPdf(pdfJsDoc, settings, onProgress) {
  const outDoc = await PDFDocument.create();
  const totalPages = pdfJsDoc.numPages;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    onProgress?.(`Processing page ${pageNumber}/${totalPages}...`);
    const page = await pdfJsDoc.getPage(pageNumber);
    const { bytes, width, height } = await renderPageAsJpeg(page, settings);
    page.cleanup?.();
    const img = await outDoc.embedJpg(bytes);
    const pdfPage = outDoc.addPage([width, height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width, height });

    if (pageNumber % 2 === 0) await yieldToMainThread();
  }

  outDoc.setTitle('');
  outDoc.setAuthor('');
  outDoc.setSubject('');
  outDoc.setKeywords([]);
  outDoc.setCreator('');
  outDoc.setProducer('');

  const bytes = await outDoc.save({ useObjectStreams: true, addDefaultPage: false });
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function recompressPdfData(pdfData, options = {}) {
  const {
    quality = 0.65,
    scale = 1,
    grayscale = false,
    targetKB = null,
    minQuality = 0.2,
    maxIterations = 8,
    onProgress,
  } = options;

  const sourceData = clonePdfData(pdfData);
  const pdfJsDoc = await loadPdfJsDocument(sourceData);

  if (!targetKB) {
    const blob = await buildRasterPdf(pdfJsDoc, { quality, scale, grayscale }, onProgress);
    return { blob, quality, scale, pageCount: pdfJsDoc.numPages, withinTarget: true };
  }

  const targetBytes = targetKB * 1024;
  let lo = minQuality;
  let hi = quality;
  let best = null;
  let smallest = null;

  for (let iter = 0; iter < maxIterations; iter++) {
    const q = (lo + hi) / 2;
    onProgress?.(`Optimizing quality ${Math.round(q * 100)}% (${iter + 1}/${maxIterations})...`);
    const blob = await buildRasterPdf(pdfJsDoc, { quality: q, scale, grayscale }, onProgress);
    const attempt = { blob, quality: q, scale, pageCount: pdfJsDoc.numPages, withinTarget: blob.size <= targetBytes };

    if (!smallest || blob.size < smallest.blob.size) smallest = attempt;

    if (blob.size <= targetBytes) {
      best = attempt;
      lo = q;
    } else {
      hi = q;
    }

    if (hi - lo < 0.015) break;
  }

  return best || smallest;
}

export async function recompressPdfFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  return recompressPdfData(buffer, options);
}
