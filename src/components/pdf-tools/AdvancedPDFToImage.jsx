/**
 * PDF to Image — High-quality page rendering via pdfjs-dist
 * Renders each page on canvas with white background, exports JPEG/PNG
 * ZIP download via JSZip for batch export
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Download, Package, CheckCircle2 } from 'lucide-react';
import PDFDropZone from './PDFDropZone';
import { SingleFileCard } from './PDFFileCard';
import { formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const DPI_OPTIONS = [
  { label: '72 DPI', scale: 1, desc: 'Screen' },
  { label: '144 DPI', scale: 2, desc: 'Retina' },
  { label: '216 DPI', scale: 3, desc: 'High Res' },
  { label: '288 DPI', scale: 4, desc: 'Print' },
];

function parseRange(input, total) {
  const pages = new Set();
  for (const part of input.split(',').map(s => s.trim())) {
    if (!part) continue;
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= Math.min(b, total); i++) if (i >= 1) pages.add(i);
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= total) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export default function AdvancedPDFToImage() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(92);
  const [dpiOption, setDpiOption] = useState(DPI_OPTIONS[1]);
  const [transparent, setTransparent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);
  const [selectedPages, setSelectedPages] = useState('all');
  const [pageRange, setPageRange] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [pdfData, setPdfData] = useState(null);

  const handleFile = async (files) => {
    setFile(files[0]); setPages([]); setError(null);
    try {
      const ab = await files[0].arrayBuffer();
      const data = new Uint8Array(ab);
      setPdfData(data);
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      setTotalPages(pdf.numPages);
    } catch (e) { setError(e.message); setTotalPages(0); }
  };

  const getIndices = () => {
    if (selectedPages === 'all') return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (!pageRange.trim()) return Array.from({ length: totalPages }, (_, i) => i + 1);
    return parseRange(pageRange, totalPages);
  };

  const convert = async () => {
    setProcessing(true); setError(null); setPages([]); setProgressPct(0);
    try {
      const pdfjsLib = await loadPdfJs();
      setProgress('Loading PDF...');
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const indices = getIndices();
      const results = [];

      for (let i = 0; i < indices.length; i++) {
        const pageNum = indices[i];
        setProgress(`Rendering page ${i + 1} of ${indices.length}...`);
        setProgressPct(Math.round(((i + 1) / indices.length) * 95));
        const page = await pdf.getPage(pageNum);
        const scale = dpiOption.scale;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: false });

        // White background unless transparent PNG
        if (format !== 'png' || !transparent) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport, background: transparent ? 'transparent' : 'white' }).promise;

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const q = format === 'png' ? undefined : quality / 100;

        const blob = await new Promise(r => canvas.toBlob(r, mimeType, q));
        const dataUrl = canvas.toDataURL(mimeType, q);

        results.push({
          dataUrl, blob, page: pageNum,
          size: blob.size,
          w: canvas.width, h: canvas.height,
        });
        canvas.width = 0; canvas.height = 0; // Free memory
      }
      setProgressPct(100);
      setPages(results);
    } catch (e) { setError(e.message || 'Conversion failed'); }
    finally { setProcessing(false); setProgress(''); setProgressPct(0); }
  };

  const downloadOne = (p) => {
    const a = document.createElement('a');
    a.href = p.dataUrl; a.download = `page_${p.page}.${format}`; a.click();
  };

  const downloadAllZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      pages.forEach(p => {
        const data = p.dataUrl.split(',')[1];
        zip.file(`page_${p.page}.${format}`, data, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${file.name.replace('.pdf', '')}_images.zip`;
      a.click();
    } catch { pages.forEach((p, i) => setTimeout(() => downloadOne(p), i * 250)); }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 border border-pink-500/20">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-pink-600" /></div>
          <div>
            <p className="font-bold text-sm">PDF to Image</p>
            <p className="text-[10px] text-muted-foreground">High-quality rendering · PNG/JPG · DPI control · ZIP batch download</p>
          </div>
        </div>
      </div>

      {!file ? (
        <PDFDropZone onFiles={handleFile} label="Drop PDF to convert to images" sublabel="PDF files up to 200MB" />
      ) : (
        <div className="relative space-y-4">
          {processing && (
            <div className="absolute inset-0 rounded-2xl bg-background/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3 w-56 text-center">
                <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                <p className="text-sm font-medium">{progress}</p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-fuchsia-500 h-full rounded-full transition-all duration-200" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{progressPct}%</p>
              </div>
            </div>
          )}

          <SingleFileCard file={file} pageCount={totalPages} onRemove={() => { setFile(null); setPages([]); setTotalPages(0); }} />

          {/* Format + DPI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Output Format</label>
              <div className="flex gap-2">
                {['jpeg', 'png'].map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={cn('flex-1 py-2 rounded-lg border text-xs font-semibold uppercase transition-all', format === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Resolution</label>
              <div className="flex gap-1">
                {DPI_OPTIONS.map(d => (
                  <button key={d.label} onClick={() => setDpiOption(d)} title={d.desc}
                    className={cn('flex-1 py-2 rounded-lg border text-[10px] font-bold transition-all', dpiOption.scale === d.scale ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                    {d.desc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {format === 'jpeg' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex justify-between">
                <span>JPEG Quality</span><span className="font-bold text-foreground">{quality}%</span>
              </label>
              <input type="range" min="50" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-primary h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>Smaller file</span><span>Best quality</span></div>
            </div>
          )}

          {format === 'png' && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} className="rounded accent-primary" />
              <span>Transparent background <span className="text-muted-foreground text-xs">(removes white pages)</span></span>
            </label>
          )}

          {/* Page selection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Pages to Convert</label>
            <div className="flex gap-2 mb-2">
              {['all', 'range'].map(opt => (
                <button key={opt} onClick={() => setSelectedPages(opt)}
                  className={cn('flex-1 py-2 rounded-xl border text-xs font-semibold transition-all', selectedPages === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                  {opt === 'all' ? `All ${totalPages} Pages` : 'Custom Range'}
                </button>
              ))}
            </div>
            {selectedPages === 'range' && (
              <input value={pageRange} onChange={e => setPageRange(e.target.value)} placeholder="e.g. 1,3,5-8"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 ring-primary/30 outline-none" />
            )}
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          {pages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{pages.length} images ready</p>
                </div>
                <button onClick={downloadAllZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                  <Package className="w-3.5 h-3.5" /> Download ZIP
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence>
                  {pages.map(p => (
                    <motion.div key={p.page} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-border overflow-hidden group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all premium-card panel-highlight glow-border"
                      onClick={() => downloadOne(p)}>
                      <div className="aspect-[3/4] bg-white overflow-hidden">
                        <img src={p.dataUrl} alt={`Page ${p.page}`} className="w-full h-full object-contain" loading="lazy" />
                      </div>
                      <div className="px-2.5 py-2 flex items-center justify-between bg-card border-t border-border/50 glow-border">
                        <div>
                          <span className="text-xs font-semibold">Pg {p.page}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{p.w}×{p.h}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                          <Download className="w-3 h-3" />
                          <span className="text-[10px] font-medium">{formatSize(p.size)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <button onClick={convert} disabled={processing}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {processing ? progress : `Convert ${selectedPages === 'all' ? totalPages : (parseRange(pageRange, totalPages).length || totalPages)} Pages to ${format.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}