import React, { useState } from 'react';
import DropZone from './shared/DropZone';
import PresetSelector from './shared/PresetSelector';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { SizeComparison, DownloadButton, StatChip } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { EXAM_PRESETS } from './shared/ExamPresets';
import { loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { blobToDataUrl, canvasToBlob } from '@/lib/fileProcessing';

async function processBankSignature({ file, targetWidth, targetHeight, targetMaxKB, enhance = true }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      if (enhance) {
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum < 180) {
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
          } else {
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const targetBytes = targetMaxKB * 1024;
      let lo = 0.01;
      let hi = 0.99;
      let best = null;

      for (let iter = 0; iter < 14; iter++) {
        const mid = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, 'image/jpeg', mid);
        if (blob.size <= targetBytes) {
          if (!best || blob.size > best.size) best = blob;
          lo = mid;
        } else {
          hi = mid;
        }
        if (hi - lo < 0.005) break;
      }

      if (!best) best = await canvasToBlob(canvas, 'image/jpeg', 0.5);
      const dataUrl = await blobToDataUrl(best);
      canvas.width = 0;
      canvas.height = 0;
      resolve({ blob: best, dataUrl, width: targetWidth, height: targetHeight, sizeBytes: best.size });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export default function BankSignatureResizer() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [preset, setPreset] = useState(EXAM_PRESETS.bankSignature[0]);
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customKB, setCustomKB] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [output, setOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => {
    setFile(f);
    setOutput(null);
    const d = await loadImageFile(f);
    setOriginalData(d);
  };

  const handleProcess = async () => {
    const w = preset.id === 'custom' ? parseInt(customW) : preset.width;
    const h = preset.id === 'custom' ? parseInt(customH) : preset.height;
    const kb = preset.id === 'custom' ? parseFloat(customKB) : preset.maxKB;
    const result = await process(() => processBankSignature({ file, targetWidth: w, targetHeight: h, targetMaxKB: kb, enhance }));
    if (result) setOutput(result);
  };

  const reset = () => {
    setFile(null);
    setOriginalData(null);
    setOutput(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-2xl">🏦✍️</div>
        <div>
          <p className="font-semibold text-sm">Bank Signature Resizer</p>
          <p className="text-xs text-muted-foreground mt-0.5">Resize scanned signatures for bank and government exam forms with a clean white background and exact dimensions.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload your signature image" sublabel="JPG, PNG, WebP supported — white background preferred" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Preparing signature for bank submission..." />
          <PresetSelector presets={EXAM_PRESETS.bankSignature} value={preset} onChange={(p) => { setPreset(p); setOutput(null); }} />

          {preset.id === 'custom' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Width (px)</label>
                <input type="number" value={customW} onChange={(e) => setCustomW(e.target.value)} placeholder="140" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Height (px)</label>
                <input type="number" value={customH} onChange={(e) => setCustomH(e.target.value)} placeholder="60" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max KB</label>
                <input type="number" value={customKB} onChange={(e) => setCustomKB(e.target.value)} placeholder="20" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
          )}

          {preset.id !== 'custom' && (
            <div className="grid grid-cols-3 gap-2">
              <StatChip label="Width" value={`${preset.width} px`} />
              <StatChip label="Height" value={`${preset.height} px`} />
              <StatChip label="Max Size" value={`${preset.maxKB} KB`} />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
            <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="rounded" />
            <span className="font-medium">Enhance signature contrast</span>
            <span className="text-muted-foreground text-xs">(dark ink, clean white background)</span>
          </label>

          <ImagePreviewPanel original={originalData?.dataUrl} output={output} originalFile={file} onReset={reset} />
          {output && <SizeComparison originalBytes={file.size} outputBytes={output.sizeBytes} targetKB={preset.id !== 'custom' ? preset.maxKB : parseFloat(customKB)} />}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Processing...' : '✍️ Resize Signature'}
            </button>
            {output && <DownloadButton blob={output.blob} filename={`bank_signature_${preset.id}.jpg`} label="Download" />}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Best practice</p>
            <p>Use a clear scan or photo with good lighting. The output is optimized for official uploads, but always verify the final dimensions and file size against the latest notification.</p>
          </div>

          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}
