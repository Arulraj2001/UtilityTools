/**
 * Image to PDF — Professional multi-image PDF builder
 * Supports drag/drop reorder, A4/Letter/A3, fit modes, margins, quality, grayscale
 */
import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, ArrowUp, ArrowDown, X, FileText, Settings, CheckCircle2 } from 'lucide-react';
import { DownloadBtn, formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';

const PAGE_SIZES = {
  'A4':           [595.28, 841.89],
  'A3':           [841.89, 1190.55],
  'Letter':       [612, 792],
  'Legal':        [612, 1008],
  'A4 Landscape': [841.89, 595.28],
};

const FIT_MODES = [
  { id: 'fit',     label: 'Fit',     desc: 'Scale to fit, keep ratio' },
  { id: 'fill',    label: 'Fill',    desc: 'Cover entire page, may crop' },
  { id: 'stretch', label: 'Stretch', desc: 'Fill exactly, ignores ratio' },
  { id: 'center',  label: 'Center',  desc: 'Original size, centered' },
];

async function loadImageToCanvas(file, quality, grayscale) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: grayscale });
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (grayscale) {
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = d[i + 1] = d[i + 2] = g;
        }
        ctx.putImageData(id, 0, 0);
      }

      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve({
          bytes: new Uint8Array(e.target.result),
          w: canvas.width, h: canvas.height,
        });
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', quality / 100);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}

function calcDimensions(imgW, imgH, pageW, pageH, margin, fitMode) {
  const mw = pageW - margin * 2;
  const mh = pageH - margin * 2;
  let dw, dh;

  if (fitMode === 'stretch') { dw = mw; dh = mh; }
  else if (fitMode === 'fill') { const s = Math.max(mw / imgW, mh / imgH); dw = imgW * s; dh = imgH * s; }
  else if (fitMode === 'center') { dw = Math.min(imgW, mw); dh = Math.min(imgH, mh); }
  else { const s = Math.min(mw / imgW, mh / imgH); dw = imgW * s; dh = imgH * s; } // fit

  const x = margin + (mw - dw) / 2;
  const y = margin + (mh - dh) / 2;
  return { dw, dh, x, y };
}

