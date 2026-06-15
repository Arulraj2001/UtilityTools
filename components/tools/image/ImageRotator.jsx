import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw, RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import { canvasToBlob, revokeObjectUrl } from '@/lib/fileProcessing';

export default function ImageRotator() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [quality, setQuality] = useState(95);
  const [result, setResult] = useState(null);

  const onFiles = ([f]) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const rotate = (deg) => { setRotation(r => (r + deg + 360) % 360); setResult(null); };

  const apply = () => {
    if (!file || !preview) return;
    const img = new Image();
    img.onload = async () => {
      const rad = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
      const h = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const blob = await canvasToBlob(canvas, mime, quality / 100);
      setResult({ url: URL.createObjectURL(blob), blob, w, h, size: blob.size });
      canvas.width = 0;
      canvas.height = 0;
    };
    img.src = preview;
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setRotation(0); setFlipH(false); setFlipV(false); };
  useEffect(() => () => revokeObjectUrl(preview), [preview]);
  useEffect(() => () => revokeObjectUrl(result?.url), [result]);
  const fmt = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

  return (
    <div className="space-y-6">
      {!file ? (
        <ImageDropZone onFiles={onFiles} hint="Upload an image to rotate or flip" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Live preview with transform */}
          <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20 flex items-center justify-center min-h-48">
            <img
              src={result?.url || preview}
              alt="preview"
              className="max-w-full max-h-64 object-contain transition-transform duration-300"
              style={{
                transform: result ? 'none' : `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              }}
            />
          </div>

          {/* Quick rotation buttons */}
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 block">Rotate & Flip</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => rotate(-90)} className="rounded-xl gap-2 flex-1">
                <RotateCcw className="w-4 h-4" /> 90° Left
              </Button>
              <Button variant="outline" onClick={() => rotate(90)} className="rounded-xl gap-2 flex-1">
                <RotateCw className="w-4 h-4" /> 90° Right
              </Button>
              <Button variant="outline" onClick={() => rotate(180)} className="rounded-xl gap-2 flex-1">
                <RotateCw className="w-4 h-4" /> 180°
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant={flipH ? 'default' : 'outline'} onClick={() => { setFlipH(f => !f); setResult(null); }} className="rounded-xl gap-2 flex-1">
                <FlipHorizontal className="w-4 h-4" /> Flip Horizontal
              </Button>
              <Button variant={flipV ? 'default' : 'outline'} onClick={() => { setFlipV(f => !f); setResult(null); }} className="rounded-xl gap-2 flex-1">
                <FlipVertical className="w-4 h-4" /> Flip Vertical
              </Button>
            </div>
          </div>

          {/* Custom angle */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Custom Angle</span>
              <span className="font-bold text-primary">{rotation}°</span>
            </div>
            <input type="range" min={0} max={359} value={rotation} onChange={e => { setRotation(Number(e.target.value)); setResult(null); }}
              className="w-full accent-primary h-2 rounded-full cursor-pointer" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Export Quality</span><span className="font-bold text-primary">{quality}%</span></div>
            <input type="range" min={60} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full cursor-pointer" />
          </div>

          {result && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 text-center bg-muted/50 border border-border/40">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Output Size</p>
                <p className="font-bold text-sm">{result.w} × {result.h}</p>
              </div>
              <div className="rounded-2xl p-3 text-center bg-muted/50 border border-border/40">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">File Size</p>
                <p className="font-bold text-sm">{fmt(result.size)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!result ? (
              <Button onClick={apply} className="rounded-xl gap-2 px-6">Apply & Export</Button>
            ) : (
              <Button onClick={() => saveAs(result.url, `rotated_${file.name}`)} className="rounded-xl gap-2 px-6 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" /> Download
              </Button>
            )}
            {result && <Button variant="outline" onClick={() => setResult(null)} className="rounded-xl">Edit More</Button>}
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Start Over
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
