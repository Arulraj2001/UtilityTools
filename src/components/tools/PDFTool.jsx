import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileText, Image, Loader2, X, Plus, ArrowUp, ArrowDown, Scissors, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData, revokeObjectUrl } from '@/lib/fileProcessing';
import { recompressPdfFile } from '@/lib/pdfCompression';
import WordToPDFComponent from '@/components/pdf-tools/WordToPDF';

let pdfLibLoadPromise = null;
let jsZipLoadPromise = null;

const loadPdfLib = () => pdfLibLoadPromise || (pdfLibLoadPromise = import('pdf-lib'))
const loadJSZip = () => jsZipLoadPromise || (jsZipLoadPromise = import('jszip'))

async function renderPdfPageImage(file, scale = 1.5) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await getPdfJsLib();
  const pdf = await pdfjsLib.getDocument({ data: clonePdfData(arrayBuffer) }).promise;
  const page = await pdf.getPage(1);
  let viewport = page.getViewport({ scale });
  const pixels = viewport.width * viewport.height;
  if (pixels > 40_000_000) {
    viewport = page.getViewport({ scale: scale * Math.sqrt(40_000_000 / pixels) });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
  canvas.width = 0;
  canvas.height = 0;
  return { url: URL.createObjectURL(blob), pageCount: pdf.numPages };
}

export default function PDFTool({ tool }) {
  const slug = tool?.slug;

  if (slug === 'merge-pdf') return <PDFMerge />;
  if (slug === 'split-pdf') return <PDFSplit />;
  if (slug === 'compress-pdf') return <PDFCompressor />;
  if (slug === 'pdf-to-jpg') return <PDFtoJPG />;
  if (slug === 'jpg-to-pdf') return <JPGtoPDF />;
  if (slug === 'protect-pdf') return <PDFProtect />;
  if (slug === 'remove-pages-pdf') return <PDFRemovePages />;
  if (slug === 'word-to-pdf') return <WordToPDFComponent />;
  return <div className="text-muted-foreground text-sm">PDF tool not configured.</div>;
}

