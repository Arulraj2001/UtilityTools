/**
 * Background Remover — AI-powered via MediaPipe Image Segmentation
 *
 * Pipeline:
 * 1. Load MediaPipe ImageSegmenter (selfie_multiclass model) from CDN dynamically via Function bypass
 * 2. Run segmentation → confidence mask for each pixel
 * 3. Pre-render cropped foreground with adjustable CPU edge feathering & refinement
 * 4. Composite final output on GPU-accelerated 2D canvas with real-time sliders (Scale, Translate, Filters, Drop Shadow, Background Modes, Presets)
 *
 * Model: MediaPipe selfie_multiclass_256x256 (1.2MB WASM + tflite)
 * Quality: handles hair, soft edges, complex backgrounds
 * Privacy: 100% client-side, no server calls
 */
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download, RefreshCw, Loader2, Sparkles,
  Sliders, Eye, ChevronDown, ChevronUp,
  Move, Sun, Palette, BookOpen, Layers
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

// ── MediaPipe loader ─────────────────────────────────────────────────────────
let mpSegmenterPromise = null;

const MP_VERSION = '0.10.8';
const MP_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

async function loadMediaPipe() {
  if (mpSegmenterPromise) return mpSegmenterPromise;

  mpSegmenterPromise = (async () => {
    // Escape Next.js Turbopack compilation of CDN dynamic ESM imports
    const importDynamic = new Function('url', 'return import(url)');
    const { ImageSegmenter, FilesetResolver } = await importDynamic(
      `${MP_CDN}/vision_bundle.mjs`
    );

    const filesetResolver = await FilesetResolver.forVisionTasks(`${MP_CDN}/wasm`);

    const segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      outputCategoryMask: false,
      outputConfidenceMasks: true,
      runningMode: 'IMAGE',
    });

    return segmenter;
  })();

  return mpSegmenterPromise;
}

// ── Gaussian blur on mask (edge feathering) ──────────────────────────────────
function gaussianBlurMask(mask, w, h, radius = 3) {
  const out = new Float32Array(mask.length);
  const kernel = [];
  let sum = 0;
  for (let ky = -radius; ky <= radius; ky++) {
    for (let kx = -radius; kx <= radius; kx++) {
      const v = Math.exp(-(kx * kx + ky * ky) / (2 * radius * radius));
      kernel.push({ kx, ky, v });
      sum += v;
    }
  }
  kernel.forEach(k => k.v /= sum);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (const { kx, ky, v } of kernel) {
        const nx = Math.min(w - 1, Math.max(0, x + kx));
        const ny = Math.min(h - 1, Math.max(0, y + ky));
        val += mask[ny * w + nx] * v;
      }
      out[y * w + x] = val;
    }
  }
  return out;
}

