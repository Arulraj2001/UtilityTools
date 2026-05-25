/**
 * Background Remover — AI-powered via MediaPipe Image Segmentation
 *
 * Pipeline:
 * 1. Load MediaPipe ImageSegmenter (selfie_multiclass model) from CDN
 * 2. Run segmentation → confidence mask for each pixel
 * 3. Apply Gaussian blur to mask edges (soft feathering)
 * 4. Apply mask to original canvas → transparent PNG
 * 5. Optional: replace background with color / blur / custom image
 *
 * Model: MediaPipe selfie_multiclass_256x256 (1.2MB WASM + tflite)
 * Quality: handles hair, soft edges, complex backgrounds
 * Privacy: 100% client-side, no server calls
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download, RefreshCw, Loader2, Sparkles,
  Sliders, Image as ImageIcon, Palette, Eye, ChevronDown, ChevronUp
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
    // Dynamically import the ESM bundle from CDN
    const { ImageSegmenter, FilesetResolver } = await import(
      /* @vite-ignore */ `${MP_CDN}/vision_bundle.mjs`
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
      const v = Math.exp(-(kx*kx + ky*ky) / (2 * radius * radius));
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
    out[i * 4]     = srcData[i * 4];
    out[i * 4 + 1] = srcData[i * 4 + 1];
    out[i * 4 + 2] = srcData[i * 4 + 2];
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

// ── Merge foreground over background ─────────────────────────────────────────
function compositeBackground(fgData, bgColor, blurBg, bgImgData, w, h) {
  const out = new Uint8ClampedArray(fgData.length);
  let bgR = 255, bgG = 255, bgB = 255;
  if (bgColor) {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    bgR = r; bgG = g; bgB = b;
  }

  for (let i = 0; i < w * h; i++) {
    const alpha = fgData[i * 4 + 3] / 255;
    let bR = bgR, bG = bgG, bB = bgB;
    if (bgImgData) {
      bR = bgImgData[i * 4]; bG = bgImgData[i * 4 + 1]; bB = bgImgData[i * 4 + 2];
    }
    out[i * 4]     = Math.round(fgData[i * 4]     * alpha + bR * (1 - alpha));
    out[i * 4 + 1] = Math.round(fgData[i * 4 + 1] * alpha + bG * (1 - alpha));
    out[i * 4 + 2] = Math.round(fgData[i * 4 + 2] * alpha + bB * (1 - alpha));
    out[i * 4 + 3] = 255;
  }
  return out;
}

// ── Simple blur for background (box blur 2 passes) ───────────────────────────
function blurImageData(data, w, h, radius = 20) {
  const tmp = new Uint8ClampedArray(data);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r=0,g=0,b=0,cnt=0;
        for (let ky = -radius; ky <= radius; ky++) {
          const ny = Math.min(h-1, Math.max(0, y+ky));
          const i = (ny * w + x) * 4;
          r += tmp[i]; g += tmp[i+1]; b += tmp[i+2]; cnt++;
        }
        const i = (y*w+x)*4;
        data[i]=r/cnt; data[i+1]=g/cnt; data[i+2]=b/cnt;
      }
    }
  }
  return data;
}

// ── Core AI removal ───────────────────────────────────────────────────────────
async function removeBackgroundAI(file, settings, onStatus) {
  onStatus('Loading AI model…');
  const segmenter = await loadMediaPipe();

  onStatus('Preparing image…');
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  URL.revokeObjectURL(url);

  const { width: W, height: H } = img;

  // Draw original image
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W; srcCanvas.height = H;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, W, H).data;

  onStatus('Running AI segmentation…');

  // Run segmenter — segment() is synchronous for IMAGE mode
  const result = segmenter.segment(srcCanvas);

  if (!result?.confidenceMasks?.length) {
    throw new Error('Segmentation returned no mask. Try a different image.');
  }

  onStatus('Applying mask…');

  // MediaPipe selfie_multiclass returns 6 channels:
  // 0=background, 1=hair, 2=body, 3=face, 4=clothes, 5=others
  // We want foreground = channels 1-5 combined
  const masks = result.confidenceMasks;
  const totalPixels = W * H;
  const fgMask = new Float32Array(totalPixels);

  // Combine all foreground confidence channels
  for (let ch = 1; ch < masks.length; ch++) {
    const chData = masks[ch].getAsFloat32Array();
    for (let px = 0; px < totalPixels; px++) {
      fgMask[px] = Math.min(1, fgMask[px] + chData[px]);
    }
  }

  // Close masks to free GPU memory
  masks.forEach(m => m.close?.());

  // Apply feathering + edge refinement
  const maskedData = applyMaskToImageData(
    srcData, fgMask, W, H,
    settings.feather, settings.edgeRefine
  );

  // Build transparent PNG canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = W; outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d');
  outCtx.putImageData(new ImageData(maskedData, W, H), 0, 0);

  // Background compositing if needed
  if (settings.bgMode !== 'transparent') {
    let bgImgData = null;
    if (settings.bgMode === 'blur') {
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = W; blurCanvas.height = H;
      const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });
      blurCtx.drawImage(img, 0, 0);
      const blurD = blurCtx.getImageData(0, 0, W, H);
      blurImageData(blurD.data, W, H, Math.round(settings.blurAmount));
      bgImgData = blurD.data;
    } else if (settings.bgMode === 'image' && settings.bgImgData) {
      bgImgData = settings.bgImgData;
    }
    const composed = compositeBackground(
      maskedData, settings.bgMode === 'color' ? settings.bgColor : null,
      false, bgImgData, W, H
    );
    const compCanvas = document.createElement('canvas');
    compCanvas.width = W; compCanvas.height = H;
    compCanvas.getContext('2d').putImageData(new ImageData(composed, W, H), 0, 0);
    outCanvas.width = 0; // cleanup
    srcCanvas.width = 0;
    return { canvas: compCanvas, isTransparent: false };
  }

  srcCanvas.width = 0;
  return { canvas: outCanvas, isTransparent: true };
}

