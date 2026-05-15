import React, { useState, useRef } from 'react';
import DropZone from './shared/DropZone';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { DownloadButton, StatChip } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { processImageToTarget, loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { cn } from '@/lib/utils';

const PASSPORT_SIZES = [
  { id: 'india-passport', label: 'India Passport', w: 354, h: 472, note: '35×45mm @240dpi' },
  { id: 'us-visa', label: 'US Visa', w: 600, h: 600, note: '2×2 inch @300dpi' },
  { id: 'uk-passport', label: 'UK Passport', w: 413, h: 531, note: '35×45mm @300dpi' },
  { id: 'ssc-photo', label: 'SSC Exam', w: 100, h: 120, note: '100×120px' },
  { id: 'stamp-size', label: 'Stamp Size', w: 177, h: 177, note: '1.5×1.5cm' },
];

const BG_COLORS = ['#FFFFFF', '#5B9BD5', '#E8F4F8', '#F5F5DC', '#D3ECFF'];

async function generatePassportSheet(dataUrl, pw, ph, bgColor) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 4x6 inch sheet at 300 dpi
      const sheetW = 1800, sheetH = 1200;
      const padding = 20;
      const cols = Math.floor(sheetW / (pw + padding));
      const rows = Math.floor(sheetH / (ph + padding));
      const canvas = document.createElement('canvas');
      canvas.width = sheetW; canvas.height = sheetH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sheetW, sheetH);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * (pw + padding) + padding / 2;
          const y = r * (ph + padding) + padding / 2;
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, pw, ph);
          ctx.drawImage(img, x, y, pw, ph);
          // Guide lines
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x - 1, y - 1, pw + 2, ph + 2);
        }
      }
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ blob, dataUrl: e.target.result, count: rows * cols });
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.92);
    };
    img.src = dataUrl;
  });
}

export default function PassportSizePhotoMaker() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [size, setSize] = useState(PASSPORT_SIZES[0]);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [singleOutput, setSingleOutput] = useState(null);
  const [sheetOutput, setSheetOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => { setFile(f); setSingleOutput(null); setSheetOutput(null); const d = await loadImageFile(f); setOriginalData(d); };
  const reset = () => { setFile(null); setOriginalData(null); setSingleOutput(null); setSheetOutput(null); };

  const handleProcess = async () => {
    const single = await process(() => processImageToTarget({ file, targetWidth: size.w, targetHeight: size.h, targetMaxKB: 200, format: 'image/jpeg' }));
    if (!single) return;
    setSingleOutput(single);
    // Generate sheet
    const sheet = await generatePassportSheet(single.dataUrl, size.w, size.h, bgColor);
    setSheetOutput(sheet);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="text-2xl">📸</div>
        <div>
          <p className="font-semibold text-sm">Passport Size Photo Maker</p>
          <p className="text-xs text-muted-foreground mt-0.5">Create passport size photos with exact dimensions. Generates a printable 4×6 sheet with multiple copies.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload your photo" sublabel="JPG, PNG, WebP supported" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Creating passport photos..." />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Photo Size</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PASSPORT_SIZES.map(s => (
                <button key={s.id} onClick={() => setSize(s)} className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', size.id === s.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/30 border-border hover:border-primary/30')}>
                  <div className="font-semibold mb-0.5">{s.label}</div>
                  <div className="text-muted-foreground text-[10px]">{s.note}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Background Color</label>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => setBgColor(c)} style={{ background: c }} className={cn('w-8 h-8 rounded-lg border-2 transition-all', bgColor === c ? 'border-primary scale-110' : 'border-border')} />
              ))}
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" title="Custom color" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Width" value={`${size.w} px`} />
            <StatChip label="Height" value={`${size.h} px`} />
            <StatChip label="Format" value="JPEG" />
          </div>

          <ImagePreviewPanel original={originalData?.dataUrl} output={singleOutput} originalFile={file} onReset={reset} />

          {sheetOutput && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 text-xs font-medium">Print Sheet ({sheetOutput.count} copies)</div>
              <img src={sheetOutput.dataUrl} alt="Print sheet" className="w-full" />
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Creating...' : '📸 Create Photos'}
            </button>
            {sheetOutput && <DownloadButton blob={sheetOutput.blob} filename="passport_print_sheet.jpg" label="Download Sheet" />}
          </div>
          {singleOutput && (
            <DownloadButton blob={singleOutput.blob} filename={`passport_${size.id}.jpg`} label="Download Single Photo" />
          )}
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}