// ── PDF Merge ─────────────────────────────────────────────────────
function PDFMerge() {
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

// ── PDF Split ─────────────────────────────────────────────────────
function PDFSplit() {
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
      // Parse ranges like "1-3,4-6,7"
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
      // Split into individual pages
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

// ── JPG to PDF ────────────────────────────────────────────────────
async function imageFileToJpegBytes(file, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      try {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load ${file.name}`));
    };
    img.src = url;
  });
}

function JPGtoPDF() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();
  const imagesRef = useRef([]);

  const addImages = (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...imgs.map((f, i) => ({ file: f, id: Date.now() + i, preview: URL.createObjectURL(f) }))]);
    setResult(null);
  };

  const convert = async () => {
    if (images.length === 0) return;
    setLoading(true);
    const startTime = Date.now();
    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.create();
    const totalInputSize = images.reduce((sum, { file }) => sum + file.size, 0);

    for (const { file } of images) {
      const { bytes, width, height } = await imageFileToJpegBytes(file);
      const img = await pdf.embedJpg(bytes);
      const page = pdf.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const processingTime = Date.now() - startTime;

    setResult({
      url: URL.createObjectURL(blob),
      filename: 'images.pdf',
      label: 'images.pdf',
      stats: {
        originalSize: totalInputSize,
        newSize: blob.size,
        images: images.length,
        pages: images.length,
        format: 'PDF',
        processingTime
      }
    });
    setLoading(false);
  };

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach(img => revokeObjectUrl(img.preview)), []);
  useEffect(() => () => revokeObjectUrl(result?.url), [result]);

  const removeImage = (id) => {
    setImages(prev => {
      const removed = prev.find(i => i.id === id);
      revokeObjectUrl(removed?.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  return (
    <div className="space-y-5">
      <DropZone onFiles={addImages} inputRef={inputRef} accept="image/*" label="Drop images here or click to upload" sub="Supports JPG, PNG, WEBP" />

      {images.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">{images.length} image(s) selected</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map(({ id, file, preview }) => (
              <div key={id} className="relative rounded-xl overflow-hidden border border-border/50 group aspect-square">
                <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(id)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-background/80 text-xs truncate">{file.name}</div>
              </div>
            ))}
          </div>
          <Button onClick={() => inputRef.current?.click()} variant="outline" size="sm" className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Add More
          </Button>
        </div>
      )}

      {images.length > 0 && (
        <Button onClick={convert} disabled={loading} className="rounded-xl gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {loading ? 'Converting…' : `Convert ${images.length} Image(s) to PDF`}
        </Button>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">Conversion Complete!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Input Size" value={`${(result.stats.originalSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Output Size" value={`${(result.stats.newSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Images" value={result.stats.images} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── PDF Compressor ────────────────────────────────────────────────
function PDFCompressor() {
  const [file, setFile] = useState(null);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => () => revokeObjectUrl(previewUrl), [previewUrl]);
  useEffect(() => () => revokeObjectUrl(result?.url), [result]);

  const handleFile = async (f) => {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    setResult(null);
    setPreviewError(null);
    try {
      const preview = await renderPdfPageImage(f, 1.8);
      setPreviewUrl(preview.url);
      setPageCount(preview.pageCount);
    } catch (err) {
      setPreviewError('Preview unavailable.');
      setPreviewUrl(null);
      setPageCount(0);
    }
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const preset = {
        low: { scale: 2, quality: 0.85 },
        medium: { scale: 1.5, quality: 0.68 },
        high: { scale: 1.1, quality: 0.48 },
      }[compressionLevel] || { scale: 1.5, quality: 0.68 };

      const { PDFDocument } = await loadPdfLib();
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const optimizedBytes = await doc.save({ useObjectStreams: true, objectsPerTick: 50 });
      const optimizedBlob = new Blob([optimizedBytes], { type: 'application/pdf' });

      let rasterBlob = null;
      try {
        const recompressed = await recompressPdfFile(file, preset);
        rasterBlob = recompressed.blob;
      } catch {
        rasterBlob = null;
      }

      const blob = rasterBlob && rasterBlob.size < optimizedBlob.size ? rasterBlob : optimizedBlob;
      const savings = (((bytes.byteLength - blob.size) / bytes.byteLength) * 100).toFixed(1);
      const processingTime = Date.now() - startTime;

      setResult({
        url: URL.createObjectURL(blob),
        filename: 'compressed.pdf',
        label: 'compressed.pdf',
        stats: {
          originalSize: bytes.byteLength,
          newSize: blob.size,
          savings: parseFloat(savings) > 0 ? savings : '~0',
          pages: doc.getPageCount(),
          level: compressionLevel,
          format: 'PDF',
          processingTime,
          reduction: Math.max(0, Math.round((bytes.byteLength - blob.size) / 1024 / 1024 * 100) / 100)
        }
      });
    } catch (e) {
      alert(`Compression failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF to compress" />
      ) : (
        <FileCard file={file} onRemove={() => { setFile(null); setResult(null); }} />
      )}

      {file && !result && (
        <div className="space-y-4">
          {/* Compression Level */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Compression Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'low', label: 'Low', desc: 'Minimal compression' },
                { value: 'medium', label: 'Medium', desc: 'Balanced' },
                { value: 'high', label: 'High', desc: 'Max compression' }
              ].map(level => (
                <button
                  key={level.value}
                  onClick={() => setCompressionLevel(level.value)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    compressionLevel === level.value
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'border-2 border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">{level.label}</div>
                  <div className="text-xs opacity-75">{level.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>File Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
              <br />
              <strong>Compression:</strong> Remove unused objects and optimize streams
            </p>
            {previewUrl ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-muted-foreground">{pageCount ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` : 'Page preview available'}</div>
                <div className="text-xs text-muted-foreground font-semibold">{compressionLevel === 'high' ? 'Maximum size reduction' : compressionLevel === 'medium' ? 'Balanced size and readability' : 'Minimal compression, highest fidelity'}</div>
              </div>
            ) : previewError ? (
              <div className="text-xs text-destructive">{previewError}</div>
            ) : null}
          </div>

          {previewUrl ? (
            <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/10">
              <img src={previewUrl} alt="PDF preview" className="w-full object-contain" />
            </div>
          ) : null}

          {/* Action Button */}
          <Button onClick={compress} disabled={loading} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Compressing…' : 'Compress PDF'}
          </Button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">Compression Complete!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Original" value={`${(result.stats.originalSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Compressed" value={`${(result.stats.newSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Saved" value={`${result.stats.savings}%`} highlight />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm text-green-700 dark:text-green-400">
              <strong>Reduction:</strong> {result.stats.reduction} MB | <strong>Level:</strong> {result.stats.level}
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download Compressed PDF
              </Button>
            </a>
            <Button onClick={() => { setFile(null); setResult(null); }} variant="outline" className="rounded-xl w-full">
              Compress Another PDF
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── PDF Protect ───────────────────────────────────────────────────
function PDFProtect() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResult(null);
      setErrors({});
    }
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const protect = async () => {
    if (!validatePassword()) return;
    if (!file) return;

    setLoading(true);
    const startTime = Date.now();
    
    try {
      const { PDFDocument } = await loadPdfLib();
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pdfBytes = await doc.save({ userPassword: password });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const processingTime = Date.now() - startTime;

      setResult({
        url: URL.createObjectURL(blob),
        filename: 'protected.pdf',
        label: 'protected.pdf',
        stats: {
          originalSize: file.size,
          newSize: blob.size,
          pages: doc.getPageCount(),
          passwordLength: password.length,
          format: 'PDF',
          processingTime
        }
      });
    } catch (e) {
      alert(`Protection failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF to protect with password" />
      ) : (
        <FileCard file={file} onRemove={() => { setFile(null); setResult(null); setPassword(''); setConfirmPassword(''); setErrors({}); }} />
      )}

      {file && !result && (
        <div className="space-y-4">
          {/* Password Input */}
          <div>
            <Label htmlFor="password" className="text-sm font-semibold mb-2 block">Password</Label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
              placeholder="Enter a strong password"
              className={`w-full px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.password ? 'border-destructive/50 focus:ring-destructive' : 'border-input focus:ring-ring'
              }`}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            <p className="text-xs text-muted-foreground mt-1">Minimum 4 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-semibold mb-2 block">Confirm Password</Label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
              placeholder="Confirm your password"
              className={`w-full px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.confirmPassword ? 'border-destructive/50 focus:ring-destructive' : 'border-input focus:ring-ring'
              }`}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Password Strength */}
          {password && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Security:</strong> Password will encrypt the PDF file.
                <br />
                <strong>Note:</strong> Save your password in a safe place. You cannot recover it.
              </p>
            </div>
          )}

          {/* Action Button */}
          <Button onClick={protect} disabled={loading || !password || !confirmPassword} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Protecting…' : 'Protect PDF'}
          </Button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">PDF Protected!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Password Length" value={`${result.stats.passwordLength} chars`} />
              <StatChip label="Pages" value={result.stats.pages} />
              <StatChip label="File Size" value={`${(result.stats.newSize / 1024).toFixed(1)} KB`} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700 dark:text-yellow-400">
              <strong>⚠ Important:</strong> Save your password. PDF cannot be opened without it.
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download Protected PDF
              </Button>
            </a>
            <Button onClick={() => { setFile(null); setResult(null); setPassword(''); setConfirmPassword(''); }} variant="outline" className="rounded-xl w-full">
              Protect Another PDF
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── PDF Remove Pages ──────────────────────────────────────────────
function PDFRemovePages() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResultUrl(null);
    }
  };

  const removePages = async () => {
    if (!file || !pages) return;
    setLoading(true);
    const { PDFDocument } = await loadPdfLib();
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const totalPages = doc.getPageCount();
    const indices = parsePageRanges(pages, totalPages);
    const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => !indices.includes(i));
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(doc, keepIndices);
    copied.forEach(p => newDoc.addPage(p));
    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    setResultUrl(URL.createObjectURL(blob));
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Upload the PDF to edit" />
      ) : (
        <FileCard file={file} onRemove={() => { setFile(null); setResultUrl(null); }} />
      )}

      {file && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Pages to Remove</Label>
          <input value={pages} onChange={e => setPages(e.target.value)} placeholder="e.g., 1,3-5,8" className="w-full p-3 rounded-xl border border-border bg-card" />
          <Button onClick={removePages} disabled={loading || !pages} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Removing…' : 'Remove Pages'}
          </Button>
        </div>
      )}

      <DownloadResult url={resultUrl} filename="edited.pdf" label="edited.pdf" />
    </div>
  );
}

// ── PDF to JPG ────────────────────────────────────────────────────
function PDFtoJPG() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(0.9);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => () => revokeObjectUrl(previewUrl), [previewUrl]);
  useEffect(() => () => revokeObjectUrl(result?.url), [result]);

  const handleFile = async (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResult(null);
      setPreviewError(null);
      try {
        const preview = await renderPdfPageImage(f, 1.3);
        setPreviewUrl(preview.url);
        setPageCount(preview.pageCount);
      } catch (e) {
        console.error('Error reading PDF:', e);
        setPreviewError('Preview unavailable.');
        setPreviewUrl(null);
        setPageCount(0);
      }
    }
  };

  const convert = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const startTime = Date.now();
      const pdfjsLib = await getPdfJsLib();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: clonePdfData(arrayBuffer) }).promise;
      const numPages = pdf.numPages;

      if (numPages === 1) {
        // Single page - return JPG directly
        const page = await pdf.getPage(1);
        let viewport = page.getViewport({ scale: 2 });
        const pixels = viewport.width * viewport.height;
        if (pixels > 80_000_000) {
          viewport = page.getViewport({ scale: 2 * Math.sqrt(80_000_000 / pixels) });
        }
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = Math.round(viewport.height);
        canvas.width = Math.round(viewport.width);
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;

        const processingTime = Date.now() - startTime;
        setResult({
          url: URL.createObjectURL(blob),
          filename: 'page1.jpg',
          label: 'page1.jpg',
          stats: {
            originalSize: file.size,
            newSize: blob.size,
            pages: 1,
            format: 'JPG',
            processingTime
          }
        });
      } else {
        // Multiple pages - create ZIP
        const { default: JSZip } = await loadJSZip();
        const zip = new JSZip();
        let totalSize = 0;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          let viewport = page.getViewport({ scale: 2 });
          const pixels = viewport.width * viewport.height;
          if (pixels > 80_000_000) {
            viewport = page.getViewport({ scale: 2 * Math.sqrt(80_000_000 / pixels) });
          }
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = Math.round(viewport.height);
          canvas.width = Math.round(viewport.width);
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
          zip.file(`page${i}.jpg`, blob);
          totalSize += blob.size;
          canvas.width = 0;
          canvas.height = 0;
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const processingTime = Date.now() - startTime;

        setResult({
          url: URL.createObjectURL(zipBlob),
          filename: 'pdf-pages.zip',
          label: 'pdf-pages.zip',
          stats: {
            originalSize: file.size,
            newSize: zipBlob.size,
            pages: numPages,
            format: 'ZIP (JPG)',
            processingTime
          }
        });
      }
    } catch (e) {
      alert(`Conversion failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Non-editable warning banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-start gap-2 text-sm">
          <Image className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Output is image-based — text is NOT editable
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              This tool converts PDF pages to JPG images. Text in the output images cannot be selected, copied, or edited.
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <DropZone onFiles={fs => handleFile(fs[0])} accept=".pdf,application/pdf" label="Drop a PDF file here" sub="Convert all pages to high-quality JPG images" />
      ) : (
        <FileCard file={file} pageCount={pageCount} onRemove={() => { setFile(null); setResult(null); setPageCount(0); }} />
      )}

      {file && (
        <div className="space-y-4">
          {previewUrl ? (
            <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/10">
              <img src={previewUrl} alt="PDF page preview" className="w-full object-contain" />
            </div>
          ) : previewError ? (
            <div className="rounded-xl p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20">{previewError}</div>
          ) : null}

          <div className="rounded-2xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{pageCount ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` : 'Upload a PDF to preview'}</span>
              <span>{quality >= 0.85 ? 'High fidelity' : quality >= 0.75 ? 'Balanced quality' : 'Smaller size'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Image Quality</Label>
            <select
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-border bg-card"
            >
              <option value={0.9}>High Quality (90%)</option>
              <option value={0.8}>Good Quality (80%)</option>
              <option value={0.7}>Medium Quality (70%)</option>
              <option value={0.5}>Low Quality (50%)</option>
            </select>
          </div>

          <Button onClick={convert} disabled={loading} className="rounded-xl gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Converting…' : `Convert ${pageCount} page${pageCount !== 1 ? 's' : ''} to JPG`}
          </Button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
            <p className="font-semibold text-green-700 dark:text-green-400">Conversion Complete!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Original" value={`${(result.stats.originalSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Converted" value={`${(result.stats.newSize / 1024 / 1024).toFixed(2)} MB`} />
              <StatChip label="Pages" value={result.stats.pages} />
              <StatChip label="Time" value={`${result.stats.processingTime}ms`} />
            </div>
            <a href={result.url} download={result.filename}>
              <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 w-full">
                <Download className="w-4 h-4" /> Download {result.label}
              </Button>
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function parsePageRanges(ranges, totalPages) {
  const indices = new Set();
  const parts = ranges.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s) - 1);
      for (let i = start; i <= end && i < totalPages; i++) {
        indices.add(i);
      }
    } else {
      const page = parseInt(part) - 1;
      if (page >= 0 && page < totalPages) indices.add(page);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

// ── Shared sub-components ─────────────────────────────────────────
function DropZone({ onFiles, inputRef: externalRef, accept, label, sub }) {
  const localRef = useRef();
  const ref = externalRef || localRef;

  return (
    <div
      onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
      onDragOver={e => e.preventDefault()}
      onClick={() => ref.current?.click()}
      className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
        <Upload className="w-7 h-7 text-primary" />
      </div>
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
      <input ref={ref} type="file" accept={accept} multiple className="hidden" onChange={e => onFiles(e.target.files)} />
    </div>
  );
}

function FileCard({ file, pageCount, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB{pageCount ? ` · ${pageCount} pages` : ''}
        </p>
      </div>
      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function DownloadResult({ url, filename, label }) {
  if (!url) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 premium-card panel-highlight glow-border">
          <div className="flex-1">
            <p className="font-semibold text-green-700 dark:text-green-400">Done! Your file is ready.</p>
            <p className="text-sm text-muted-foreground font-mono">{label}</p>
          </div>
          <a href={url} download={filename}>
            <Button className="rounded-xl gap-2 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4" /> Download
            </Button>
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatChip({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-green-500/20' : 'bg-card border border-border/50 glow-border'}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${highlight ? 'text-green-600' : ''}`}>{value}</p>
    </div>
  );
}
