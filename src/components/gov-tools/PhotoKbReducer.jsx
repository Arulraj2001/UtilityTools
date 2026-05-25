import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DropZone from './shared/DropZone';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { SizeComparison, DownloadButton } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { processImageToTarget, loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { formatFileSize } from './shared/ExamPresets';

const QUICK_TARGETS = [10, 15, 20, 30, 50, 100, 200];

export default function PhotoKbReducer() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [targetKB, setTargetKB] = useState(20);
  const [output, setOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => { setFile(f); setOutput(null); const d = await loadImageFile(f); setOriginalData(d); };

  const handleProcess = async () => {
    const result = await process(() => processImageToTarget({
      file,
      targetWidth: originalData?.width,
      targetHeight: originalData?.height,
      targetMaxKB: targetKB,
      format: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    }));
    if (result) setOutput(result);
  };

  const reset = () => { setFile(null); setOriginalData(null); setOutput(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="text-2xl">📉</div>
        <div>
          <p className="font-semibold text-sm">Photo KB Reducer</p>
          <p className="text-xs text-muted-foreground mt-0.5">Compress your photo to an exact target KB size using binary search quality optimization. Perfect for exam portals with strict size limits.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} label="Upload photo to compress" sublabel="JPG, PNG, WebP supported" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message={`Compressing to ${targetKB} KB...`} />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Quick Targets</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TARGETS.map(kb => (
                <button key={kb} onClick={() => setTargetKB(kb)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${targetKB === kb ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/40'}`}>
                  {kb} KB
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Custom Target: <span className="text-primary">{targetKB} KB</span>
            </label>
            <input type="range" min="5" max="500" value={targetKB} onChange={e => setTargetKB(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5 KB</span><span>500 KB</span></div>
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Current size: <strong className="text-foreground">{formatFileSize(file.size)}</strong></span>
              <span>→</span>
              <span>Target: <strong className="text-primary">{targetKB} KB</strong></span>
            </div>
          )}

          <ImagePreviewPanel original={originalData?.dataUrl} output={output} originalFile={file} onReset={reset} />
          {output && <SizeComparison originalBytes={file.size} outputBytes={output.sizeBytes} targetKB={targetKB} />}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Compressing...' : `📉 Reduce to ${targetKB} KB`}
            </button>
            {output && <DownloadButton blob={output.blob} filename={`photo_${targetKB}kb.jpg`} label="Download" />}
          </div>
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}