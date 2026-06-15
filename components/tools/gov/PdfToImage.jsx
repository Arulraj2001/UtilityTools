import React, { useEffect, useState } from 'react';
import DropZone from './shared/DropZone';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { formatFileSize } from './shared/ExamPresets';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData, revokeObjectUrl } from '@/lib/fileProcessing';

// Load PDF.js with proper worker configuration
function loadPdfJs() {
  return Promise.resolve(getPdfJsLib());
}

export default function PdfToImage() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(85);
  const [scale, setScale] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);

  const handleFile = (f) => { setFile(f); setPages([]); setError(null); };

  useEffect(() => {
    return () => {
      pages.forEach(p => revokeObjectUrl(p.dataUrl));
    };
  }, [pages]);

  const handleConvert = async () => {
    setProcessing(true); setError(null); setPages([]);
    try {
      setProgress('Loading PDF.js...');
      const pdfjsLib = await loadPdfJs();
      const ab = await file.arrayBuffer();
      setProgress('Parsing PDF...');
      const pdf = await pdfjsLib.getDocument({ data: clonePdfData(ab) }).promise;
      const total = pdf.numPages;
      const results = [];
      for (let i = 1; i <= total; i++) {
        setProgress(`Rendering page ${i}/${total}...`);
        const page = await pdf.getPage(i);
        let viewport = page.getViewport({ scale });
        const pixels = viewport.width * viewport.height;
        if (pixels > 80_000_000) {
          viewport = page.getViewport({ scale: scale * Math.sqrt(80_000_000 / pixels) });
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const blob = await canvasToBlob(canvas, mimeType, format === 'png' ? undefined : quality / 100);
        const dataUrl = URL.createObjectURL(blob);
        results.push({ dataUrl, blob, page: i, size: blob.size });
        canvas.width = 0;
        canvas.height = 0;
      }
      setPages(results);
    } catch (e) {
      setError(e.message || 'Conversion failed');
    } finally {
      setProcessing(false); setProgress('');
    }
  };

  const downloadOne = (p) => {
    const a = document.createElement('a');
    a.href = p.dataUrl; a.download = `page_${p.page}.${format}`; a.click();
  };

  const downloadAll = async () => {
    if (pages.length === 1) { downloadOne(pages[0]); return; }
    // Download all individually if JSZip not available
    pages.forEach((p, i) => {
      setTimeout(() => downloadOne(p), i * 300);
    });
  };

  const reset = () => { setFile(null); setPages([]); setError(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
        <div className="text-2xl">🖼️</div>
        <div>
          <p className="font-semibold text-sm">PDF to Image</p>
          <p className="text-xs text-muted-foreground mt-0.5">Convert PDF pages to JPG or PNG images. Download individual pages or all at once.</p>
        </div>
      </div>

      {!file ? (
        <DropZone onFile={handleFile} accept="pdf" label="Upload PDF to convert" sublabel="PDF files up to 50MB" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message={progress || 'Converting...'} />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quality: {quality}%</label>
              <input type="range" min="40" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Scale: {scale}x</label>
              <input type="range" min="1" max="3" step="0.5" value={scale} onChange={e => setScale(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleConvert} disabled={processing} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? (progress || 'Converting...') : '🖼️ Convert to Images'}
            </button>
            {pages.length > 0 && (
              <button onClick={downloadAll} className="px-5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download All
              </button>
            )}
          </div>

          {pages.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">{pages.length} Pages Converted</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence>
                  {pages.map(p => (
                    <motion.div key={p.page} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-border overflow-hidden bg-muted/20 group cursor-pointer hover:border-primary/40 transition-all"
                      onClick={() => downloadOne(p)}>
                      <img src={p.dataUrl} alt={`Page ${p.page}`} className="w-full aspect-[3/4] object-contain bg-white" />
                      <div className="px-2 py-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium">Page {p.page}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                          <Download className="w-3 h-3" />
                          <span>{formatFileSize(p.size)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
