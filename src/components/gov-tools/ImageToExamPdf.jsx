import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripVertical, FileImage, ArrowUp, ArrowDown } from 'lucide-react';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { DownloadButton } from './shared/FileStats';
import { formatFileSize } from './shared/ExamPresets';
import { cn } from '@/lib/utils';

const PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  'A4 Landscape': [841.89, 595.28],
};

async function imagesToPdf(files, pageSize, grayscale, compress) {
  const pdfDoc = await PDFDocument.create();
  const [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const margin = 20;

  for (const file of files) {
    // Process image with canvas for compression/grayscale
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const processedDataUrl = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (grayscale) {
          ctx.filter = 'grayscale(100%)';
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const r = new FileReader();
          r.onload = e => resolve(e.target.result);
          r.readAsDataURL(blob);
        }, 'image/jpeg', compress ? 0.6 : 0.9);
      };
      img.src = dataUrl;
    });

    const base64 = processedDataUrl.split(',')[1];
    const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    let embeddedImg;
    try {
      embeddedImg = await pdfDoc.embedJpg(imgBytes);
    } catch {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
    }

    const page = pdfDoc.addPage([pw, ph]);
    const maxW = pw - margin * 2;
    const maxH = ph - margin * 2;
    const imgAspect = embeddedImg.width / embeddedImg.height;
    const boxAspect = maxW / maxH;
    let drawW, drawH;
    if (imgAspect > boxAspect) { drawW = maxW; drawH = maxW / imgAspect; }
    else { drawH = maxH; drawW = maxH * imgAspect; }
    const x = (pw - drawW) / 2;
    const y = (ph - drawH) / 2;
    page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export default function ImageToExamPdf() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [grayscale, setGrayscale] = useState(false);
  const [compress, setCompress] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, id: Math.random().toString(36).slice(2), preview: URL.createObjectURL(f) }));
    setFiles(prev => [...prev, ...newFiles]);
    setOutputBlob(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, multiple: true,
  });

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const moveFile = (id, dir) => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await imagesToPdf(files.map(f => f.file), pageSize, grayscale, compress);
      setOutputBlob(blob);
    } catch (e) {
      setError(e.message || 'Conversion failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <div className="text-2xl">📑</div>
        <div>
          <p className="font-semibold text-sm">Image to Exam PDF</p>
          <p className="text-xs text-muted-foreground mt-0.5">Convert one or multiple images into a PDF document. Reorder pages, apply compression, and export for exam portals.</p>
        </div>
      </div>

      <div {...getRootProps()} className={cn('border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all', isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/20')}>
        <input {...getInputProps()} />
        <FileImage className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{isDragActive ? 'Drop images here' : 'Drop images or click to upload'}</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — multiple files supported</p>
      </div>

      {files.length > 0 && (
        <div className="relative space-y-4">
          <ProcessingOverlay show={processing} message="Converting to PDF..." />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Pages ({files.length})</label>
            <AnimatePresence>
              {files.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/20">
                  <img src={f.preview} alt="" className="w-10 h-10 object-cover rounded-lg border border-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{f.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(f.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveFile(f.id, -1)} disabled={i === 0} className="p-1 rounded hover:bg-border disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveFile(f.id, 1)} disabled={i === files.length - 1} className="p-1 rounded hover:bg-border disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeFile(f.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.keys(PAGE_SIZES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm self-end pb-2">
              <input type="checkbox" checked={grayscale} onChange={e => setGrayscale(e.target.checked)} className="rounded" />
              <span>Grayscale</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm self-end pb-2">
              <input type="checkbox" checked={compress} onChange={e => setCompress(e.target.checked)} className="rounded" />
              <span>Compress images</span>
            </label>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleConvert} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Converting...' : '📑 Convert to PDF'}
            </button>
            {outputBlob && <DownloadButton blob={outputBlob} filename="exam_document.pdf" label="Download PDF" />}
          </div>
        </div>
      )}
    </div>
  );
}