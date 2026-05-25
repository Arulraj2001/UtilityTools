import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Download, Image as ImageIcon, Loader2, X, RefreshCw } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageTool({ tool }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef();
  const slug = tool?.slug;

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const process = async () => {
    if (!file) return;
    setLoading(true);
    if (slug === 'image-compressor') {
      const opts = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: quality / 100 };
      const compressed = await imageCompression(file, opts);
      setResult({
        url: URL.createObjectURL(compressed),
        name: `compressed_${file.name}`,
        originalSize: (file.size / 1024).toFixed(1),
        newSize: (compressed.size / 1024).toFixed(1),
        savings: (((file.size - compressed.size) / file.size) * 100).toFixed(1),
      });
    } else if (slug === 'jpg-to-png') {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const url = canvas.toDataURL('image/png');
      setResult({ url, name: file.name.replace(/\.(jpe?g|webp|gif)$/i, '.png'), dataUrl: true, originalSize: (file.size / 1024).toFixed(1) });
    } else if (slug === 'png-to-jpg') {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL('image/jpeg', quality / 100);
      setResult({ url, name: file.name.replace(/\.(png|webp|gif)$/i, '.jpg'), dataUrl: true, originalSize: (file.size / 1024).toFixed(1) });
    }
    setLoading(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
            isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-base mb-1">{isDragging ? 'Drop it here!' : 'Drop image here or click to upload'}</p>
          <p className="text-sm text-muted-foreground">Supports JPG, PNG, WEBP, GIF</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Before / After comparison */}
          {result ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Before</Label>
                <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20 aspect-video flex items-center justify-center">
                  <img src={preview} alt="original" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-xs text-center text-muted-foreground">{result.originalSize} KB</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">After</Label>
                <div className="rounded-2xl overflow-hidden border border-green-500/30 bg-green-500/5 aspect-video flex items-center justify-center">
                  <img src={result.url} alt="result" className="max-w-full max-h-full object-contain" />
                </div>
                {result.newSize && <p className="text-xs text-center text-muted-foreground">{result.newSize} KB</p>}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
              <img src={preview} alt="preview" className="w-full max-h-64 object-contain" />
              <button onClick={reset} className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors shadow-sm">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-background/80 text-xs font-mono backdrop-blur-sm">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}

          {/* Stats bar */}
          {result && result.savings && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3">
              <StatChip label="Original" value={`${result.originalSize} KB`} />
              <StatChip label="Compressed" value={`${result.newSize} KB`} />
              <StatChip label="Saved" value={`${result.savings}%`} highlight />
            </motion.div>
          )}

          {/* Quality slider */}
          {(slug === 'image-compressor' || slug === 'png-to-jpg') && !result && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quality: <span className="text-primary font-bold">{quality}%</span></Label>
              <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!result ? (
              <Button onClick={process} disabled={loading} className="rounded-xl gap-2 px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {loading ? 'Processing…' : 'Process Image'}
              </Button>
            ) : (
              <Button onClick={download} className="rounded-xl gap-2 px-6 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" /> Download Result
              </Button>
            )}
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, highlight }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${highlight ? 'bg-green-500/15 border border-green-500/20' : 'bg-muted/50 border border-border/40'}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${highlight ? 'text-green-600' : ''}`}>{value}</p>
    </div>
  );
}