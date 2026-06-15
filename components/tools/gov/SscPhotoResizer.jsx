import React, { useState } from 'react';
import DropZone from './shared/DropZone';
import PresetSelector from './shared/PresetSelector';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { SizeComparison, DownloadButton, StatChip } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { EXAM_PRESETS } from './shared/ExamPresets';
import { processImageToTarget, loadImageFile, useImageProcessor } from './shared/useImageProcessor';

export default function SscPhotoResizer() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [preset, setPreset] = useState(EXAM_PRESETS.photo[0]);
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customKB, setCustomKB] = useState('');
  const [output, setOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => {
    setFile(f);
    setOutput(null);
    const data = await loadImageFile(f);
    setOriginalData(data);
  };

  const handleProcess = async () => {
    const w = preset.id === 'custom' ? parseInt(customW) : preset.width;
    const h = preset.id === 'custom' ? parseInt(customH) : preset.height;
    const kb = preset.id === 'custom' ? parseFloat(customKB) : preset.maxKB;
    const result = await process(() => processImageToTarget({ file, targetWidth: w, targetHeight: h, targetMaxKB: kb, format: 'image/jpeg' }));
    if (result) setOutput(result);
  };

  const reset = () => { setFile(null); setOriginalData(null); setOutput(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="text-2xl">🏛️</div>
        <div>
          <p className="font-semibold text-sm">SSC Photo Resizer</p>
          <p className="text-xs text-muted-foreground mt-0.5">Resize your photo to exact SSC, IBPS, RRB, UPSC or TNPSC requirements. All processing is 100% client-side.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload your passport photo" sublabel="JPG, PNG, WebP, HEIC supported" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Resizing & compressing..." />

          <PresetSelector presets={EXAM_PRESETS.photo} value={preset} onChange={(p) => { setPreset(p); setOutput(null); }} />

          {preset.id === 'custom' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Width (px)</label>
                <input type="number" value={customW} onChange={e => setCustomW(e.target.value)} placeholder="e.g. 200" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Height (px)</label>
                <input type="number" value={customH} onChange={e => setCustomH(e.target.value)} placeholder="e.g. 230" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max KB</label>
                <input type="number" value={customKB} onChange={e => setCustomKB(e.target.value)} placeholder="e.g. 50" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
          )}

          {preset.id !== 'custom' && (
            <div className="grid grid-cols-3 gap-2">
              <StatChip label="Width" value={`${preset.width} px`} />
              <StatChip label="Height" value={`${preset.height} px`} />
              <StatChip label="Max Size" value={`${preset.maxKB} KB`} />
            </div>
          )}

          <ImagePreviewPanel original={originalData?.dataUrl} output={output} originalFile={file} onReset={reset} />

          {output && <SizeComparison originalBytes={file.size} outputBytes={output.sizeBytes} targetKB={preset.id !== 'custom' ? preset.maxKB : parseFloat(customKB)} />}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Processing...' : '⚡ Resize & Compress'}
            </button>
            {output && <DownloadButton blob={output.blob} filename={`photo_${preset.id}.jpg`} label="Download" />}
          </div>
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}
