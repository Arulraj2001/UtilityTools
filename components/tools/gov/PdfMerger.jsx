import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown, FileText, Plus } from 'lucide-react';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { DownloadButton } from './shared/FileStats';
import { formatFileSize } from './shared/ExamPresets';
import { cn } from '@/lib/utils';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.filter(f => f.type === 'application/pdf').map(f => ({ file: f, id: Math.random().toString(36).slice(2) }));
    setFiles(prev => [...prev, ...newFiles]);
    setOutputBlob(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true });

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const moveFile = (id, dir) => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true); setError(null);
    try {
      const mergedDoc = await PDFDocument.create();
      for (const { file } of files) {
        const ab = await file.arrayBuffer();
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      }
      const bytes = await mergedDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setOutputBlob(blob); setOutputSize(blob.size);
    } catch (e) {
      setError(e.message || 'Merge failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
        <div className="text-2xl">📎</div>
        <div>
          <p className="font-semibold text-sm">PDF Merger</p>
          <p className="text-xs text-muted-foreground mt-0.5">Merge multiple PDFs into one document. Reorder files as needed — perfect for combining certificates, mark sheets, and ID documents.</p>
        </div>
      </div>

      <div {...getRootProps()} className={cn('border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all', isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/20')}>
        <input {...getInputProps()} />
        <Plus className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{isDragActive ? 'Drop PDFs here' : 'Add more PDF files'}</p>
        <p className="text-xs text-muted-foreground mt-1">Drop multiple PDFs</p>
      </div>

      {files.length > 0 && (
        <div className="relative space-y-4">
          <ProcessingOverlay show={processing} message="Merging PDFs..." />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between">
              <span>Files to merge ({files.length})</span>
              <span>Total: {formatFileSize(totalSize)}</span>
            </label>
            <AnimatePresence>
              {files.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{f.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(f.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                    <button onClick={() => moveFile(f.id, -1)} disabled={i === 0} className="p-1 rounded hover:bg-border disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveFile(f.id, 1)} disabled={i === files.length - 1} className="p-1 rounded hover:bg-border disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeFile(f.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {outputBlob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Merged PDF ready — {formatFileSize(outputSize)}
            </motion.div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleMerge} disabled={processing || files.length < 2} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Merging...' : `📎 Merge ${files.length} PDFs`}
            </button>
            {outputBlob && <DownloadButton blob={outputBlob} filename="merged_document.pdf" label="Download" />}
          </div>
          {files.length < 2 && <p className="text-xs text-center text-muted-foreground">Add at least 2 PDFs to merge</p>}
        </div>
      )}
    </div>
  );
}