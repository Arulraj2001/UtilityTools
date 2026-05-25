import React, { useState } from 'react';
import DropZone from './shared/DropZone';
import ImagePreviewPanel from './shared/ImagePreviewPanel';
import { SizeComparison, DownloadButton, StatChip } from './shared/FileStats';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { processImageToTarget, loadImageFile, useImageProcessor } from './shared/useImageProcessor';
import { cn } from '@/lib/utils';

const BANK_PRESETS = [
  { id: 'ibps-po-photo', label: 'IBPS PO Photo', width: 200, height: 230, maxKB: 50, note: '200×230 px, 20-50 KB' },
  { id: 'ibps-clerk-photo', label: 'IBPS Clerk Photo', width: 200, height: 230, maxKB: 50, note: '200×230 px, 20-50 KB' },
  { id: 'sbi-po-photo', label: 'SBI PO Photo', width: 200, height: 230, maxKB: 50, note: '200×230 px, 20-50 KB' },
  { id: 'ibps-sig', label: 'IBPS Signature', width: 140, height: 60, maxKB: 20, note: '140×60 px, 10-20 KB' },
  { id: 'sbi-sig', label: 'SBI Signature', width: 140, height: 60, maxKB: 20, note: '140×60 px, 10-20 KB' },
  { id: 'rbi-photo', label: 'RBI/NABARD Photo', width: 200, height: 230, maxKB: 100, note: '200×230 px, max 100 KB' },
];

export default function BankExamPhotoTool() {
  const [file, setFile] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [preset, setPreset] = useState(BANK_PRESETS[0]);
  const [output, setOutput] = useState(null);
  const { processing, error, process } = useImageProcessor();

  const handleFile = async (f) => { setFile(f); setOutput(null); const d = await loadImageFile(f); setOriginalData(d); };
  const handleProcess = async () => {
    const result = await process(() => processImageToTarget({ file, targetWidth: preset.width, targetHeight: preset.height, targetMaxKB: preset.maxKB, format: 'image/jpeg' }));
    if (result) setOutput(result);
  };
  const reset = () => { setFile(null); setOriginalData(null); setOutput(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="text-2xl">🏦</div>
        <div>
          <p className="font-semibold text-sm">Banking Exam Photo Tool</p>
          <p className="text-xs text-muted-foreground mt-0.5">Resize photos and signatures for IBPS PO, SBI PO/Clerk, RBI, and NABARD exams to exact specifications.</p>
        </div>
      </div>
      {!file ? (
        <DropZone onFile={handleFile} label="Upload photo or signature" sublabel="JPG, PNG, WebP supported" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Resizing for banking exam..." />
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Banking Exam Preset</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BANK_PRESETS.map(p => (
                <button key={p.id} onClick={() => { setPreset(p); setOutput(null); }} className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', preset.id === p.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/30 border-border hover:border-primary/30')}>
                  <div className="font-semibold mb-0.5">{p.label}</div>
                  <div className="text-muted-foreground text-[10px]">{p.note}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Width" value={`${preset.width} px`} />
            <StatChip label="Height" value={`${preset.height} px`} />
            <StatChip label="Max Size" value={`${preset.maxKB} KB`} />
          </div>
          <ImagePreviewPanel original={originalData?.dataUrl} output={output} originalFile={file} onReset={reset} />
          {output && <SizeComparison originalBytes={file.size} outputBytes={output.sizeBytes} targetKB={preset.maxKB} />}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Processing...' : '🏦 Resize for Banking Exam'}
            </button>
            {output && <DownloadButton blob={output.blob} filename={`bank_exam_${preset.id}.jpg`} label="Download" />}
          </div>
          <button onClick={reset} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Upload different image</button>
        </div>
      )}
    </div>
  );
}