import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw, Loader2, Package } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { canvasToBlob, revokeObjectUrl } from '@/lib/fileProcessing';

const FORMATS = ['JPEG', 'PNG', 'WEBP'];
const MIME = { JPEG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp' };
const EXT = { JPEG: 'jpg', PNG: 'png', WEBP: 'webp' };
const fmt = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

async function loadHeic(file) {
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    const heic2any = (await import('heic2any')).default;
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
    return Array.isArray(blob) ? blob[0] : blob;
  }
  return file;
}

async function convertFile(file, targetFormat, quality) {
  const src = await loadHeic(file);
  const url = URL.createObjectURL(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (MIME[targetFormat] === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      try {
        const blob = await canvasToBlob(canvas, MIME[targetFormat], quality / 100);
        resolve(blob);
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

export default function ImageConverter() {
  const [files, setFiles] = useState([]);
  const [targetFormat, setTargetFormat] = useState('WEBP');
  const [quality, setQuality] = useState(90);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => { setFiles([]); setResults([]); setProgress(0); };

  useEffect(() => {
    return () => {
      results.forEach(r => revokeObjectUrl(r.url));
    };
  }, [results]);

  const convert = async () => {
    setLoading(true);
    setProgress(0);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const blob = await convertFile(f, targetFormat, quality);
      const baseName = f.name.replace(/\.[^.]+$/, '');
      out.push({ original: f, blob, url: URL.createObjectURL(blob), name: `${baseName}.${EXT[targetFormat]}` });
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setResults(out);
    setLoading(false);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    results.forEach(r => zip.file(r.name, r.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `converted_images.zip`);
  };

  return (
    <div className="space-y-6">
      {!files.length ? (
        <ImageDropZone onFiles={setFiles} multiple hint="JPG, PNG, WEBP, HEIC — batch convert multiple files" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Format selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Convert To</Label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setTargetFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    targetFormat === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border/50 hover:border-primary/50'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {targetFormat !== 'PNG' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Quality</span><span className="font-bold text-primary">{quality}%</span></div>
              <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full cursor-pointer" />
            </div>
          )}

          {/* Files */}
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-2 max-h-48 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-card rounded-xl px-3 py-2 border border-border/40">
                <span className="truncate max-w-[200px]">{f.name}</span>
                <span className="text-muted-foreground">{fmt(f.size)}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Converting…</span><span className="font-bold">{progress}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(r.blob.size)}</p>
                  </div>
                  <Button size="sm" onClick={() => saveAs(r.url, r.name)} className="rounded-lg gap-1.5 bg-green-600 hover:bg-green-700 text-xs">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>
              ))}
              {results.length > 1 && (
                <Button onClick={downloadZip} variant="outline" className="w-full rounded-xl gap-2">
                  <Package className="w-4 h-4" /> Download All as ZIP
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!results.length && (
              <Button onClick={convert} disabled={loading} className="rounded-xl gap-2 px-6">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Converting…' : `Convert to ${targetFormat}`}
              </Button>
            )}
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Start Over
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
