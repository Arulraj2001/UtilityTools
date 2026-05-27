/**
 * PDF Size Reducer — Premium Grade Compression Engine
 *
 * Pipeline:
 * 1. PDF.js renders each page to canvas (real raster output)
 * 2. Per-page scanned-doc detection (pixel variance analysis)
 * 3. Scanned pages → unsharp mask + contrast boost before recompression
 * 4. Regular pages → standard JPEG recompression at target DPI/quality
 * 5. Grayscale / B&W conversion via ImageData manipulation
 * 6. Binary-search quality iterations to hit exact KB target
 * 7. pdf-lib reassembles into final output PDF
 * 8. Memory cleanup after each page (canvas.width=0)
 *
 * Achieves 50–95% size reduction with readable output.
 */
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minimize2, Settings, CheckCircle2, AlertTriangle, Zap,
  ScanLine, FileText, ChevronDown, ChevronUp,
  RotateCcw, Shield, Eye
} from 'lucide-react';
import PDFDropZone from './PDFDropZone';
import { SingleFileCard } from './PDFFileCard';
import { DownloadBtn, formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData } from '@/lib/fileProcessing';

// ── PDF.js loader ────────────────────────────────────────────────────────────
function loadPdfJs() {
  return Promise.resolve(getPdfJsLib());
}

// ── Image processing helpers ─────────────────────────────────────────────────

/** Detect if page is likely scanned (high pixel variance, no vector areas) */
function detectScanned(imageData, sampleSize = 2000) {
  const d = imageData.data;
  const step = Math.max(1, Math.floor(d.length / (sampleSize * 4)));
  let varSum = 0, prev = 128, count = 0;
  for (let i = 0; i < d.length; i += step * 4) {
    const gray = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114);
    varSum += Math.abs(gray - prev);
    prev = gray; count++;
  }
  const avgVariance = varSum / count;
  return avgVariance > 18; // scanned docs have more noise/variance
}

function detectScannedFromCanvas(canvas) {
  const sampleMax = 120;
  const ratio = Math.min(sampleMax / canvas.width, sampleMax / canvas.height, 1);
  const sampleW = Math.max(1, Math.round(canvas.width * ratio));
  const sampleH = Math.max(1, Math.round(canvas.height * ratio));
  const sample = document.createElement('canvas');
  sample.width = sampleW;
  sample.height = sampleH;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
  const imageData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
  sample.width = 0;
  sample.height = 0;
  return detectScanned(imageData, Math.min(2000, sampleW * sampleH));
}

/** Unsharp mask for text sharpening (scanned docs) */
function applyUnsharpMask(data, w, h, amount = 0.5) {
  const blur = new Float32Array(data.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const i = (y * w + x) * 4 + c;
        blur[i] = (
          data[(y-1)*w*4 + x*4 + c] +
          data[(y+1)*w*4 + x*4 + c] +
          data[y*w*4 + (x-1)*4 + c] +
          data[y*w*4 + (x+1)*4 + c] +
          data[i] * 4
        ) / 8;
      }
    }
  }
  for (let i = 0; i < data.length - 3; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i+c] = Math.min(255, Math.max(0,
        data[i+c] + amount * (data[i+c] - blur[i+c])
      ));
    }
  }
}

/** Background whitening — removes yellow/gray tint from scanned docs */
function whitenBackground(data, threshold = 210) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    if (avg >= threshold) { data[i] = data[i+1] = data[i+2] = 255; }
  }
}

/** Convert to grayscale */
function toGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
    data[i] = data[i+1] = data[i+2] = g;
  }
}

/** Simple contrast boost */
function boostContrast(data, factor = 1.3) {
  const intercept = 128 * (1 - factor);
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.min(255, Math.max(0, data[i]   * factor + intercept));
    data[i+1] = Math.min(255, Math.max(0, data[i+1] * factor + intercept));
    data[i+2] = Math.min(255, Math.max(0, data[i+2] * factor + intercept));
  }
}

