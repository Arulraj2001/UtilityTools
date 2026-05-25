import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DropZone from './shared/DropZone';
import { DownloadButton } from './shared/FileStats';
import { cn } from '@/lib/utils';

export default function SignatureMaker() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [mode, setMode] = useState('draw'); // 'draw' | 'upload'
  const [inkColor, setInkColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [bgMode, setBgMode] = useState('white'); // 'white' | 'transparent'
  const [uploadBlob, setUploadBlob] = useState(null);
  const [uploadDataUrl, setUploadDataUrl] = useState(null);
  const lastPos = useRef(null);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => { if (mode === 'draw') initCanvas(); }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e, canvasRef.current);
    lastPos.current = pos;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawing(true);
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => { initCanvas(); setHasDrawing(false); };

  const getSignatureBlob = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (bgMode === 'transparent') {
        // Remove white bg — make white pixels transparent
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width; offscreen.height = canvas.height;
        const ctx2 = offscreen.getContext('2d');
        ctx2.drawImage(canvas, 0, 0);
        const id = ctx2.getImageData(0, 0, offscreen.width, offscreen.height);
        for (let i = 0; i < id.data.length; i += 4) {
          const r = id.data[i], g = id.data[i + 1], b = id.data[i + 2];
          if (r > 230 && g > 230 && b > 230) id.data[i + 3] = 0;
        }
        ctx2.putImageData(id, 0, 0);
        offscreen.toBlob(resolve, 'image/png');
      } else {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      }
    });
  };

  const handleUpload = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadDataUrl(e.target.result);
      // Process uploaded signature
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 560; canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 560, 120);
        // Scale to fit
        const scale = Math.min(560 / img.width, 120 / img.height);
        const x = (560 - img.width * scale) / 2;
        const y = (120 - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        canvas.toBlob((blob) => setUploadBlob(blob), 'image/jpeg', 0.92);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  };

  const [downloadBlob, setDownloadBlob] = useState(null);
  const handlePrepareDownload = async () => {
    if (mode === 'draw') {
      const blob = await getSignatureBlob();
      setDownloadBlob(blob);
    } else {
      setDownloadBlob(uploadBlob);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
        <div className="text-2xl">✒️</div>
        <div>
          <p className="font-semibold text-sm">Signature Maker</p>
          <p className="text-xs text-muted-foreground mt-0.5">Draw your signature or upload an existing one. Export as transparent PNG or white background JPG for exam portals.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['draw', 'upload'].map(m => (
          <button key={m} onClick={() => setMode(m)} className={cn('flex-1 py-2 rounded-xl text-sm font-semibold border transition-all capitalize', mode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border')}>
            {m === 'draw' ? '✏️ Draw' : '📤 Upload'}
          </button>
        ))}
      </div>

      {mode === 'draw' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Ink:</label>
              <input type="color" value={inkColor} onChange={e => setInkColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Width: {strokeWidth}</label>
              <input type="range" min="1" max="8" step="0.5" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-24 accent-primary" />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Export:</span>
              {['white', 'transparent'].map(bg => (
                <button key={bg} onClick={() => setBgMode(bg)} className={cn('px-2 py-1 rounded border text-xs', bgMode === bg ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border')}>
                  {bg === 'white' ? 'White BG' : 'Transparent'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-border bg-white overflow-hidden cursor-crosshair select-none touch-none"
            style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} width={560} height={120} className="w-full"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          </div>
          <p className="text-xs text-center text-muted-foreground">Sign above with mouse or finger</p>

          <div className="flex gap-3">
            <button onClick={clearCanvas} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Clear</button>
            <button onClick={handlePrepareDownload} disabled={!hasDrawing} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
              Prepare Download
            </button>
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-4">
          <DropZone onFile={handleUpload} label="Upload signature image" sublabel="JPG, PNG with white background preferred" />
          {uploadDataUrl && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="p-2 bg-muted text-xs font-medium">Preview</div>
              <div className="flex justify-center p-4 bg-white">
                <img src={uploadDataUrl} alt="Signature preview" className="max-h-24 object-contain" />
              </div>
            </div>
          )}
          {uploadBlob && (
            <button onClick={handlePrepareDownload} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">
              Prepare Download
            </button>
          )}
        </div>
      )}

      {downloadBlob && (
        <DownloadButton blob={downloadBlob} filename={bgMode === 'transparent' ? 'signature.png' : 'signature.jpg'} label="⬇ Download Signature" />
      )}
    </div>
  );
}