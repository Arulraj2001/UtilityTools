import React, { useRef } from 'react';
import { Upload, Download, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData, revokeObjectUrl } from '@/lib/fileProcessing';

let pdfLibLoadPromise = null;
let jsZipLoadPromise = null;

export const loadPdfLib = () => pdfLibLoadPromise || (pdfLibLoadPromise = import('pdf-lib'));
export const loadJSZip = () => jsZipLoadPromise || (jsZipLoadPromise = import('jszip'));

export async function renderPdfPageImage(file, scale = 1.5) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await getPdfJsLib();
  const pdf = await pdfjsLib.getDocument({ data: clonePdfData(arrayBuffer) }).promise;
  const page = await pdf.getPage(1);
  let viewport = page.getViewport({ scale });
  const pixels = viewport.width * viewport.height;
  if (pixels > 40_000_000) {
    viewport = page.getViewport({ scale: scale * Math.sqrt(40_000_000 / pixels) });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
  canvas.width = 0;
  canvas.height = 0;
  return { url: URL.createObjectURL(blob), pageCount: pdf.numPages };
}

export async function imageFileToJpegBytes(file, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load ${file.name}`));
    };
    img.src = url;
  });
}

export function parsePageRanges(ranges, totalPages) {
  const indices = new Set();
  const parts = ranges.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s) - 1);
      for (let i = start; i <= end && i < totalPages; i++) {
        indices.add(i);
      }
    } else {
      const page = parseInt(part) - 1;
      if (page >= 0 && page < totalPages) indices.add(page);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export function DropZone({ onFiles, inputRef: externalRef, accept, label, sub }) {
  const localRef = useRef();
  const ref = externalRef || localRef;

  return (
    <div
      onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
      onDragOver={e => e.preventDefault()}
      onClick={() => ref.current?.click()}
      className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
        <Upload className="w-7 h-7 text-primary" />
      </div>
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
      <input ref={ref} type="file" accept={accept} multiple className="hidden" onChange={e => onFiles(e.target.files)} />
    </div>
  );
}

export function FileCard({ file, pageCount, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB${pageCount ? ` · ${pageCount} pages` : ''}
        </p>
      </div>
      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function DownloadResult({ url, filename, label }) {
  if (!url) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 premium-card panel-highlight glow-border">
          <div className="flex-1">
            <p className="font-semibold text-green-700 dark:text-green-400">Done! Your file is ready.</p>
            <p className="text-sm text-muted-foreground font-mono">{label}</p>
          </div>
          <a href={url} download={filename}>
            <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4" /> Download
            </Button>
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function StatChip({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-green-500/20' : 'bg-card border border-border/50 glow-border'}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${highlight ? 'text-green-600' : ''}`}>{value}</p>
    </div>
  );
}
