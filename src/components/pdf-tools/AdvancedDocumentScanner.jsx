/**
 * Document Scanner — CamScanner-grade image enhancement
 *
 * Processing pipeline:
 * 1. Adaptive thresholding for B&W documents
 * 2. Unsharp masking for text sharpening
 * 3. Background whitening via luminance threshold
 * 4. Shadow removal using local contrast normalization
 * 5. Target size binary-search compression
 * 6. PDF export via pdf-lib
 */
import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion } from 'framer-motion';
import { ScanLine, Settings, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { DownloadBtn, formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// ── Core image processing ────────────────────────────────────────────────────

function applyUnsharpMask(data, width, height, amount = 0.6, radius = 1) {
  // Simple approximation: subtract blurred, add back
  const blur = new Float32Array(data.length);
  const w = width, h = height;
  // Box blur (single pass)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const idx = (ny * w + nx) * 4;
            r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
          }
        }
      }
      const i = (y * w + x) * 4;
      blur[i] = r / count; blur[i + 1] = g / count; blur[i + 2] = b / count;
    }
  }
  // Apply unsharp mask: result = original + amount * (original - blur)
  for (let i = 0; i < data.length - 1; i += 4) {
    data[i]     = Math.min(255, Math.max(0, data[i]     + amount * (data[i]     - blur[i])));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount * (data[i + 1] - blur[i + 1])));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount * (data[i + 2] - blur[i + 2])));
  }
}

function applyAdaptiveThreshold(data, width, height, blockSize = 31, C = 8) {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  const half = Math.floor(blockSize / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx]; count++;
          }
        }
      }
      const threshold = sum / count - C;
      const val = gray[y * width + x] > threshold ? 255 : 0;
      const idx = (y * width + x) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = val;
    }
  }
}

function whitenBackground(data, threshold = 220) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (avg >= threshold) { data[i] = data[i + 1] = data[i + 2] = 255; }
  }
}

function removeShadows(data, width, height) {
  // Local contrast normalization: divide by local max
  const blockSize = Math.max(20, Math.floor(Math.min(width, height) / 20));
  const half = Math.floor(blockSize / 2);
  const localMax = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let dy = -half; dy <= half; dy += 2) {
        for (let dx = -half; dx <= half; dx += 2) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const idx = (ny * width + nx) * 4;
          const v = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
          if (v > maxVal) maxVal = v;
        }
      }
      localMax[y * width + x] = Math.max(maxVal, 1);
    }
  }

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const scale = Math.min(255 / localMax[i], 2.5);
    data[idx]     = Math.min(255, data[idx]     * scale);
    data[idx + 1] = Math.min(255, data[idx + 1] * scale);
    data[idx + 2] = Math.min(255, data[idx + 2] * scale);
  }
}

const SCAN_MODES = [
  {
    id: 'magic',
    label: 'Magic Scan',
    desc: 'CamScanner-style: shadow removal + whitening + unsharp',
    icon: '✨',
    process: (ctx, w, h, settings) => {
      const id = ctx.getImageData(0, 0, w, h);
      removeShadows(id.data, w, h);
      whitenBackground(id.data, 215);
      applyUnsharpMask(id.data, w, h, 0.7, 1);
      ctx.putImageData(id, 0, 0);
    },
  },
  {
    id: 'document',
    label: 'Document',
    desc: 'High contrast text — crisp black on clean white',
    icon: '📄',
    process: (ctx, w, h, settings) => {
      const id = ctx.getImageData(0, 0, w, h);
      // Grayscale
      for (let i = 0; i < id.data.length; i += 4) {
        const g = Math.round(0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2]);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = g;
      }
      removeShadows(id.data, w, h);
      applyUnsharpMask(id.data, w, h, 0.8, 1);
      whitenBackground(id.data, 210);
      ctx.putImageData(id, 0, 0);
    },
  },
  {
    id: 'bw',
    label: 'B&W',
    desc: 'Adaptive threshold — pure black & white output',
    icon: '⬛',
    process: (ctx, w, h, settings) => {
      const id = ctx.getImageData(0, 0, w, h);
      applyAdaptiveThreshold(id.data, w, h, 31, settings.bwC);
      ctx.putImageData(id, 0, 0);
    },
  },
  {
    id: 'color',
    label: 'Color Enhance',
    desc: 'Vivid color with shadow removal',
    icon: '🎨',
    process: (ctx, w, h, settings) => {
      const id = ctx.getImageData(0, 0, w, h);
      removeShadows(id.data, w, h);
      applyUnsharpMask(id.data, w, h, 0.4, 1);
      ctx.putImageData(id, 0, 0);
    },
  },
  {
    id: 'soft',
    label: 'Soft',
    desc: 'Light enhancement, preserves photos',
    icon: '🌤',
    process: (ctx, w, h, settings) => {
      const id = ctx.getImageData(0, 0, w, h);
      whitenBackground(id.data, 230);
      applyUnsharpMask(id.data, w, h, 0.3, 1);
      ctx.putImageData(id, 0, 0);
    },
  },
];

