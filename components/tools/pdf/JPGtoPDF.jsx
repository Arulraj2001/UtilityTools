import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, X, Plus, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadPdfLib, DropZone, StatChip, imageFileToJpegBytes } from './PDFHelpers';
import { revokeObjectUrl } from '@/lib/fileProcessing';

export default function JPGtoPDF() {
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
