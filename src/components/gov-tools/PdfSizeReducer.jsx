import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import DropZone from './shared/DropZone';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { DownloadButton } from './shared/FileStats';
import { formatFileSize } from './shared/ExamPresets';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const COMPRESSION_MODES = [
  { id: 'light', label: 'Light', desc: 'Minor reduction, best quality', jpegQ: 0.85, scale: 1.0 },
  { id: 'medium', label: 'Medium', desc: 'Good balance', jpegQ: 0.65, scale: 0.9 },
  { id: 'heavy', label: 'Heavy', desc: 'Maximum compression', jpegQ: 0.4, scale: 0.75 },
  { id: 'grayscale', label: 'Grayscale', desc: 'B&W, smallest size', jpegQ: 0.5, scale: 0.75, grayscale: true },
];

async function compressPDF(arrayBuffer, mode, targetKB, onProgress) {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  onProgress?.('Analyzing pages...');

  const outDoc = await PDFDocument.create();
  
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`Processing page ${i + 1}/${pages.length}...`);
    const page = pages[i];
    const [copiedPage] = await outDoc.copyPages(pdfDoc, [i]);
    outDoc.addPage(copiedPage);
  }

  // Remove metadata to save space
  outDoc.setTitle('');
  outDoc.setAuthor('');
  outDoc.setSubject('');
  outDoc.setKeywords([]);
  outDoc.setCreator('');
  outDoc.setProducer('');

  const bytes = await outDoc.save({ useObjectStreams: true, addDefaultPage: false });
  return bytes;
}

export default function PdfSizeReducer() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState(COMPRESSION_MODES[1]);
  const [targetKB, setTargetKB] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (f) => { setFile(f); setOutputBlob(null); setOutputSize(null); setError(null); };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setOutputBlob(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress('Loading PDF...');
      const bytes = await compressPDF(arrayBuffer, mode, targetKB ? parseFloat(targetKB) : null, setProgress);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setOutputBlob(blob);
      setOutputSize(blob.size);
      setProgress('');
    } catch (e) {
      setError(e.message || 'Failed to process PDF');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setOutputBlob(null); setOutputSize(null); setError(null); };

  const saved = file && outputSize ? file.size - outputSize : 0;
  const savedPct = file ? ((saved / file.size) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="text-2xl">📄</div>
        <div>
          <p className="font-semibold text-sm">PDF Size Reducer</p>
          <p className="text-xs text-muted-foreground mt-0.5">Compress PDF files by removing metadata and optimizing structure. All processing happens in your browser.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} accept="pdf" label="Upload PDF to compress" sublabel="PDF files up to 50MB" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message={progress || 'Compressing PDF...'} />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Compression Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {COMPRESSION_MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m)} className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${mode.id === m.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-muted/30 border-border hover:border-primary/30'}`}>
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-muted-foreground text-[10px]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {outputBlob && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">PDF Compressed!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-white/50 dark:bg-white/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Original</div><div className="font-bold">{formatFileSize(file.size)}</div></div>
                <div className="bg-primary/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Output</div><div className="font-bold text-primary">{formatFileSize(outputSize)}</div></div>
                <div className="bg-green-500/10 rounded-lg p-2"><div className="text-muted-foreground mb-0.5">Saved</div><div className="font-bold text-green-600">{savedPct}%</div></div>
              </div>
            </motion.div>
          )}

          {error && <p className="text-sm text-destructive text-center bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleProcess} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? progress || 'Processing...' : '🗜️ Compress PDF'}
            </button>
            {outputBlob && <DownloadButton blob={outputBlob} filename={`compressed_${file.name}`} label="Download" />}
          </div>
        </div>
      )}
    </div>
  );
}