import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import DropZone from './shared/DropZone';
import { DownloadButton } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { cn } from '@/lib/utils';
import { blobToDataUrl, canvasToBlob } from '@/lib/fileProcessing';

const CROP_PRESETS = [
  { id: 'ssc', label: 'SSC', aspect: 100 / 120, note: '100×120 px' },
  { id: 'ibps', label: 'IBPS/SBI', aspect: 200 / 230, note: '200×230 px' },
  { id: 'rrb', label: 'RRB', aspect: 100 / 120, note: '100×120 px' },
  { id: 'passport', label: 'Passport', aspect: 35 / 45, note: '35×45 mm' },
  { id: 'upsc', label: 'UPSC', aspect: 200 / 240, note: '200×240 px' },
  { id: '1:1', label: 'Square', aspect: 1, note: '1:1 ratio' },
  { id: 'free', label: 'Free Crop', aspect: null, note: 'Any aspect' },
];

async function getCroppedImg(imageSrc, pixelCrop, targetMaxKB = 50) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = imageSrc; });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pixelCrop.width, pixelCrop.height);
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  const targetBytes = targetMaxKB * 1024;
  let lo = 0.01, hi = 0.99, best = null;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, 'image/jpeg', mid);
    if (blob.size <= targetBytes) { if (!best || blob.size > best.size) best = blob; lo = mid; } else hi = mid;
    if (hi - lo < 0.005) break;
  }
  if (!best) best = await canvasToBlob(canvas, 'image/jpeg', 0.7);
  const dataUrl = await blobToDataUrl(best);
  canvas.width = 0;
  canvas.height = 0;
  return { blob: best, dataUrl, sizeBytes: best.size, width: pixelCrop.width, height: pixelCrop.height };
}

export default function ExamPhotoCropper() {
  const [file, setFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState(null);
  const [preset, setPreset] = useState(CROP_PRESETS[0]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [targetKB, setTargetKB] = useState(20);
  const [output, setOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => { setFile(f); setOutput(null); const d = await loadImageFile(f); setOriginalSrc(d.dataUrl); };
  const onCropComplete = useCallback((_, area) => setCroppedArea(area), []);
  const reset = () => { setFile(null); setOriginalSrc(null); setOutput(null); };

  const handleCrop = async () => {
    const result = await process(() => getCroppedImg(originalSrc, croppedArea, targetKB));
    if (result) setOutput(result);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-2xl">✂️</div>
        <div>
          <p className="font-semibold text-sm">Exam Photo Cropper</p>
          <p className="text-xs text-muted-foreground mt-0.5">Crop your photo to exact exam aspect ratios with live preview. Supports SSC, IBPS, RRB, UPSC, and Passport presets.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload photo to crop" sublabel="JPG, PNG, WebP supported" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Cropping..." />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Crop Preset</label>
            <div className="flex flex-wrap gap-2">
              {CROP_PRESETS.map(p => (
                <button key={p.id} onClick={() => { setPreset(p); setOutput(null); }}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all', preset.id === p.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/40')}>
                  {p.label}
                  <span className="ml-1 text-[10px] opacity-70">{p.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-72 bg-muted rounded-xl overflow-hidden">
            <Cropper
              image={originalSrc}
              crop={crop}
              zoom={zoom}
              aspect={preset.aspect || undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Zoom: {zoom.toFixed(1)}x</label>
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Target size: {targetKB} KB</label>
            <input type="range" min="5" max="200" value={targetKB} onChange={e => setTargetKB(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>

          {output && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
              <div className="px-3 py-2 text-xs font-medium text-primary flex justify-between">
                <span>Cropped Result</span>
                <span>{(output.sizeBytes / 1024).toFixed(1)} KB — {output.width}×{output.height} px</span>
              </div>
              <div className="flex justify-center p-4 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)_0_0/16px_16px]">
                <img src={output.dataUrl} alt="Cropped" className="max-h-48 object-contain" />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleCrop} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Cropping...' : '✂️ Crop Photo'}
            </button>
            {output && <DownloadButton blob={output.blob} filename={`cropped_${preset.id}.jpg`} label="Download" />}
          </div>
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}
