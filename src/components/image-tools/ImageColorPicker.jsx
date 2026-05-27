import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, Check, Pipette, Palette } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { revokeObjectUrl } from '@/lib/fileProcessing';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function extractPalette(ctx, w, h, count = 8) {
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 2000)));
  const imageData = ctx.getImageData(0, 0, w, h).data;
  const buckets = {};
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const px = [imageData[idx], imageData[idx + 1], imageData[idx + 2]];
      const key = `${Math.round(px[0] / 32) * 32},${Math.round(px[1] / 32) * 32},${Math.round(px[2] / 32) * 32}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
  }
  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([k]) => {
      const [r, g, b] = k.split(',').map(Number);
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    });
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 rounded-md hover:bg-muted transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function ImageColorPicker() {
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [pickedColor, setPickedColor] = useState(null);
  const [palette, setPalette] = useState([]);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const onFiles = ([f]) => {
    setFile(f);
    setPickedColor(null);
    setImgSrc(URL.createObjectURL(f));
  };

  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctxRef.current = ctx;
      setPalette(extractPalette(ctx, img.width, img.height));
    };
    img.src = imgSrc;
  }, [imgSrc]);

  useEffect(() => () => revokeObjectUrl(imgSrc), [imgSrc]);

  const pick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const px = ctxRef.current.getImageData(x, y, 1, 1).data;
    const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    const rgb = { r: px[0], g: px[1], b: px[2] };
    const hsl = rgbToHsl(px[0], px[1], px[2]);
    setPickedColor({ hex, rgb, hsl });
  }, []);

  const reset = () => { setFile(null); setImgSrc(null); setPickedColor(null); setPalette([]); };

  return (
    <div className="space-y-6">
      {!imgSrc ? (
        <ImageDropZone onFiles={onFiles} hint="Upload an image to pick colors from it" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/20 cursor-crosshair">
            <canvas ref={canvasRef} onClick={pick} className="w-full max-h-64 object-contain" />
            <div className="absolute top-2 left-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
              <Pipette className="w-3 h-3" /> Click to pick a color
            </div>
          </div>

          {/* Picked color */}
          {pickedColor && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 overflow-hidden">
              <div className="h-16 w-full" style={{ background: pickedColor.hex }} />
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'HEX', value: pickedColor.hex },
                  { label: 'RGB', value: `rgb(${pickedColor.rgb.r}, ${pickedColor.rgb.g}, ${pickedColor.rgb.b})` },
                  { label: 'HSL', value: `hsl(${pickedColor.hsl.h}, ${pickedColor.hsl.s}%, ${pickedColor.hsl.l}%)` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-mono font-bold truncate">{value}</p>
                      <CopyBtn value={value} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Palette */}
          {palette.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Dominant Colors
              </p>
              <div className="flex flex-wrap gap-2">
                {palette.map((hex, i) => (
                  <button key={i} onClick={() => {
                    const { r, g, b } = hexToRgb(hex);
                    setPickedColor({ hex, rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) });
                  }}
                    title={hex}
                    className="group relative w-10 h-10 rounded-xl border-2 border-white/20 shadow-md hover:scale-110 transition-transform"
                    style={{ background: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={reset} className="w-full rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Start Over
          </Button>
        </motion.div>
      )}
    </div>
  );
}