export default function AdvancedJPGtoPDF() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [fitMode, setFitMode] = useState('fit');
  const [margin, setMargin] = useState(20);
  const [quality, setQuality] = useState(88);
  const [grayscale, setGrayscale] = useState(false);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [outputBlob, setOutputBlob] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((accepted) => {
    const imgs = accepted.filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...imgs.map(f => ({ file: f, id: crypto.randomUUID(), preview: URL.createObjectURL(f) }))]);
    setOutputBlob(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'] }, multiple: true,
  });

  const remove = (id) => setImages(p => p.filter(i => i.id !== id));
  const move = (id, dir) => {
    setImages(prev => {
      const idx = prev.findIndex(x => x.id === id);
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr;
    });
  };

  const convert = async () => {
    if (!images.length) return;
    setProcessing(true); setError(null); setProgress('');
    try {
      const pdf = await PDFDocument.create();
      let [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];
      if (orientation === 'landscape') [pw, ph] = [ph, pw];

      for (let i = 0; i < images.length; i++) {
        setProgress(`Processing image ${i + 1}/${images.length}...`);
        const { bytes, w, h } = await loadImageToCanvas(images[i].file, quality, grayscale);
        const embImg = await pdf.embedJpg(bytes);
        const page = pdf.addPage([pw, ph]);

        // Background fill
        if (bgColor !== '#FFFFFF') {
          const r = parseInt(bgColor.slice(1, 3), 16) / 255;
          const g = parseInt(bgColor.slice(3, 5), 16) / 255;
          const b = parseInt(bgColor.slice(5, 7), 16) / 255;
          page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: { red: r, green: g, blue: b } });
        }

        const { dw, dh, x, y } = calcDimensions(w, h, pw, ph, margin, fitMode);
        page.drawImage(embImg, { x, y, width: dw, height: dh });
      }

      setProgress('Building PDF...');
      const bytes = await pdf.save({ useObjectStreams: true });
      setOutputBlob(new Blob([bytes], { type: 'application/pdf' }));
    } catch (e) { setError(e.message || 'Conversion failed'); }
    finally { setProcessing(false); setProgress(''); }
  };

  const totalInputSize = images.reduce((s, i) => s + i.file.size, 0);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><Image className="w-4 h-4 text-blue-600" /></div>
          <div>
            <p className="font-bold text-sm">Image to PDF</p>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP → PDF · Page control · Fit modes · Batch</p>
          </div>
        </div>
      </div>

      <div {...getRootProps()} className={cn('border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all', isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/10')}>
        <input {...getInputProps()} />
        <Image className="w-8 h-8 mx-auto mb-2 text-primary/60" />
        <p className="font-semibold text-sm">{isDragActive ? 'Drop images here' : 'Drop images or click to upload'}</p>
        <p className="text-xs text-muted-foreground mt-1">JPG · PNG · WebP · BMP — multiple files supported</p>
      </div>

      {images.length > 0 && (
        <div className="relative space-y-4">
          {processing && (
            <div className="absolute inset-0 rounded-2xl bg-background/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-medium">{progress || 'Building PDF...'}</p>
              </div>
            </div>
          )}

          {/* Image grid with reorder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{images.length} Image{images.length > 1 ? 's' : ''} · {formatSize(totalInputSize)}</label>
              <button onClick={() => setImages([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear all</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-xl overflow-hidden border border-border/60 group aspect-square bg-muted/20 hover:border-primary/40 transition-colors">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => move(img.id, -1)} disabled={i === 0} className="p-1 rounded-lg bg-background/95 disabled:opacity-30 hover:bg-primary/10 transition-colors"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => remove(img.id)} className="p-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors"><X className="w-3 h-3" /></button>
                      <button onClick={() => move(img.id, 1)} disabled={i === images.length - 1} className="p-1 rounded-lg bg-background/95 disabled:opacity-30 hover:bg-primary/10 transition-colors"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-md bg-background/80 text-[10px] font-bold flex items-center justify-center shadow">{i + 1}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {/* Add more button */}
              <div {...getRootProps()} className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                <input {...getInputProps()} />
                <div className="text-center"><span className="text-2xl text-muted-foreground">+</span></div>
              </div>
            </div>
          </div>

          {/* Settings panel */}
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Settings className="w-3.5 h-3.5" /> PDF Settings
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Page Size</label>
                <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
                  {Object.keys(PAGE_SIZES).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Orientation</label>
                <select value={orientation} onChange={e => setOrientation(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Image Fit Mode</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FIT_MODES.map(m => (
                  <button key={m.id} onClick={() => setFitMode(m.id)}
                    className={cn('text-left px-3 py-2 rounded-xl border text-xs transition-all', fitMode === m.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-background border-border hover:border-primary/30')}>
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-muted-foreground text-[10px]">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>Margin</span><span className="font-bold text-foreground">{margin}pt</span>
                </label>
                <input type="range" min="0" max="72" value={margin} onChange={e => setMargin(Number(e.target.value))} className="w-full accent-primary h-1.5" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                  <span>Quality</span><span className="font-bold text-foreground">{quality}%</span>
                </label>
                <input type="range" min="40" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-primary h-1.5" />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={grayscale} onChange={e => setGrayscale(e.target.checked)} className="rounded accent-primary" />
                <span>Grayscale output</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Page background:</label>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-border" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          {outputBlob && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400">PDF Created Successfully!</p>
                  <p className="text-xs text-muted-foreground">{images.length} pages · {formatSize(outputBlob.size)}</p>
                </div>
              </div>
              <DownloadBtn blob={outputBlob} filename="images_converted.pdf" label="Download PDF" className="w-full" />
            </motion.div>
          )}

          <button onClick={convert} disabled={processing}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            <FileText className="w-4 h-4" />
            {processing ? (progress || 'Building PDF...') : `Convert ${images.length} Image${images.length > 1 ? 's' : ''} to PDF`}
          </button>
        </div>
      )}
    </div>
  );
}