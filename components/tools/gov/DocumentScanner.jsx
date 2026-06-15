import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import DropZone from './shared/DropZone';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { DownloadButton } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { cn } from '@/lib/utils';
import { blobToDataUrl, canvasToBlob } from '@/lib/fileProcessing';

const SCAN_MODES = [
  { id: 'document', label: 'Document', desc: 'High contrast, sharp text', contrast: 1.6, brightness: 1.1, saturate: 0 },
  { id: 'photo', label: 'Photo', desc: 'Natural colors', contrast: 1.2, brightness: 1.0, saturate: 1 },
  { id: 'bw', label: 'Black & White', desc: 'Grayscale, minimal size', contrast: 1.8, brightness: 1.05, saturate: 0 },
  { id: 'enhance', label: 'Enhanced', desc: 'Maximum clarity', contrast: 2.0, brightness: 1.15, saturate: 0 },
];

async function applyScannedEffect(file, mode, targetKB) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      // Scale to A4-like resolution
      const maxW = 1240, maxH = 1754;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale); h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply CSS-like filters via canvas (manual implementation)
      ctx.filter = `contrast(${mode.contrast}) brightness(${mode.brightness}) saturate(${mode.saturate})`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      // For BW mode — convert to grayscale
      if (mode.saturate === 0) {
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = d[i + 1] = d[i + 2] = gray;
        }
        ctx.putImageData(id, 0, 0);
      }

      const targetBytes = (targetKB || 200) * 1024;
      let lo = 0.1, hi = 0.95, best = null;
      for (let iter = 0; iter < 12; iter++) {
        const mid = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, 'image/jpeg', mid);
        if (blob.size <= targetBytes) { if (!best || blob.size > best.size) best = blob; lo = mid; } else hi = mid;
        if (hi - lo < 0.005) break;
      }
      if (!best) best = await canvasToBlob(canvas, 'image/jpeg', 0.7);
      const dataUrl = await blobToDataUrl(best);
      canvas.width = 0;
      canvas.height = 0;
      resolve({ blob: best, dataUrl, sizeBytes: best.size, width: w, height: h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function exportToPdf(dataUrl, w, h) {
  const pdfDoc = await PDFDocument.create();
  const base64 = dataUrl.split(',')[1];
  const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  let embeddedImg;
  try { embeddedImg = await pdfDoc.embedJpg(imgBytes); } catch { embeddedImg = await pdfDoc.embedPng(imgBytes); }
  const page = pdfDoc.addPage([595.28, 841.89]);
  const maxW = 555, maxH = 801;
  const aspect = w / h;
  let dw, dh;
  if (aspect > maxW / maxH) { dw = maxW; dh = maxW / aspect; } else { dh = maxH; dw = maxH * aspect; }
  page.drawImage(embeddedImg, { x: (595.28 - dw) / 2, y: (841.89 - dh) / 2, width: dw, height: dh });
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export default function DocumentScanner() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [mode, setMode] = useState(SCAN_MODES[0]);
  const [targetKB, setTargetKB] = useState(200);
  const [output, setOutput] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => { setFile(f); setOutput(null); setPdfBlob(null); const d = await loadImageFile(f); setOriginalData(d); };
  const reset = () => { setFile(null); setOriginalData(null); setOutput(null); setPdfBlob(null); };

  const handleScan = async () => {
    const result = await process(() => applyScannedEffect(file, mode, targetKB));
    if (!result) return;
    setOutput(result);
    const pdf = await exportToPdf(result.dataUrl, result.width, result.height);
    setPdfBlob(pdf);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="text-2xl">📷</div>
        <div>
          <p className="font-semibold text-sm">Document Scanner Tool</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upload a photo of your document and apply scanner-like enhancement — high contrast, shadow removal, and white background. Export as JPG or PDF.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload photo of document" sublabel="JPG, PNG, WebP — photo of certificate, marksheet, ID card" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Applying scanner enhancement..." />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Scan Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {SCAN_MODES.map(m => (
                <button key={m.id} onClick={() => { setMode(m); setOutput(null); }} className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', mode.id === m.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/30 border-border hover:border-primary/30')}>
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-muted-foreground text-[10px]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target output size: {targetKB} KB</label>
            <input type="range" min="50" max="500" value={targetKB} onChange={e => setTargetKB(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <ImagePreviewPanel original={originalData?.dataUrl} output={output} originalFile={file} onReset={reset} />

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleScan} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Scanning...' : '📷 Apply Scanner Effect'}
            </button>
          </div>
          {output && (
            <div className="flex gap-3">
              <DownloadButton blob={output.blob} filename={`scanned_${mode.id}.jpg`} label="Download JPG" />
              {pdfBlob && <DownloadButton blob={pdfBlob} filename="scanned_document.pdf" label="Download PDF" />}
            </div>
          )}
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}