// ── Apply mask to canvas data ─────────────────────────────────────────────────
function applyMaskToImageData(srcData, mask, w, h, feather, edgeRefine) {
  const out = new Uint8ClampedArray(srcData.length);
  const blurred = feather > 0 ? gaussianBlurMask(mask, w, h, Math.round(feather)) : mask;

  for (let i = 0; i < w * h; i++) {
    let alpha = blurred[i];
    // Edge refinement: sharpen the mask boundary
    if (edgeRefine > 0) {
      alpha = alpha < 0.5
        ? Math.pow(alpha * 2, 1 + edgeRefine) / 2
        : 1 - Math.pow((1 - alpha) * 2, 1 + edgeRefine) / 2;
    }
    alpha = Math.min(1, Math.max(0, alpha));
    out[i * 4] = srcData[i * 4];
    out[i * 4 + 1] = srcData[i * 4 + 1];
    out[i * 4 + 2] = srcData[i * 4 + 2];
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

// ── Apply Preset Gradients ───────────────────────────────────────────────────
const BACKGROUND_PRESETS = [
  { id: 'deep-slate', name: 'Deep Slate', gradient: ['#1e293b', '#0f172a'] },
  { id: 'neon-sunset', name: 'Neon Sunset', gradient: ['#ec4899', '#f43f5e', '#eab308'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', gradient: ['#06b6d4', '#3b82f6'] },
  { id: 'warm-sand', name: 'Warm Sand', gradient: ['#ffedd5', '#fed7aa'] },
  { id: 'royal-purple', name: 'Royal Purple', gradient: ['#6366f1', '#3b0764'] },
  { id: 'studio-white', name: 'Studio White', color: '#ffffff' },
];

function applyPresetBg(ctx, presetId, W, H) {
  const preset = BACKGROUND_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  if (preset.color) {
    ctx.fillStyle = preset.color;
    ctx.fillRect(0, 0, W, H);
  } else if (preset.gradient) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    preset.gradient.forEach((color, idx) => {
      grad.addColorStop(idx / (preset.gradient.length - 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── Checkerboard style for transparency representation ───────────────────────
const checkerStyle = {
  backgroundImage: 'linear-gradient(45deg,#d4d4d8 25%,transparent 25%),linear-gradient(-45deg,#d4d4d8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d8 75%),linear-gradient(-45deg,transparent 75%,#d4d4d8 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0px',
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function BackgroundRemover() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  // High Resolution segmentation cache
  const [segmentedData, setSegmentedData] = useState(null);
  const [fgCanvas, setFgCanvas] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [previewMode, setPreviewMode] = useState('compare'); // compare | editor

  // Editor Settings
  const [feather, setFeather] = useState(1.5);
  const [edgeRefine, setEdgeRefine] = useState(0.2);

  // Background Settings
  const [bgMode, setBgMode] = useState('transparent'); // transparent | color | blur | image | preset
  const [bgColor, setBgColor] = useState('#e0e7ff');
  const [blurAmount, setBlurAmount] = useState(15);
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgImageData, setBgImageData] = useState(null);
  const [activePreset, setActivePreset] = useState('deep-slate');

  // Foreground Subject Adjustments
  const [fgScale, setFgScale] = useState(1.0);
  const [fgOffsetX, setFgOffsetX] = useState(0); // in percentage (-50 to 50)
  const [fgOffsetY, setFgOffsetY] = useState(0); // in percentage (-50 to 50)

  // Color Enhancements
  const [fgBrightness, setFgBrightness] = useState(100);
  const [fgContrast, setFgContrast] = useState(100);
  const [bgBrightness, setBgBrightness] = useState(100);
  const [bgContrast, setBgContrast] = useState(100);

  // Shadow Adjustments
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowOffsetX, setShadowOffsetX] = useState(6);
  const [shadowOffsetY, setShadowOffsetY] = useState(6);

  // UI accordion tabs
  const [activeAccordion, setActiveAccordion] = useState('background'); // background | subject | filters | edges | shadow

  const bgInputRef = useRef(null);

  // Clean up object URLs on unmount/re-processing
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (resultUrl && resultUrl.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  useEffect(() => {
    return () => {
      if (bgImageData && bgImageData.startsWith('blob:')) URL.revokeObjectURL(bgImageData);
    };
  }, [bgImageData]);

  const onFiles = ([f]) => {
    setFile(f);
    setSegmentedData(null);
    setFgCanvas(null);
    setResultUrl(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const loadBgImage = (f) => {
    setBgImageFile(f);
    const url = URL.createObjectURL(f);
    setBgImageData(url);
  };

  // 1. Run AI Segmenter once
  const runAISegmentation = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStatus('Loading AI models…');

    try {
      const segmenter = await loadMediaPipe();

      setStatus('Decoding image…');
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      URL.revokeObjectURL(url);

      const W = img.naturalWidth;
      const H = img.naturalHeight;

      // Draw original image to canvas for pixel analysis
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = W;
      srcCanvas.height = H;
      const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
      srcCtx.drawImage(img, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, W, H).data;

      setStatus('Running AI segmentation…');
      const result = segmenter.segment(srcCanvas);

      if (!result?.confidenceMasks?.length) {
        throw new Error('Could not identify any subject background. Try another image.');
      }

      // Combine foreground confidence masks (channels 1-5 represent portrait elements)
      const masks = result.confidenceMasks;
      const totalPixels = W * H;
      const fgMask = new Float32Array(totalPixels);

      for (let ch = 1; ch < masks.length; ch++) {
        const chData = masks[ch].getAsFloat32Array();
        for (let px = 0; px < totalPixels; px++) {
          fgMask[px] = Math.min(1, fgMask[px] + chData[px]);
        }
      }

      // Close WebGL textures to free memory
      masks.forEach(m => m.close?.());

      setSegmentedData({ fgMask, W, H, srcData, img });
    } catch (e) {
      console.error(e);
      setError(e.message || 'AI processing failed. Please try a different photo.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  // 2. Pre-render cropped foreground whenever feathering or refinement changes
  useEffect(() => {
    if (!segmentedData) return;
    const { fgMask, W, H, srcData } = segmentedData;

    // Apply feathering + edge refinement on CPU mask
    const maskedData = applyMaskToImageData(
      srcData, fgMask, W, H,
      feather, edgeRefine
    );

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(maskedData, W, H), 0, 0);

    setFgCanvas(canvas);
  }, [segmentedData, feather, edgeRefine]);

  // 3. Fast composition loop using HTML5 Canvas GPU acceleration
  useEffect(() => {
    if (!segmentedData || !fgCanvas) return;

    const { W, H, img } = segmentedData;

    const composeAndCreateUrl = async () => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = W;
      finalCanvas.height = H;
      const ctx = finalCanvas.getContext('2d');

      // ─── Phase A: Render Background ───
      if (bgMode === 'color') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);
      } else if (bgMode === 'blur') {
        ctx.save();
        ctx.filter = `blur(${blurAmount}px) brightness(${bgBrightness}%) contrast(${bgContrast}%)`;
        ctx.drawImage(img, -blurAmount * 2, -blurAmount * 2, W + blurAmount * 4, H + blurAmount * 4);
        ctx.restore();
      } else if (bgMode === 'image' && bgImageData) {
        ctx.save();
        ctx.filter = `brightness(${bgBrightness}%) contrast(${bgContrast}%)`;
        const bgImg = await new Promise(res => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = bgImageData;
        });
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const x = (W - bgImg.width * scale) / 2;
        const y = (H - bgImg.height * scale) / 2;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
        ctx.restore();
      } else if (bgMode === 'preset') {
        ctx.save();
        ctx.filter = `brightness(${bgBrightness}%) contrast(${bgContrast}%)`;
        applyPresetBg(ctx, activePreset, W, H);
        ctx.restore();
      }

      // ─── Phase B: Render Foreground (Subject) with transforms ───
      ctx.save();

      // Shadow
      if (shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
      }

      // Color filters
      ctx.filter = `brightness(${fgBrightness}%) contrast(${fgContrast}%)`;

      // Transform translation and scaling
      ctx.translate(W * (fgOffsetX / 100), H * (fgOffsetY / 100));
      ctx.translate(W / 2, H / 2);
      ctx.scale(fgScale, fgScale);
      ctx.translate(-W / 2, -H / 2);

      ctx.drawImage(fgCanvas, 0, 0);
      ctx.restore();

      // Output Mime type
      const mimeType = bgMode === 'transparent' ? 'image/png' : 'image/jpeg';
      finalCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setResultUrl(prev => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return url;
        });
      }, mimeType, 0.95);
    };

    // Use debounced timeout to prevent canvas lockups during dragging
    const timer = setTimeout(composeAndCreateUrl, 80);
    return () => clearTimeout(timer);
  }, [
    segmentedData, fgCanvas, bgMode, bgColor, blurAmount, bgImageData, activePreset,
    fgScale, fgOffsetX, fgOffsetY, fgBrightness, fgContrast, bgBrightness, bgContrast,
    shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY
  ]);

  const downloadResult = () => {
    if (!resultUrl) return;
    const ext = bgMode === 'transparent' ? 'png' : 'jpg';
    saveAs(resultUrl, `nobg_${file.name.replace(/\.[^.]+$/, `.${ext}`)}`);
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setSegmentedData(null);
    setFgCanvas(null);
    setResultUrl(null);
    setError(null);
    setBgMode('transparent');
    setFgScale(1.0);
    setFgOffsetX(0);
    setFgOffsetY(0);
    setFgBrightness(100);
    setFgContrast(100);
    setBgBrightness(100);
    setBgContrast(100);
    setShadowBlur(0);
  };

  const toggleAccordion = (tab) => {
    setActiveAccordion(prev => prev === tab ? null : tab);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <ImageDropZone
          onFiles={onFiles}
          hint="Portraits, objects, products · High definition model · 100% Client-side Processing"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Canvas Preview & Modes */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Segmentation status bar */}
            {!segmentedData && !loading && (
              <div className="rounded-2xl bg-amber-500/8 border border-amber-500/20 p-4 text-center">
                <p className="text-sm font-semibold mb-2">Subject loaded. Ready for AI extraction.</p>
                <Button onClick={runAISegmentation} className="rounded-xl gap-2 px-6 bg-primary hover:bg-primary/90">
                  <Sparkles className="w-4 h-4" /> Start AI Extraction
                </Button>
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-primary/20 bg-card p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-7 h-7 text-primary animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{status || 'Extracting background…'}</p>
                    <p className="text-xs text-muted-foreground">Neural network is segmenting pixels locally</p>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse w-4/5" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-semibold">AI segmenter encountered an error:</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
            )}

            {/* Preview Window */}
            {preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Preview Area</h3>
                  {segmentedData && resultUrl && (
                    <div className="flex bg-muted/40 rounded-lg p-1 border border-border/50">
                      <button
                        onClick={() => setPreviewMode('compare')}
                        className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-all", previewMode === 'compare' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        Compare
                      </button>
                      <button
                        onClick={() => setPreviewMode('editor')}
                        className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-all", previewMode === 'editor' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        Solo Preview
                      </button>
                    </div>
                  )}
                </div>

                {segmentedData && resultUrl ? (
                  previewMode === 'compare' ? (
                    <BeforeAfter before={preview} after={resultUrl} beforeLabel="Original" afterLabel="Edited Cutout" />
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/10 flex items-center justify-center min-h-[320px] max-h-[500px]" style={bgMode === 'transparent' ? checkerStyle : {}}>
                      <img src={resultUrl} alt="Preview Result" className="max-w-full max-h-[480px] object-contain" />
                    </div>
                  )
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/10 flex items-center justify-center min-h-[320px] max-h-[500px]">
                    <img src={preview} alt="Input Source" className="max-w-full max-h-[480px] object-contain" />
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
              <Eye className="w-3.5 h-3.5" /> All operations run client-side. Your photo never leaves your device.
            </div>
          </div>

          {/* RIGHT PANEL: Settings & Control Knobs */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Header info card */}
            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-1 shadow-sm">
              <h3 className="font-bold text-sm">Fine-Tune Cutout</h3>
              <p className="text-xs text-muted-foreground">Adjust alignment, background fill, shadows and edges in real time.</p>
            </div>

            {/* Accordion Settings panels */}
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/50 shadow-sm">
              
              {/* ACCORDION TABS */}
              {/* 1. Background Config */}
              <div>
                <button
                  onClick={() => toggleAccordion('background')}
                  disabled={!segmentedData}
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-sm font-bold text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-primary" /> Background Blend Mode
                  </span>
                  {activeAccordion === 'background' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'background' && segmentedData && (
                  <div className="p-4 space-y-4 bg-card animate-fade-in-up">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: 'transparent', label: 'Trans.', desc: 'PNG' },
                        { id: 'color', label: 'Color', desc: 'Solid' },
                        { id: 'blur', label: 'Blur', desc: 'Background' },
                        { id: 'image', label: 'Image', desc: 'Upload' },
                        { id: 'preset', label: 'Presets', desc: 'Grads' },
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setBgMode(m.id)}
                          className={cn(
                            'p-2 rounded-xl border text-[11px] font-bold leading-tight transition-all',
                            bgMode === m.id
                              ? 'bg-primary/10 border-primary/50 text-primary'
                              : 'bg-muted/10 border-border hover:border-primary/20'
                          )}
                        >
                          <div>{m.label}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 font-normal">{m.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* Conditional Settings rendering based on bgMode */}
                    {bgMode === 'color' && (
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={e => setBgColor(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0"
                        />
                        <div className="text-xs">
                          <p className="font-semibold">Background Fill</p>
                          <p className="font-mono text-muted-foreground text-[10px]">{bgColor}</p>
                        </div>
                      </div>
                    )}

                    {bgMode === 'blur' && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Blur Radius</span>
                          <span>{blurAmount}px</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={50}
                          value={blurAmount}
                          onChange={e => setBlurAmount(Number(e.target.value))}
                          className="w-full accent-primary h-1"
                        />
                      </div>
                    )}

                    {bgMode === 'image' && (
                      <div className="space-y-3 pt-2">
                        <input
                          ref={bgInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files[0] && loadBgImage(e.target.files[0])}
                        />
                        <Button
                          variant="outline"
                          onClick={() => bgInputRef.current?.click()}
                          className="w-full rounded-xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary text-xs py-5"
                        >
                          {bgImageFile ? `✓ ${bgImageFile.name}` : '+ Upload Custom Background'}
                        </Button>
                      </div>
                    )}

                    {bgMode === 'preset' && (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {BACKGROUND_PRESETS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setActivePreset(p.id)}
                            className={cn(
                              "h-10 rounded-lg relative overflow-hidden border transition-all",
                              activePreset === p.id ? "border-primary ring-2 ring-primary/20 scale-95" : "border-border hover:border-primary/30"
                            )}
                            title={p.name}
                          >
                            {p.color ? (
                              <div className="absolute inset-0" style={{ backgroundColor: p.color }} />
                            ) : (
                              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p.gradient.join(',')})` }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Background Brightness & Contrast controls */}
                    {bgMode !== 'transparent' && (
                      <div className="space-y-3 border-t border-border/50 pt-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Background Tuning</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Background Brightness</span>
                            <span>{bgBrightness}%</span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={150}
                            value={bgBrightness}
                            onChange={e => setBgBrightness(Number(e.target.value))}
                            className="w-full accent-primary h-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Background Contrast</span>
                            <span>{bgContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={150}
                            value={bgContrast}
                            onChange={e => setBgContrast(Number(e.target.value))}
                            className="w-full accent-primary h-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Scale & Position */}
              <div>
                <button
                  onClick={() => toggleAccordion('subject')}
                  disabled={!segmentedData}
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-sm font-bold text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Move className="w-4 h-4 text-primary" /> Subject Scale & Placement
                  </span>
                  {activeAccordion === 'subject' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'subject' && segmentedData && (
                  <div className="p-4 space-y-4 bg-card animate-fade-in-up">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Scale / Zoom</span>
                        <span>{fgScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.4}
                        max={1.8}
                        step={0.05}
                        value={fgScale}
                        onChange={e => setFgScale(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Horizontal Offset (X)</span>
                        <span>{fgOffsetX}%</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={fgOffsetX}
                        onChange={e => setFgOffsetX(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Vertical Offset (Y)</span>
                        <span>{fgOffsetY}%</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={fgOffsetY}
                        onChange={e => setFgOffsetY(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Subject Filters */}
              <div>
                <button
                  onClick={() => toggleAccordion('filters')}
                  disabled={!segmentedData}
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-sm font-bold text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-primary" /> Subject Filters & Color Correction
                  </span>
                  {activeAccordion === 'filters' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'filters' && segmentedData && (
                  <div className="p-4 space-y-4 bg-card animate-fade-in-up">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Subject Brightness</span>
                        <span>{fgBrightness}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        value={fgBrightness}
                        onChange={e => setFgBrightness(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Subject Contrast</span>
                        <span>{fgContrast}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        value={fgContrast}
                        onChange={e => setFgContrast(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Feather & Edge Options */}
              <div>
                <button
                  onClick={() => toggleAccordion('edges')}
                  disabled={!segmentedData}
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-sm font-bold text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-primary" /> Mask Feathering & Edges
                  </span>
                  {activeAccordion === 'edges' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'edges' && segmentedData && (
                  <div className="p-4 space-y-4 bg-card animate-fade-in-up">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Edge Feathering</span>
                        <span>{feather === 0 ? 'Hard' : `${feather}px`}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.5}
                        value={feather}
                        onChange={e => setFeather(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Edge Refinement (Sharpness)</span>
                        <span>{edgeRefine.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.1}
                        value={edgeRefine}
                        onChange={e => setEdgeRefine(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Drop Shadow Options */}
              <div>
                <button
                  onClick={() => toggleAccordion('shadow')}
                  disabled={!segmentedData}
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-sm font-bold text-left disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-primary" /> Subject Drop Shadow
                  </span>
                  {activeAccordion === 'shadow' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {activeAccordion === 'shadow' && segmentedData && (
                  <div className="p-4 space-y-4 bg-card animate-fade-in-up">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Shadow Blur / Intensity</span>
                        <span>{shadowBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={shadowBlur}
                        onChange={e => setShadowBlur(Number(e.target.value))}
                        className="w-full accent-primary h-1"
                      />
                    </div>

                    {shadowBlur > 0 && (
                      <>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={shadowColor}
                            onChange={e => setShadowColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0"
                          />
                          <div className="text-xs">
                            <p className="font-semibold">Shadow Color</p>
                            <p className="font-mono text-muted-foreground text-[10px]">{shadowColor}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Shadow Offset X</span>
                            <span>{shadowOffsetX}px</span>
                          </div>
                          <input
                            type="range"
                            min={-20}
                            max={20}
                            value={shadowOffsetX}
                            onChange={e => setShadowOffsetX(Number(e.target.value))}
                            className="w-full accent-primary h-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Shadow Offset Y</span>
                            <span>{shadowOffsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min={-20}
                            max={20}
                            value={shadowOffsetY}
                            onChange={e => setShadowOffsetY(Number(e.target.value))}
                            className="w-full accent-primary h-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-3">
              {resultUrl && (
                <Button onClick={downloadResult} className="w-full py-6 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md gap-2">
                  <Download className="w-4 h-4" /> Download Complete Image
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={resetAll} className="rounded-xl font-semibold gap-1.5 py-5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Start New Image
                </Button>
                <Button
                  variant="outline"
                  onClick={runAISegmentation}
                  disabled={!file || loading}
                  className="rounded-xl font-semibold gap-1.5 py-5 text-xs bg-muted/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Run AI Again
                </Button>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
