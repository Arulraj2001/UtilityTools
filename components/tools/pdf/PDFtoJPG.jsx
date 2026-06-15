import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Image, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPdfJsLib } from '@/lib/pdfWorkerSetup';
import { canvasToBlob, clonePdfData, revokeObjectUrl } from '@/lib/fileProcessing';
import { DropZone, FileCard, StatChip, renderPdfPageImage, loadJSZip } from './PDFHelpers';

export default function PDFtoJPG() {
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
