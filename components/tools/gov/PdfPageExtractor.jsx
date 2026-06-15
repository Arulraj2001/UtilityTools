import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import DropZone from './shared/DropZone';
import ProcessingOverlay from './shared/ProcessingOverlay';
import { DownloadButton } from './shared/FileStats';
import { formatFileSize } from './shared/ExamPresets';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

function parsePageRange(input, totalPages) {
  const pages = new Set();
  const parts = input.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= Math.min(b, totalPages); i++) if (i >= 1) pages.add(i);
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= totalPages) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export default function PdfPageExtractor() {
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (f) => {
    setFile(f); setOutputBlob(null); setError(null);
    try {
      const ab = await f.arrayBuffer();
      const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
      setTotalPages(doc.getPageCount());
    } catch {
      setTotalPages(0);
    }
  };

  const handleExtract = async () => {
    setProcessing(true); setError(null);
    try {
      const pages = parsePageRange(pageInput, totalPages);
      if (!pages.length) throw new Error('No valid pages selected');
      const ab = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(ab, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const indices = pages.map(p => p - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach(p => outDoc.addPage(p));
      const bytes = await outDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setOutputBlob(blob); setOutputSize(blob.size);
    } catch (e) {
      setError(e.message || 'Extraction failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setTotalPages(0); setOutputBlob(null); setPageInput(''); setError(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <div className="text-2xl">📋</div>
        <div>
          <p className="font-semibold text-sm">PDF Page Extractor</p>
          <p className="text-xs text-muted-foreground mt-0.5">Extract specific pages from any PDF. Enter page numbers or ranges like "1,3,5-8" and download a new PDF.</p>
        </div>
      </div>
      {!file ? (
        <DropZone onFile={handleFile} accept="pdf" label="Upload PDF to extract pages from" sublabel="PDF files up to 50MB" />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay show={processing} message="Extracting pages..." />
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {totalPages} pages</p>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Pages to Extract</label>
            <input
              type="text" value={pageInput} onChange={e => setPageInput(e.target.value)}
              placeholder={`e.g. 1,3,5-8 (total: ${totalPages} pages)`}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 ring-primary/30 outline-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Use commas for individual pages and hyphens for ranges. E.g. <code className="bg-muted px-1 rounded">1,3,5-8</code></p>
          </div>

          {pageInput && (
            <p className="text-xs text-primary font-medium">
              Will extract: {parsePageRange(pageInput, totalPages).join(', ')} ({parsePageRange(pageInput, totalPages).length} pages)
            </p>
          )}

          {outputBlob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Extracted! {formatFileSize(outputSize)}</span>
            </motion.div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleExtract} disabled={processing || !pageInput.trim()} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50">
              {processing ? 'Extracting...' : '📋 Extract Pages'}
            </button>
            {outputBlob && <DownloadButton blob={outputBlob} filename={`extracted_${file.name}`} label="Download" />}
          </div>
        </div>
      )}
    </div>
  );
}