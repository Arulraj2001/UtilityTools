import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadPdfLib, DropZone, FileCard, StatChip } from './PDFHelpers';

export default function PDFSplit() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (f) => {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    setResult(null);
    const { PDFDocument } = await loadPdfLib();
    const bytes = await f.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    setPageCount(doc.getPageCount());
  };

  const split = async () => {
    if (!file) return;
    setLoading(true);
    const startTime = Date.now();
    const { PDFDocument } = await loadPdfLib();
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const parts = [];

    if (ranges.trim()) {
      for (const part of ranges.split(',')) {
        const trimmed = part.trim();
        let pageNums = [];
        if (trimmed.includes('-')) {
          const [s, e] = trimmed.split('-').map(n => parseInt(n.trim()) - 1);
          for (let i = s; i <= e && i < doc.getPageCount(); i++) pageNums.push(i);
        } else {
          const n = parseInt(trimmed) - 1;
          if (n >= 0 && n < doc.getPageCount()) pageNums.push(n);
        }
        if (pageNums.length > 0) parts.push(pageNums);
      }
    } else {
      for (let i = 0; i < doc.getPageCount(); i++) parts.push([i]);
    }

    const results = [];
    let totalOutputSize = 0;
    for (const pageNums of parts) {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, pageNums);
      copied.forEach(p => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const label = pageNums.length === 1 ? `page_${pageNums[0] + 1}` : `pages_${pageNums[0]+1}-${pageNums[pageNums.length-1]+1}`;
      results.push({ url: URL.createObjectURL(blob), name: `${label}.pdf`, size: blob.size });
      totalOutputSize += blob.size;
    }

    const processingTime = Date.now() - startTime;
    setResult({
      files: results,
      stats: {
        originalSize: file.size,
        totalOutputSize,
        parts: results.length,
        processingTime
      }
    });
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF you want to split" />
      ) : (
        <FileCard file={file} pageCount={pageCount} onRemove={() => { setFile(null); setResult(null); }} />
      )}

      {file && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Page Ranges (optional)</Label>
            <input
              type="text"
              value={ranges}
              onChange={e => setRanges(e.target.value)}
              placeholder="e.g. 1-3, 4-6, 7  (leave blank to split all pages)"
              className="w-full px-3 py-2 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">This PDF has {pageCount} pages. Leave blank to extract each page separately.</p>
          </div>
          <Button onClick={split} disabled={loading} className="rounded-xl gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
            {loading ? 'Splitting…' : 'Split PDF'}
          </Button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">Split Complete!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Original" value={`${(result.stats.originalSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Total Output" value={`${(result.stats.totalOutputSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Parts" value={result.stats.parts} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <div className="grid gap-2">
              {result.files.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-card rounded-xl border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{r.name}</span>
                    <span className="text-xs text-muted-foreground">({(r.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <a href={r.url} download={r.name}>
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5 h-7">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