// ── Checkerboard style ────────────────────────────────────────────────────────
const checkerStyle = {
  backgroundImage: 'linear-gradient(45deg,#d4d4d8 25%,transparent 25%),linear-gradient(-45deg,#d4d4d8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d8 75%),linear-gradient(-45deg,transparent 75%,#d4d4d8 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0px',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function BackgroundRemover() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState('');
  const [error, setError]     = useState(null);

  // Settings
  const [feather, setFeather]         = useState(2);
  const [edgeRefine, setEdgeRefine]   = useState(0.5);
  const [bgMode, setBgMode]           = useState('transparent'); // transparent | color | blur | image
  const [bgColor, setBgColor]         = useState('#ffffff');
  const [blurAmount, setBlurAmount]   = useState(18);
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgImageData, setBgImageData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const bgInputRef = useRef(null);

  const onFiles = ([f]) => {
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const loadBgImage = async (f) => {
    setBgImageFile(f);
    const url = URL.createObjectURL(f);
    const img = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = url; });
    // We'll resize bg image to match at runtime — store as blob URL
    setBgImageData(url);
    URL.revokeObjectURL(url);
  };

  const getBgImgDataArray = useCallback(async (W, H) => {
    if (!bgImageData) return null;
    const img = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = bgImageData; });
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0, W, H);
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  }, [bgImageData]);

  const process = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let bgImgDataArr = null;
      if (bgMode === 'image' && bgImageData) {
        const fileUrl = URL.createObjectURL(file);
        const tmpImg = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = fileUrl; });
        URL.revokeObjectURL(fileUrl);
        bgImgDataArr = await getBgImgDataArray(tmpImg.naturalWidth, tmpImg.naturalHeight);
      }

      const { canvas, isTransparent } = await removeBackgroundAI(file, {
        feather, edgeRefine, bgMode, bgColor, blurAmount,
        bgImgData: bgImgDataArr,
      }, setStatus);

      const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
      const blob = await new Promise(r => canvas.toBlob(r, mimeType, 0.95));
      canvas.width = 0;
      const resultUrl = URL.createObjectURL(blob);
      setResult({ url: resultUrl, blob, isTransparent });
    } catch (e) {
      setError(e.message || 'AI segmentation failed. Please try again.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null);
  };

  const downloadResult = () => {
    if (!result) return;
    const ext = result.isTransparent ? 'png' : 'jpg';
    saveAs(result.url, `nobg_${file.name.replace(/\.[^.]+$/, `.${ext}`)}`);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <ImageDropZone
          onFiles={onFiles}
          hint="AI-powered · handles hair, portraits, complex backgrounds · 100% private"
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* AI badge */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/20 px-4 py-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm">
              <strong className="text-foreground">AI Background Remover</strong>
              <span className="text-muted-foreground ml-1.5">· MediaPipe neural segmentation · handles hair, shadows & soft edges · 100% in-browser</span>
            </p>
          </div>

          {/* Preview / Result */}
          {result ? (
            <BeforeAfter before={preview} after={result.url} beforeLabel="Original" afterLabel="Background Removed" />
          ) : (
            <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/10" style={result?.isTransparent ? checkerStyle : {}}>
              <img src={preview} alt="preview" className="w-full max-h-72 object-contain" />
            </div>
          )}

          {/* Transparent result preview */}
          {result?.isTransparent && (
            <div className="rounded-2xl overflow-hidden border border-border/50" style={checkerStyle}>
              <img src={result.url} alt="transparent" className="w-full max-h-56 object-contain" />
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary/15 border-t-primary rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{status || 'Processing…'}</p>
                  <p className="text-xs text-muted-foreground">Neural segmentation in progress</p>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-3.5 text-sm text-destructive">
              <strong>Error: </strong>{error}
              {error.includes('model') || error.includes('AI') ? (
                <p className="text-xs text-muted-foreground mt-1">The AI model loads from CDN — make sure you're online. Large images may take 10–15s on first load.</p>
              ) : null}
            </div>
          )}

          {/* Settings panel */}
          {!loading && !result && (
            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <button onClick={() => setShowSettings(v => !v)}
                className="w-full flex items-center justify-between p-3.5 bg-muted/10 hover:bg-muted/20 transition-colors text-sm font-semibold">
                <span className="flex items-center gap-2"><Sliders className="w-4 h-4 text-muted-foreground" />Settings</span>
                {showSettings ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showSettings && (
                <div className="p-4 space-y-5 border-t border-border/50">
                  {/* Edge feathering */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex justify-between">
                      <span>Edge Feathering</span>
                      <span className="text-foreground font-bold">{feather === 0 ? 'Off' : feather}</span>
                    </label>
                    <input type="range" min={0} max={8} step={0.5} value={feather}
                      onChange={e => setFeather(Number(e.target.value))}
                      className="w-full accent-primary h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>Hard edges</span><span>Soft / blurred edges</span>
                    </div>
                  </div>

                  {/* Edge refinement */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex justify-between">
                      <span>Edge Refinement</span>
                      <span className="text-foreground font-bold">{edgeRefine.toFixed(1)}</span>
                    </label>
                    <input type="range" min={0} max={2} step={0.1} value={edgeRefine}
                      onChange={e => setEdgeRefine(Number(e.target.value))}
                      className="w-full accent-primary h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>Natural</span><span>Sharp cutout</span>
                    </div>
                  </div>

                  {/* Background mode */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Background</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'transparent', label: '⬜ Transparent', desc: 'PNG' },
                        { id: 'color', label: '🎨 Color', desc: 'Solid fill' },
                        { id: 'blur', label: '🔵 Blur', desc: 'Blurred orig' },
                        { id: 'image', label: '🖼️ Image', desc: 'Custom BG' },
                      ].map(m => (
                        <button key={m.id} onClick={() => setBgMode(m.id)}
                          className={cn('px-2 py-2.5 rounded-xl border text-xs font-medium transition-all', bgMode === m.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/10 border-border hover:border-primary/30')}>
                          <div>{m.label}</div>
                          <div className="text-muted-foreground text-[10px] mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>

                    {bgMode === 'color' && (
                      <div className="flex items-center gap-3 mt-3">
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                          className="w-10 h-10 rounded-xl border border-border cursor-pointer" />
                        <span className="text-sm text-muted-foreground">Background color: <span className="font-mono text-foreground">{bgColor}</span></span>
                      </div>
                    )}

                    {bgMode === 'blur' && (
                      <div className="mt-3">
                        <label className="text-xs text-muted-foreground flex justify-between mb-1">
                          <span>Blur amount</span><span className="font-bold text-foreground">{blurAmount}</span>
                        </label>
                        <input type="range" min={5} max={40} value={blurAmount} onChange={e => setBlurAmount(Number(e.target.value))}
                          className="w-full accent-primary h-1.5" />
                      </div>
                    )}

                    {bgMode === 'image' && (
                      <div className="mt-3">
                        <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files[0] && loadBgImage(e.target.files[0])} />
                        <button onClick={() => bgInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 text-sm text-primary font-medium hover:bg-primary/10 transition-colors">
                          {bgImageFile ? `✓ ${bgImageFile.name}` : '+ Choose background image'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!result ? (
              <Button onClick={process} disabled={loading} className="rounded-xl gap-2 px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Processing…' : 'Remove Background'}
              </Button>
            ) : (
              <>
                <Button onClick={downloadResult} className="rounded-xl gap-2 bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4" />
                  Download {result.isTransparent ? 'PNG (Transparent)' : 'Image'}
                </Button>
                <Button variant="outline" onClick={() => setResult(null)} className="rounded-xl">
                  <Sliders className="w-4 h-4 mr-1.5" />Adjust Settings
                </Button>
              </>
            )}
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> New Image
            </Button>
          </div>

          {!loading && (
            <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Eye className="w-3 h-3" />
              AI model loads once · all processing stays in your browser · no uploads
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}