// ── Core page renderer ───────────────────────────────────────────────────────
async function renderPage(page, scale, settings) {
  let viewport = page.getViewport({ scale });
  const pixels = viewport.width * viewport.height;
  if (pixels > 80_000_000) {
    viewport = page.getViewport({ scale: scale * Math.sqrt(80_000_000 / pixels) });
  }
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;

  const isScanned = settings.scannedMode === 'auto'
    ? detectScannedFromCanvas(canvas)
    : settings.scannedMode === 'on';

  const needsPixelProcessing =
    settings.colorMode !== 'color' ||
    (isScanned && settings.optimizeScanned);

  if (needsPixelProcessing) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    if (isScanned && settings.optimizeScanned) {
      whitenBackground(d, 205);
      boostContrast(d, 1.25);
      applyUnsharpMask(d, canvas.width, canvas.height, 0.55);
    }

    if (settings.colorMode === 'grayscale') toGrayscale(d);
    else if (settings.colorMode === 'bw') {
      toGrayscale(d);
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] > 128 ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  const mime = settings.colorMode === 'bw' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mime, settings.quality);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const w = canvas.width, h = canvas.height;
  canvas.width = 0; canvas.height = 0;
  return { bytes, w, h, mime, isScanned };
}

// ── Build compressed PDF ─────────────────────────────────────────────────────
async function buildPDF(pdfJsDoc, settings, onProgress, onPageDone) {
  const totalPages = pdfJsDoc.numPages;
  const outDoc = await PDFDocument.create();
  let scannedCount = 0;

  for (let i = 1; i <= totalPages; i++) {
    onProgress(`Processing page ${i} of ${totalPages}…`, Math.round((i / totalPages) * 90));
    const page = await pdfJsDoc.getPage(i);
    const { bytes, w, h, mime, isScanned } = await renderPage(page, settings.scale, settings);
    page.cleanup?.();
    if (isScanned) scannedCount++;

    let img;
    if (mime === 'image/png') {
      img = await outDoc.embedPng(bytes);
    } else {
      try { img = await outDoc.embedJpg(bytes); }
      catch { img = await outDoc.embedPng(bytes); }
    }

    const pdfPage = outDoc.addPage([w, h]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: w, height: h });
    if (onPageDone) onPageDone(i, totalPages);
    // Let browser breathe every 3 pages
    if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
  }

  if (settings.removeMetadata) {
    outDoc.setTitle(''); outDoc.setAuthor(''); outDoc.setSubject('');
    outDoc.setKeywords([]); outDoc.setCreator('PDF Tools'); outDoc.setProducer('PDF Tools');
  }

  onProgress('Saving output…', 95);
  const bytes = await outDoc.save({ useObjectStreams: true });
  return { blob: new Blob([bytes], { type: 'application/pdf' }), scannedCount, totalPages };
}

// ── Compression modes ────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'low',
    label: 'Low',
    icon: '🟢',
    desc: 'Minimal compression, maximum quality',
    scale: 2.78, quality: 0.90,
    badge: 'Best Quality',
    badgeColor: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: '🔵',
    desc: 'Great quality, significant size reduction',
    scale: 2.08, quality: 0.75,
    badge: 'Recommended',
    badgeColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'high',
    label: 'High',
    icon: '🟠',
    desc: 'Strong compression, readable output',
    scale: 1.5, quality: 0.58,
    badge: 'Strong',
    badgeColor: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  {
    id: 'extreme',
    label: 'Extreme',
    icon: '🔴',
    desc: 'Maximum compression, smallest file',
    scale: 1.0, quality: 0.38,
    badge: 'Smallest',
    badgeColor: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    id: 'scanned',
    label: 'Scanned Doc',
    icon: '📄',
    desc: 'Optimized for scanned certificates & IDs',
    scale: 1.8, quality: 0.65,
    badge: 'For Scans',
    badgeColor: 'text-purple-600 bg-purple-50 border-purple-200',
    scannedMode: 'on', optimizeScanned: true,
  },
];

const QUICK_TARGETS = [
  { label: '50 KB', kb: 50 },
  { label: '100 KB', kb: 100 },
  { label: '200 KB', kb: 200 },
  { label: '500 KB', kb: 500 },
  { label: '1 MB', kb: 1024 },
];

