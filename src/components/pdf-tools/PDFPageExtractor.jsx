/**
 * PDF Page Extractor — Visual thumbnail-based page selection
 * Uses pdfjs-dist to render page thumbnails, pdf-lib to extract
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Download, CheckSquare, Square, Package, X } from 'lucide-react';
import PDFDropZone from './PDFDropZone';
import { SingleFileCard } from './PDFFileCard';
import { DownloadBtn, formatSize } from './PDFResultCard';
import { cn } from '@/lib/utils';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';

function loadPdfJs() {
  return Promise.resolve(getPdfJsLib());
}

function parseRangeString(input, total) {
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

export default function PDFPageExtractor() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('visual'); // 'visual' | 'range'
  const [pdfBytes, setPdfBytes] = useState(null);

  const handleFile = async (files) => {
    const f = files[0];
    setFile(f); setThumbnails([]); setSelected(new Set()); setOutputBlob(null); setError(null);
    setLoadingThumbs(true); setThumbProgress(0);
    try {
      const ab = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(ab));
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPageCount(pdf.numPages);
      const thumbs = [];
      // Render up to 30 thumbnails (for large docs, just show first 30)
      const maxThumbs = Math.min(pdf.numPages, 40);
      for (let i = 1; i <= maxThumbs; i++) {
        setThumbProgress(Math.round((i / maxThumbs) * 100));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push({ page: i, dataUrl: canvas.toDataURL('image/jpeg', 0.7) });
        if (i % 5 === 0) setThumbnails([...thumbs]); // progressive render
      }
      setThumbnails(thumbs);
    } catch (e) { setError(e.message); }
    finally { setLoadingThumbs(false); setThumbProgress(0); }
  };

  const toggle = (n) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(n) ? s.delete(n) : s.add(n);
      return s;
    });
  };

  const selectAll = () => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  const selectNone = () => setSelected(new Set());
  const selectRange = () => {
    if (!rangeInput.trim()) return;
    const pages = parseRangeString(rangeInput, pageCount);
    setSelected(new Set(pages));
  };

  const extract = async () => {
    const pagesToExtract = mode === 'range' && rangeInput.trim()
      ? parseRangeString(rangeInput, pageCount)
      : Array.from(selected).sort((a, b) => a - b);
    if (!pagesToExtract.length) { setError('Select at least one page'); return; }
    setProcessing(true); setError(null);
    try {
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const indices = pagesToExtract.map(p => p - 1);
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach(p => outDoc.addPage(p));
      const bytes = await outDoc.save({ useObjectStreams: true });
      setOutputBlob(new Blob([bytes], { type: 'application/pdf' }));
    } catch (e) { setError(e.message || 'Extraction failed'); }
    finally { setProcessing(false); }
  };

  const selectedArr = mode === 'range' && rangeInput.trim()
    ? parseRangeString(rangeInput, pageCount)
    : Array.from(selected).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center"><Scissors className="w-4 h-4 text-violet-600" /></div>
          <div>
            <p className="font-bold text-sm">PDF Page Extractor</p>
            <p className="text-[10px] text-muted-foreground">Click thumbnails to select pages, or use range input</p>
          </div>
        </div>
      </div>

      {!file ? (
        <PDFDropZone onFiles={handleFile} label="Drop PDF to extract pages" sublabel="PDF files up to 200MB" />
      ) : (
        <div className="space-y-4">
          <SingleFileCard file={file} pageCount={pageCount} onRemove={() => { setFile(null); setThumbnails([]); setSelected(new Set()); setOutputBlob(null); setPdfBytes(null); }} />

          {/* Mode toggle */}
          <div className="flex gap-2">
            {['visual', 'range'].map(m => (
              <button key={m} onClick={() => { setMode(m); setOutputBlob(null); }}
                className={cn('flex-1 py-2 rounded-xl border text-xs font-semibold transition-all', mode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/40')}>
                {m === 'visual' ? '🖼 Visual Select' : '⌨️ Range Input'}
              </button>
            ))}
          </div>

          {mode === 'range' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Page Range ({pageCount} pages total)</label>
              <div className="flex gap-2">
                <input value={rangeInput} onChange={e => setRangeInput(e.target.value)} placeholder="e.g. 1,3,5-8,10-12"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 ring-primary/30 outline-none" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Commas for individual pages, hyphens for ranges</p>
              {rangeInput && <p className="text-xs text-primary mt-1 font-medium">{parseRangeString(rangeInput, pageCount).length} pages selected</p>}
            </div>
          )}

          {mode === 'visual' && (
            <div>
              {loadingThumbs ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading page thumbnails... {thumbProgress}%</p>
                  <div className="w-48 mx-auto bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${thumbProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{selected.size} of {pageCount} selected</label>
                    <div className="flex gap-2">
                      <button onClick={selectAll} className="text-xs text-primary hover:underline">All</button>
                      <button onClick={selectNone} className="text-xs text-muted-foreground hover:underline">None</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1 pb-1">
                    {thumbnails.map(t => (
                      <button key={t.page} onClick={() => toggle(t.page)}
                        className={cn('relative rounded-xl overflow-hidden border-2 transition-all group', selected.has(t.page) ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' : 'border-border hover:border-primary/50 hover:scale-[1.01]')}>
                        <img src={t.dataUrl} alt={`Page ${t.page}`} className="w-full aspect-[3/4] object-contain bg-white" />
                        <div className={cn('absolute inset-0 flex items-center justify-center transition-all', selected.has(t.page) ? 'bg-primary/20' : 'bg-transparent group-hover:bg-primary/5')}>
                          {selected.has(t.page) && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <CheckSquare className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 py-1 bg-gradient-to-t from-black/50 to-transparent">
                          <span className="text-white text-[10px] font-semibold px-1.5">{t.page}</span>
                        </div>
                      </button>
                    ))}
                    {pageCount > 40 && (
                      <div className="col-span-full text-center text-xs text-muted-foreground py-2">
                        Showing first 40 pages. Use range input for pages beyond 40.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedArr.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <Scissors className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium">Extracting pages: {selectedArr.slice(0, 12).join(', ')}{selectedArr.length > 12 ? ` ... +${selectedArr.length - 12} more` : ''} ({selectedArr.length} pages)</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          {outputBlob && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400">Pages Extracted Successfully!</p>
                  <p className="text-xs text-muted-foreground">{selectedArr.length} pages · {formatSize(outputBlob.size)}</p>
                </div>
              </div>
              <DownloadBtn blob={outputBlob} filename={`extracted_pages_${selectedArr.join('-')}.pdf`} label="Download Extracted PDF" className="w-full" />
            </motion.div>
          )}

          {processing && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              <p className="text-xs text-primary font-medium">Extracting pages...</p>
            </div>
          )}

          <button onClick={extract} disabled={processing || (!selectedArr.length)}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Scissors className="w-4 h-4" />
            {processing ? 'Extracting...' : `Extract ${selectedArr.length || ''} Pages`}
          </button>
        </div>
      )}
    </div>
  );
}