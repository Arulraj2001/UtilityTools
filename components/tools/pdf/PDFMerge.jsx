import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, X, Plus, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadPdfLib, DropZone, StatChip } from './PDFHelpers';

export default function PDFMerge() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const addFiles = (newFiles) => {
    const pdfFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles.map((f, i) => ({ file: f, id: Date.now() + i }))]);
    setResult(null);
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const moveUp = (i) => { if (i === 0) return; const arr = [...files]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; setFiles(arr); };
  const moveDown = (i) => { if (i === files.length - 1) return; const arr = [...files]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; setFiles(arr); };

  const merge = async () => {
    if (files.length < 2) return;
    setLoading(true);
    const startTime = Date.now();
    const { PDFDocument } = await loadPdfLib();
    const merged = await PDFDocument.create();
    let totalPages = 0;
    const totalInputSize = files.reduce((sum, { file }) => sum + file.size, 0);

    for (const { file } of files) {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
      totalPages += doc.getPageCount();
    }

    const pdfBytes = await merged.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const processingTime = Date.now() - startTime;

    setResult({
      url: URL.createObjectURL(blob),
      filename: 'merged.pdf',
      label: 'merged.pdf',
      stats: {
        originalSize: totalInputSize,
        newSize: blob.size,
        pages: totalPages,
        format: 'PDF',
        processingTime
      }
    });
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <DropZone onFiles={addFiles} inputRef={inputRef} accept=".pdf,application/pdf" label="Drop PDF files here or click to upload" sub="Add multiple PDFs to merge" />

      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Files to merge ({files.length})</Label>
          {files.map(({ file, id }, i) => (
            <div key={id} className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-card">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              <div className="flex gap-1">
                <button onClick={() => moveUp(i)} className="p-1 hover:bg-muted rounded"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveDown(i)} className="p-1 hover:bg-muted rounded"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeFile(id)} className="p-1 hover:bg-destructive/10 rounded text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <Button onClick={() => inputRef.current?.click()} variant="outline" size="sm" className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Add More
          </Button>
        </div>
      )}

      {files.length >= 2 && (
        <Button onClick={merge} disabled={loading} className="rounded-xl gap-2 w-full sm:w-auto">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {loading ? 'Merging…' : `Merge ${files.length} PDFs`}
        </Button>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">Merge Complete!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Total Input" value={`${(result.stats.originalSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Output Size" value={`${(result.stats.newSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Pages" value={result.stats.pages} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download Merged PDF
              </Button>
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