// ── Readability score ─────────────────────────────────────────────────────────
function readabilityScore(quality, scale) {
  const score = Math.round((quality * 0.6 + (scale / 4) * 0.4) * 100);
  if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Fair', color: 'text-orange-500' };
  return { label: 'Basic', color: 'text-red-500' };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdvancedPDFCompressor() {
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfData, setPdfData] = useState(null);

  const [modeId, setModeId] = useState('balanced');
  const [colorMode, setColorMode] = useState('color');  // color | grayscale | bw
  const [optimizeScanned, setOptimizeScanned] = useState(true);
  const [scannedMode, setScannedMode] = useState('auto'); // auto | on | off
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [customQuality, setCustomQuality] = useState(null); // override mode quality
  const [customScale, setCustomScale] = useState(null);     // override mode scale
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Target
  const [targetKB, setTargetKB] = useState(null);
  const [customTargetVal, setCustomTargetVal] = useState('');
  const [customTargetUnit, setCustomTargetUnit] = useState('KB');

  // Processing
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [phase, setPhase] = useState(''); // 'parsing' | 'compressing' | 'saving'

  // Results
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const abortRef = useRef(false);

  const handleFile = async (files) => {
    const f = files[0];
    setFile(f); setResult(null); setError(null); setPdfData(null); setTotalPages(0);
    try {
      const ab = await f.arrayBuffer();
      const data = new Uint8Array(ab);
      setPdfData(data);
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: clonePdfData(data) }).promise;
      setTotalPages(pdf.numPages);
    } catch { /* total pages optional */ }
  };

  const effectiveTargetKB = (() => {
    if (customTargetVal) {
      const v = parseFloat(customTargetVal);
      if (!isNaN(v) && v > 0) return customTargetUnit === 'MB' ? v * 1024 : v;
    }
    return targetKB;
  })();

  const mode = MODES.find(m => m.id === modeId) || MODES[1];
  const scale = customScale ?? mode.scale;
  const quality = customQuality ?? mode.quality;
  const readability = readabilityScore(quality, scale);
  const estimatedReduction = Math.round((1 - (quality * scale / 4)) * 100);

  const buildSettings = (q, s) => ({
    scale: s, quality: q, colorMode,
    optimizeScanned: mode.id === 'scanned' ? true : optimizeScanned,
    scannedMode: mode.id === 'scanned' ? 'on' : scannedMode,
    removeMetadata,
  });

  const compress = async () => {
    if (!pdfData || !file) return;
    setProcessing(true); setError(null); setResult(null);
    setProgressPct(0); setCurrentPage(0); abortRef.current = false;

    try {
      setPhase('parsing');
      setProgress('Loading PDF…');
      const pdfjsLib = await loadPdfJs();
      const pdfJsDoc = await pdfjsLib.getDocument({ data: clonePdfData(pdfData) }).promise;

      const onProgress = (msg, pct) => { setProgress(msg); setProgressPct(pct); };
      const onPageDone = (pg) => setCurrentPage(pg);

      if (effectiveTargetKB) {
        setPhase('compressing');
        // Binary-search quality to hit target
        let lo = 0.20, hi = quality, best = null;
        let bestBig = null; // best attempt if target never reached
        const maxIter = 9;

        for (let iter = 0; iter < maxIter && !abortRef.current; iter++) {
          const mid = parseFloat(((lo + hi) / 2).toFixed(3));
          const scaleAdj = iter < 3 ? scale : Math.max(0.8, scale - iter * 0.15);
          setProgress(`Pass ${iter + 1}/${maxIter} — quality ${Math.round(mid * 100)}%, ${Math.round(scaleAdj * 72)} DPI…`);

          const { blob, scannedCount, totalPages: tp } = await buildPDF(
            pdfJsDoc, buildSettings(mid, scaleAdj), onProgress, onPageDone
          );
          setProgressPct(Math.round(((iter + 1) / maxIter) * 88));

          if (blob.size / 1024 <= effectiveTargetKB) {
            best = { blob, quality: mid, scale: scaleAdj, scannedCount, totalPages: tp };
            lo = mid; // can afford better quality
          } else {
            if (!bestBig || blob.size < bestBig.blob.size) {
              bestBig = { blob, quality: mid, scale: scaleAdj, scannedCount, totalPages: tp };
            }
            hi = mid;
          }
          if (hi - lo < 0.025) break;
        }

        const final = best || bestBig;
        setProgressPct(100);
        setResult({ blob: final.blob, quality: final.quality, scale: final.scale, scannedCount: final.scannedCount, totalPages: final.totalPages });
      } else {
        setPhase('compressing');
        const { blob, scannedCount, totalPages: tp } = await buildPDF(
          pdfJsDoc, buildSettings(quality, scale), onProgress, onPageDone
        );
        setProgressPct(100);
        setResult({ blob, quality, scale, scannedCount, totalPages: tp });
      }
    } catch (e) {
      if (e.message?.toLowerCase().includes('password')) {
        setError('This PDF is password-protected. Remove the password first.');
      } else if (e.message?.toLowerCase().includes('memory')) {
        setError('Out of memory. Try a lower DPI setting or smaller file.');
      } else {
        setError(e.message || 'Compression failed. The PDF may be corrupted or unsupported.');
      }
    } finally {
      setProcessing(false); setProgress(''); setPhase('');
    }
  };

  const reset = () => {
    setFile(null); setPdfData(null); setResult(null); setError(null);
    setTotalPages(0); setCurrentPage(0);
  };

  const savedPct = file && result ? Math.max(0, ((file.size - result.blob.size) / file.size * 100)).toFixed(1) : 0;
  const withinTarget = effectiveTargetKB ? result && (result.blob.size / 1024) <= effectiveTargetKB : true;
  const outputReadability = result ? readabilityScore(result.quality, result.scale) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/8 to-rose-500/8 border border-red-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Minimize2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold">PDF Size Reducer</p>
            <p className="text-xs text-muted-foreground mt-0.5">Re-renders every page with real JPEG recompression · Scanned doc enhancement · Binary-search target sizing</p>
          </div>
        </div>
      </div>

      {!file ? (
        <PDFDropZone onFiles={handleFile} label="Drop PDF to compress" sublabel="PDF files up to 200MB · All processing is 100% in your browser" />
      ) : (
        <div className="space-y-4">
          {/* Processing overlay */}
          {processing && (
            <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border-4 border-primary/15 border-t-primary rounded-full animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{progress || 'Processing…'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase === 'compressing' && totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Please wait…'}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{progressPct}%</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }} />
                </div>
                {totalPages > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>Rendering + recompressing each page</span>
                    <span>{currentPage}/{totalPages} pages</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {effectiveTargetKB ? `Binary-searching quality to reach ≤ ${effectiveTargetKB < 1024 ? effectiveTargetKB + ' KB' : (effectiveTargetKB/1024).toFixed(1) + ' MB'}` : 'Re-rendering all pages at target DPI & quality'}
              </p>
            </div>
          )}

          {/* File card */}
          {!processing && (
            <SingleFileCard file={file} pageCount={totalPages} onRemove={reset} />
          )}

          {/* Compression Mode */}
          {!processing && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5 block">
                  <Zap className="w-3.5 h-3.5" /> Compression Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setModeId(m.id)}
                      className={cn('text-left px-3 py-3 rounded-xl border text-xs font-medium transition-all', modeId === m.id ? 'bg-primary/8 border-primary/50 ring-1 ring-primary/20' : 'bg-muted/10 border-border hover:border-primary/30 hover:bg-muted/20')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base leading-none">{m.icon}</span>
                        {modeId === m.id && <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md border', m.badgeColor)}>{m.badge}</span>}
                      </div>
                      <div className="font-bold text-sm mt-1.5">{m.label}</div>
                      <div className="text-muted-foreground text-[10px] mt-0.5 leading-tight">{m.desc}</div>
                    </button>
                  ))}
                </div>
                {/* Live estimate */}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Est. reduction: <span className="font-semibold text-foreground">~{Math.min(95, estimatedReduction)}%</span></span>
                  <span>·</span>
                  <span>Output DPI: <span className="font-semibold text-foreground">{Math.round(scale * 72)}</span></span>
                  <span>·</span>
                  <span>Readability: <span className={cn('font-semibold', readability.color)}>{readability.label}</span></span>
                </div>
              </div>

              {/* Target Size */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Target Output Size</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {QUICK_TARGETS.map(t => (
                    <button key={t.kb} onClick={() => { setTargetKB(t.kb); setCustomTargetVal(''); }}
                      className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', targetKB === t.kb && !customTargetVal ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                      {t.label}
                    </button>
                  ))}
                  <button onClick={() => { setTargetKB(null); setCustomTargetVal(''); }}
                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', !targetKB && !customTargetVal ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                    No target
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" value={customTargetVal}
                    onChange={e => { setCustomTargetVal(e.target.value); setTargetKB(null); }}
                    placeholder="Custom target…"
                    className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:ring-2 ring-primary/30 outline-none"
                  />
                  <select value={customTargetUnit} onChange={e => setCustomTargetUnit(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
                    <option>KB</option>
                    <option>MB</option>
                  </select>
                </div>
                {effectiveTargetKB && (
                  <p className="text-xs text-primary mt-1.5 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Binary-searching quality to reach ≤ {effectiveTargetKB >= 1024 ? (effectiveTargetKB/1024).toFixed(1) + ' MB' : effectiveTargetKB + ' KB'}
                    {file && <span className="text-muted-foreground ml-1">(original: {formatSize(file.size)})</span>}
                  </p>
                )}
              </div>

              {/* Color mode */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Color Output</label>
                <div className="flex gap-2">
                  {[
                    { id: 'color', label: '🎨 Color', desc: 'Preserve original' },
                    { id: 'grayscale', label: '⬜ Grayscale', desc: '~20% smaller' },
                    { id: 'bw', label: '◼ B&W', desc: 'Text-only docs' },
                  ].map(c => (
                    <button key={c.id} onClick={() => setColorMode(c.id)}
                      className={cn('flex-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all', colorMode === c.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/10 border-border hover:border-primary/30')}>
                      <div>{c.label}</div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced settings collapsible */}
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <button onClick={() => setShowAdvanced(v => !v)}
                  className="w-full flex items-center justify-between p-3.5 bg-muted/10 hover:bg-muted/20 transition-colors text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Advanced Settings
                  </div>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showAdvanced && (
                  <div className="p-4 space-y-4 border-t border-border/50">
                    {/* Manual quality override */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                        <span>JPEG Quality override</span>
                        <span className="font-bold text-foreground">{customQuality !== null ? Math.round(customQuality * 100) + '%' : `${Math.round(quality * 100)}% (mode default)`}</span>
                      </label>
                      <input type="range" min="20" max="98" value={Math.round((customQuality ?? quality) * 100)}
                        onChange={e => setCustomQuality(Number(e.target.value) / 100)}
                        className="w-full accent-primary h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>Smallest (20%)</span><span>Best quality (98%)</span>
                      </div>
                      {customQuality !== null && (
                        <button onClick={() => setCustomQuality(null)} className="text-[10px] text-primary hover:underline mt-1">Reset to mode default</button>
                      )}
                    </div>

                    {/* DPI override */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex justify-between">
                        <span>Output DPI</span>
                        <span className="font-bold text-foreground">{customScale !== null ? Math.round(customScale * 72) + ' DPI' : Math.round(scale * 72) + ' DPI (mode default)'}</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: '72', scale: 1.0, desc: 'Screen' },
                          { label: '96', scale: 1.33, desc: 'Web' },
                          { label: '150', scale: 2.08, desc: 'Balanced' },
                          { label: '200', scale: 2.78, desc: 'Print' },
                        ].map(d => (
                          <button key={d.label} onClick={() => setCustomScale(d.scale)}
                            className={cn('text-center px-2 py-2 rounded-lg border text-xs font-semibold transition-all',
                              Math.round((customScale ?? scale) * 72) === Math.round(d.scale * 72) ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/10 border-border hover:border-primary/30')}>
                            <div>{d.label}</div>
                            <div className="text-[10px] text-muted-foreground">{d.desc}</div>
                          </button>
                        ))}
                      </div>
                      {customScale !== null && (
                        <button onClick={() => setCustomScale(null)} className="text-[10px] text-primary hover:underline mt-1">Reset to mode default</button>
                      )}
                    </div>

                    {/* Scanned doc settings */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ScanLine className="w-3.5 h-3.5" /> Scanned Document Optimization
                      </div>
                      <div className="flex gap-2">
                        {[
                          { id: 'auto', label: 'Auto-detect' },
                          { id: 'on', label: 'Always on' },
                          { id: 'off', label: 'Off' },
                        ].map(s => (
                          <button key={s.id} onClick={() => setScannedMode(s.id)}
                            className={cn('flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all', scannedMode === s.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/10 border-border hover:border-primary/30')}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={optimizeScanned} onChange={e => setOptimizeScanned(e.target.checked)} className="rounded accent-primary" />
                        <span>Enhance scanned pages <span className="text-muted-foreground text-xs">(whitening + contrast + unsharp mask)</span></span>
                      </label>
                    </div>

                    {/* Cleanup */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Cleanup
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={removeMetadata} onChange={e => setRemoveMetadata(e.target.checked)} className="rounded accent-primary" />
                        <span>Remove metadata <span className="text-muted-foreground text-xs">(author, title, creator, keywords)</span></span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Compression failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={cn('rounded-2xl border p-5 space-y-4', withinTarget ? 'border-green-500/30 bg-green-500/5' : 'border-orange-400/30 bg-orange-400/5')}>
                {/* Status */}
                <div className="flex items-start gap-3">
                  {withinTarget
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className={cn('font-bold text-sm', withinTarget ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')}>
                      {withinTarget ? 'Compression Complete!' : `Output is ${formatSize(result.blob.size)} — exceeds ${effectiveTargetKB >= 1024 ? (effectiveTargetKB/1024).toFixed(1) + ' MB' : effectiveTargetKB + ' KB'} target`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {savedPct}% smaller · {Math.round(result.quality * 100)}% quality · {Math.round(result.scale * 72)} DPI
                      {result.scannedCount > 0 && ` · ${result.scannedCount} scanned pages enhanced`}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  <div className="bg-card rounded-xl p-3 border border-border/50 space-y-1">
                    <div className="text-muted-foreground">Original</div>
                    <div className="font-bold text-sm">{formatSize(file.size)}</div>
                  </div>
                  <div className="bg-primary/8 rounded-xl p-3 border border-primary/20 space-y-1">
                    <div className="text-muted-foreground">Compressed</div>
                    <div className="font-bold text-sm text-primary">{formatSize(result.blob.size)}</div>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20 space-y-1">
                    <div className="text-muted-foreground">Saved</div>
                    <div className="font-bold text-sm text-green-600">{savedPct}%</div>
                  </div>
                  <div className="bg-card rounded-xl p-3 border border-border/50 space-y-1">
                    <div className="text-muted-foreground">Quality</div>
                    <div className={cn('font-bold text-sm', outputReadability?.color)}>{outputReadability?.label}</div>
                  </div>
                </div>

                {/* Compression bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Size reduction</span><span className="font-semibold text-foreground">{savedPct}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(parseFloat(savedPct), 100)}%` }} />
                  </div>
                </div>

                {/* Pages + scanned */}
                {result.totalPages > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {result.totalPages} pages</span>
                    {result.scannedCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <ScanLine className="w-3.5 h-3.5" /> {result.scannedCount} scanned pages enhanced
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <DownloadBtn blob={result.blob} filename={`compressed_${file.name}`} label="Download Compressed PDF" className="flex-1" />
                  <button onClick={() => { setResult(null); }}
                    className="px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compress button */}
          {!processing && !result && (
            <button onClick={compress} disabled={processing}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
              <Minimize2 className="w-4 h-4" />
              Compress PDF
              {effectiveTargetKB && <span className="opacity-80 font-normal text-xs ml-1">→ ≤{effectiveTargetKB >= 1024 ? (effectiveTargetKB/1024).toFixed(1) + ' MB' : effectiveTargetKB + ' KB'}</span>}
            </button>
          )}

          {!processing && (
            <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Eye className="w-3 h-3" />
              Every page is re-rendered via PDF.js and recompressed — real size reduction, not metadata stripping
            </p>
          )}
        </div>
      )}
    </div>
  );
}
