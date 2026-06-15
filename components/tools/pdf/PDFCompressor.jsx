import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadPdfLib, DropZone, FileCard, StatChip, renderPdfPageImage } from './PDFHelpers';
import { recompressPdfFile } from '@/lib/pdfCompression';
import { revokeObjectUrl } from '@/lib/fileProcessing';

export default function PDFCompressor() {
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
      } catch (e) {
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
