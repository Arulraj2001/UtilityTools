import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw, Type } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import { canvasToBlob, revokeObjectUrl } from '@/lib/fileProcessing';

const POSITIONS = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right', 'tiled'];

export default function ImageWatermark() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('© Watermark');
  const [opacity, setOpacity] = useState(60);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [position, setPosition] = useState('bottom-right');
  const [rotation, setRotation] = useState(-30);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);

  const onFiles = ([f]) => {
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const apply = () => {
    if (!file || !preview) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const pad = 40;
      const tw = ctx.measureText(text).width;
      const th = fontSize;

      if (position === 'tiled') {
        ctx.save();
        for (let y = 0; y < img.height + fontSize * 4; y += fontSize * 4) {
          for (let x = -tw; x < img.width + tw; x += tw + 80) {
            ctx.save();
            ctx.translate(x + (y % (fontSize * 8) > 0 ? tw / 2 : 0), y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
        ctx.restore();
      } else {
        let x = img.width / 2;
        let y = img.height / 2;
        if (position === 'top-left') { x = pad + tw / 2; y = pad + th / 2; }
        if (position === 'top-right') { x = img.width - pad - tw / 2; y = pad + th / 2; }
        if (position === 'bottom-left') { x = pad + tw / 2; y = img.height - pad - th / 2; }
        if (position === 'bottom-right') { x = img.width - pad - tw / 2; y = img.height - pad - th / 2; }
        ctx.save();
        ctx.translate(x, y);
        if (position !== 'center') ctx.rotate(0);
        else ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      const blob = await canvasToBlob(canvas, file.type || 'image/jpeg', 0.95);
      canvas.width = 0;
      canvas.height = 0;
        setResult({ url: URL.createObjectURL(blob), blob });
    };
    img.src = preview;
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); };

  useEffect(() => () => revokeObjectUrl(preview), [preview]);
  useEffect(() => () => revokeObjectUrl(result?.url), [result]);

  return (
    <div className="space-y-6">
      {!file ? (
        <ImageDropZone onFiles={onFiles} hint="Upload an image to add a text watermark" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Preview */}
          <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
            <img src={result?.url || preview} alt="preview" className="w-full max-h-60 object-contain" />
          </div>

          {/* Watermark text */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Watermark Text</Label>
            <Input value={text} onChange={e => { setText(e.target.value); setResult(null); }} className="rounded-xl" />
          </div>

          {/* Position */}
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Position</Label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(p => (
                <button key={p} onClick={() => { setPosition(p); setResult(null); }}
                  className={`text-xs px-3 py-1.5 rounded-xl border capitalize transition-all ${
                    position === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border/50 hover:border-primary/50'
                  }`}>
                  {p.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Opacity</span><span className="font-bold text-primary">{opacity}%</span></div>
              <input type="range" min={10} max={100} value={opacity} onChange={e => { setOpacity(Number(e.target.value)); setResult(null); }}
                className="w-full accent-primary h-2 rounded-full cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Font Size</span><span className="font-bold text-primary">{fontSize}px</span></div>
              <input type="range" min={12} max={200} value={fontSize} onChange={e => { setFontSize(Number(e.target.value)); setResult(null); }}
                className="w-full accent-primary h-2 rounded-full cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => { setColor(e.target.value); setResult(null); }} className="h-9 w-16 rounded-lg cursor-pointer border border-border" />
                <Input value={color} onChange={e => { setColor(e.target.value); setResult(null); }} className="rounded-xl flex-1" />
              </div>
            </div>
            {(position === 'center' || position === 'tiled') && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Rotation</span><span className="font-bold text-primary">{rotation}°</span></div>
                <input type="range" min={-90} max={90} value={rotation} onChange={e => { setRotation(Number(e.target.value)); setResult(null); }}
                  className="w-full accent-primary h-2 rounded-full cursor-pointer" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={apply} className="rounded-xl gap-2 px-6">Apply Watermark</Button>
            {result && (
              <Button onClick={() => saveAs(result.url, `watermarked_${file.name}`)} className="rounded-xl gap-2 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" /> Download
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