async function processImageFile(file, mode, settings) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      // Max 3508px (A4 @ 300dpi) for output quality
      const MAX = 3508;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(MAX / Math.max(w, h), settings.scaleUp ? 1.5 : 1);
      w = Math.round(w * scale); h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // CSS-level pre-filter for color/contrast
      ctx.filter = `contrast(${settings.contrast}) brightness(${settings.brightness})`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      // Pixel-level processing
      mode.process(ctx, w, h, settings);

      // Binary search for target KB
      const targetBytes = settings.targetKB * 1024;
      let lo = 0.15, hi = 0.95, best = null;
      for (let iter = 0; iter < 12; iter++) {
        const mid = (lo + hi) / 2;
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', mid));
        if (blob.size <= targetBytes) {
          best = { blob, q: mid }; lo = mid;
        } else { hi = mid; }
        if (hi - lo < 0.005) break;
      }
      if (!best) best = { blob: await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.5)), q: 0.5 };

      const reader = new FileReader();
      reader.onload = e => resolve({
        dataUrl: e.target.result, blob: best.blob, quality: best.q, w, h, size: best.blob.size,
      });
      reader.readAsDataURL(best.blob);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}

export default function AdvancedDocumentScanner() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState(SCAN_MODES[0]);
  const [settings, setSettings] = useState({ contrast: 1.15, brightness: 1.05, targetKB: 400, bwC: 8, scaleUp: false });
  const [outputs, setOutputs] = useState([]);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);

  const onDrop = useCallback((accepted) => {
    const imgs = accepted.filter(f => f.type.startsWith('image/'));
    setFiles(imgs.map(f => ({ file: f, preview: URL.createObjectURL(f), id: crypto.randomUUID() })));
    setOutputs([]); setPdfBlob(null); setCurrentIndex(0); setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic'] }, multiple: true,
  });

  const currentFile = files[currentIndex];
  const currentOutput = outputs[currentIndex];

  const scan = async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setOutputs([]);
    const results = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Scanning ${i + 1}/${files.length}: ${files[i].file.name}...`);
        const result = await processImageFile(files[i].file, mode, settings);
        results.push(result);
        setCurrentIndex(i);
      }
      setOutputs(results);
    } catch (e) { setError(e.message || 'Scan failed'); }
    finally { setProcessing(false); setProgress(''); }
  };

  const exportPDF = async () => {
    if (!outputs.length) return;
    setProcessing(true);
    try {
      setProgress('Building PDF...');
      const pdf = await PDFDocument.create();
      for (const out of outputs) {
        const base64 = out.dataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const img = await pdf.embedJpg(bytes);
        // A4 portrait proportional
        const [pw, ph] = [595.28, 841.89];
        const aspect = out.w / out.h;
        const pageAspect = pw / ph;
        let dw = pw, dh = ph;
        if (aspect > pageAspect) { dh = pw / aspect; } else { dw = ph * aspect; }
        const page = pdf.addPage([pw, ph]);
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
      }
      const bytes = await pdf.save({ useObjectStreams: true });
      setPdfBlob(new Blob([bytes], { type: 'application/pdf' }));
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); setProgress(''); }
  };

  const downloadJPG = (output, index) => {
    const a = document.createElement('a');
    a.href = output.dataUrl;
    a.download = `scanned_${mode.id}_${index + 1}.jpg`;
    a.click();
  };

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center"><ScanLine className="w-4 h-4 text-amber-600" /></div>
          <div>
            <p className="font-bold text-sm">Document Scanner</p>
            <p className="text-[10px] text-muted-foreground">CamScanner-grade enhancement · Shadow removal · Adaptive B&W · PDF export</p>
          </div>
        </div>
      </div>

      {!files.length ? (
        <div {...getRootProps()} className={cn('border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all', isDragActive ? 'border-amber-400 bg-amber-500/5 scale-[1.01]' : 'border-border hover:border-amber-400/60 hover:bg-muted/10')}>
          <input {...getInputProps()} />
          <ScanLine className="w-10 h-10 mx-auto mb-3 text-amber-500/60" />
          <p className="font-semibold">{isDragActive ? 'Drop document photos' : 'Drop document photos to scan'}</p>
          <p className="text-xs text-muted-foreground mt-1">JPG · PNG · WebP — photos of certificates, IDs, marksheets</p>
          <p className="text-xs text-primary/70 mt-2 font-medium">Multiple files supported — batch scan to PDF</p>
        </div>
      ) : (
        <div className="relative space-y-4">
          {processing && (
            <div className="absolute inset-0 rounded-2xl bg-background/92 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-sm font-medium">{progress || 'Scanning...'}</p>
                <p className="text-xs text-muted-foreground">Applying enhancement pipeline</p>
              </div>
            </div>
          )}

          {/* Before/After with nav */}
          <div className="space-y-2">
            {files.length > 1 && (
              <div className="flex items-center justify-between text-xs">
                <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-muted-foreground font-medium">Image {currentIndex + 1} of {files.length}</span>
                <button onClick={() => setCurrentIndex(i => Math.min(files.length - 1, i + 1))} disabled={currentIndex === files.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground text-center mb-1.5">Original</p>
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted/10">
                  {currentFile && <img src={currentFile.preview} alt="Original" className="w-full h-full object-contain" />}
                </div>
                {currentFile && <p className="text-[10px] text-center text-muted-foreground mt-1">{formatSize(currentFile.file.size)}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary text-center mb-1.5">Enhanced</p>
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-primary/30 bg-muted/10 relative">
                  {currentOutput ? (
                    <img src={currentOutput.dataUrl} alt="Scanned" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ScanLine className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">Preview after scan</p>
                    </div>
                  )}
                </div>
                {currentOutput && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{formatSize(currentOutput.size)}</p>
                    <button onClick={() => downloadJPG(currentOutput, currentIndex)} className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5">
                      <Download className="w-2.5 h-2.5" /> JPG
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scan modes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Scanner Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SCAN_MODES.map(m => (
                <button key={m.id} onClick={() => { setMode(m); setOutputs([]); setPdfBlob(null); }}
                  className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', mode.id === m.id ? 'bg-amber-500/10 border-amber-400/60 text-amber-700 dark:text-amber-400' : 'bg-muted/20 border-border hover:border-amber-400/40')}>
                  <div className="font-semibold">{m.icon} {m.label}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5 leading-tight">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings */}
          <div className="rounded-xl border border-border/50 bg-muted/10 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Settings className="w-3.5 h-3.5" /> Fine-tune
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>Contrast</span><span className="font-bold text-foreground">{settings.contrast}×</span>
                </label>
                <input type="range" min="0.8" max="2.2" step="0.05" value={settings.contrast} onChange={e => update('contrast', Number(e.target.value))} className="w-full accent-amber-500 h-1.5" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>Brightness</span><span className="font-bold text-foreground">{settings.brightness}×</span>
                </label>
                <input type="range" min="0.7" max="1.5" step="0.05" value={settings.brightness} onChange={e => update('brightness', Number(e.target.value))} className="w-full accent-amber-500 h-1.5" />
              </div>
            </div>
            {mode.id === 'bw' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>B&W Sensitivity</span><span className="font-bold text-foreground">{settings.bwC}</span>
                </label>
                <input type="range" min="2" max="20" value={settings.bwC} onChange={e => update('bwC', Number(e.target.value))} className="w-full accent-amber-500 h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Higher = more white background; Lower = more detail</p>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                <span>Output Size Limit</span><span className="font-bold text-foreground">{settings.targetKB} KB</span>
              </label>
              <input type="range" min="50" max="1000" step="50" value={settings.targetKB} onChange={e => update('targetKB', Number(e.target.value))} className="w-full accent-amber-500 h-1.5" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={settings.scaleUp} onChange={e => update('scaleUp', e.target.checked)} className="rounded accent-amber-500" />
              <span>Upscale small images <span className="text-muted-foreground text-xs">(1.5×)</span></span>
            </label>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          {/* Results */}
          {outputs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4 space-y-3">
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                ✓ {outputs.length} image{outputs.length > 1 ? 's' : ''} scanned — Quality: {Math.round(outputs[0].quality * 100)}%
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card rounded-xl p-2.5 text-center text-xs border border-border/50">
                  <div className="text-muted-foreground mb-0.5">Original</div>
                  <div className="font-bold">{formatSize(files.reduce((s, f) => s + f.file.size, 0))}</div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-2.5 text-center text-xs border border-green-500/20">
                  <div className="text-muted-foreground mb-0.5">Enhanced</div>
                  <div className="font-bold text-green-600">{formatSize(outputs.reduce((s, o) => s + o.size, 0))}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {outputs.length === 1 && (
                  <button onClick={() => downloadJPG(outputs[0], 0)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                    <Download className="w-4 h-4" /> Save JPG
                  </button>
                )}
                <button onClick={exportPDF} disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <ScanLine className="w-4 h-4" /> Export PDF
                </button>
              </div>
              {pdfBlob && <DownloadBtn blob={pdfBlob} filename={`scanned_document_${mode.id}.pdf`} label="Download Scanned PDF" className="w-full" />}
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={scan} disabled={processing}
              className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <ScanLine className="w-4 h-4" />
              {processing ? (progress || 'Scanning...') : `Scan ${files.length > 1 ? `${files.length} Images` : 'Document'}`}
            </button>
            <button onClick={() => { setFiles([]); setOutputs([]); setPdfBlob(null); }} className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}