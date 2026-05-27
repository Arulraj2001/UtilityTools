import React, { useState } from 'react';
import DropZone from './shared/DropZone';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { DownloadButton } from './shared/FileStats';
import { formatFileSize } from './shared/ExamPresets';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recompressPdfData } from '@/lib/pdfCompression';

const DOC_TYPES = [
  { id: 'certificate', label: 'Certificate', targetKB: 200, note: 'Educational/professional certificates' },
  { id: 'marksheet', label: 'Mark Sheet', targetKB: 300, note: 'School/college mark sheets' },
  { id: 'aadhaar', label: 'Aadhaar Card', targetKB: 100, note: 'UIDAI Aadhaar card scans' },
  { id: 'pan', label: 'PAN Card', targetKB: 80, note: 'Income tax PAN card' },
  { id: 'photo-id', label: 'Photo ID', targetKB: 150, note: 'Voter ID, Driving license' },
  { id: 'custom', label: 'Custom', targetKB: null, note: 'Set your own target' },
];

const DOC_COMPRESSION = {
  certificate: { scale: 1.45, quality: 0.72 },
  marksheet: { scale: 1.55, quality: 0.74 },
  aadhaar: { scale: 1.25, quality: 0.62 },
  pan: { scale: 1.2, quality: 0.6 },
  'photo-id': { scale: 1.35, quality: 0.66 },
  custom: { scale: 1.35, quality: 0.66 },
};

export default function ExamDocumentPdfCompressor() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [customKB, setCustomKB] = useState('');
  const [processing, setProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (f) => { setFile(f); setOutputBlob(null); setError(null); };

  const handleCompress = async () => {
    setProcessing(true); setError(null);
    try {
      if (!targetKB || Number.isNaN(targetKB)) throw new Error('Please select or enter a valid target size.');
      const ab = await file.arrayBuffer();
      const settings = DOC_COMPRESSION[docType.id] || DOC_COMPRESSION.custom;
      const { blob } = await recompressPdfData(ab, {
        ...settings,
        targetKB,
      });
      setOutputBlob(blob); setOutputSize(blob.size);
    } catch (e) {
      setError(e.message || 'Compression failed');
    } finally {
      setProcessing(false);
    }
  };

  const targetKB = docType.id === 'custom' ? parseFloat(customKB) : docType.targetKB;
  const withinTarget = outputSize && targetKB ? (outputSize / 1024) <= targetKB : false;
  const saved = file && outputSize ? file.size - outputSize : 0;
  const savedPct = file ? ((saved / file.size) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
        <div className="text-2xl">🗂️</div>
        <div>
          <p className="font-semibold text-sm">Exam Document PDF Compressor</p>
          <p className="text-xs text-muted-foreground mt-0.5">Compress certificates, mark sheets, Aadhaar, PAN scans for exam portal uploads. Optimized presets for each document type.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} accept="pdf" label="Upload exam document PDF" sublabel="PDF files — certificates, mark sheets, IDs" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Compressing exam document..." />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setOutputBlob(null); }} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Document Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOC_TYPES.map(d => (
                <button key={d.id} onClick={() => setDocType(d)} className={cn('text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all', docType.id === d.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/30 border-border hover:border-primary/30')}>
                  <div className="font-semibold">{d.label}</div>
                  <div className="text-muted-foreground text-[10px]">{d.note}</div>
                  {d.targetKB && <div className="text-primary text-[10px] mt-0.5">Target: {d.targetKB} KB</div>}
                </button>
              ))}
            </div>
          </div>

          {docType.id === 'custom' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target size (KB)</label>
              <input type="number" value={customKB} onChange={e => setCustomKB(e.target.value)} placeholder="e.g. 150" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
          )}

          {outputBlob && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl border p-4', withinTarget ? 'border-green-500/30 bg-green-500/10' : 'border-orange-400/30 bg-orange-400/10')}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className={cn('w-4 h-4', withinTarget ? 'text-green-500' : 'text-orange-400')} />
                <span className={cn('text-sm font-semibold', withinTarget ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')}>
                  {withinTarget ? 'Within target limit!' : `Exceeds ${targetKB} KB target`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-white/50 dark:bg-white/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Original</div><div className="font-bold">{formatFileSize(file.size)}</div></div>
                <div className="bg-primary/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Output</div><div className="font-bold text-primary">{formatFileSize(outputSize)}</div></div>
                <div className="bg-green-500/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Saved</div><div className="font-bold text-green-600">{savedPct}%</div></div>
              </div>
            </motion.div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleCompress} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Compressing...' : '🗜️ Compress Document'}
            </button>
            {outputBlob && <DownloadButton blob={outputBlob} filename={`compressed_${file.name}`} label="Download" />}
          </div>
        </div>
      )}
    </div>
  );
}
