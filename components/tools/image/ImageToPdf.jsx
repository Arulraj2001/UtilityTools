import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Download, RefreshCw, Loader2, GripVertical, X, Settings, 
  AlertCircle, Info, ShieldCheck, Check, FileText 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { revokeObjectUrl } from '@/lib/fileProcessing';

const PAGE_SIZE_OPTIONS = [
  { id: 'A4', label: 'A4', desc: 'Standard A4 (595×842 pt)' },
  { id: 'Letter', label: 'Letter', desc: 'US Letter (612×792 pt)' },
  { id: 'Legal', label: 'Legal', desc: 'US Legal (612×1008 pt)' },
  { id: 'Fit', label: 'Fit to Image', desc: 'Match each page to image size' }
];

const ORIENTATION_OPTIONS = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'auto', label: 'Auto (Match Image)' }
];

const MARGIN_OPTIONS = [
  { id: 'none', label: 'None (0pt)', val: 0 },
  { id: 'small', label: 'Small (15pt)', val: 15 },
  { id: 'medium', label: 'Medium (30pt)', val: 30 },
  { id: 'large', label: 'Large (50pt)', val: 50 }
];

const FIT_OPTIONS = [
  { id: 'contain', label: 'Contain', desc: 'Fit image within margins' },
  { id: 'cover', label: 'Cover', desc: 'Fill page, crop overflow' },
  { id: 'stretch', label: 'Stretch', desc: 'Force stretch image' }
];

const QUALITY_OPTIONS = [
  { id: 'high', label: 'High Quality', desc: 'Raw images' },
  { id: 'balanced', label: 'Balanced', desc: '80% compression' },
  { id: 'small', label: 'Small File', desc: '60% compression' }
];

/**
 * Loads an image file into a client-side Image element.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts and compresses any image (including WebP/AVIF) to PNG or JPEG bytes.
 */
async function getImageBytes(file, qualitySetting) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isJpg = ['jpg', 'jpeg'].includes(ext);
  const isPng = ext === 'png';

  // For High Quality and standard PNG/JPEG, embed raw bytes directly to save time
  if (qualitySetting === 'high' && (isJpg || isPng)) {
    const arrayBuffer = await file.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      type: isPng ? 'png' : 'jpeg'
    };
  }

  // Otherwise, use Canvas to decode and compress WebP/AVIF or apply quality settings
  return new Promise(async (resolve, reject) => {
    try {
      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let mime = 'image/jpeg';
      let type = 'jpeg';
      let q = 0.95;

      if (qualitySetting === 'balanced') {
        q = 0.8;
      } else if (qualitySetting === 'small') {
        q = 0.6;
      } else if (isPng) {
        mime = 'image/png';
        type = 'png';
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Empty canvas blob'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            bytes: new Uint8Array(e.target.result),
            type
          });
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsArrayBuffer(blob);
      }, mime, q);
    } catch (err) {
      // Server-side fallback for AVIF/TIFF if client-side Canvas fails (e.g. browser compatibility)
      console.warn('Client canvas failed, falling back to server-side sharp conversion:', err);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('outputFormat', 'png');
        formData.append('quality', '95');
        
        const res = await fetch('/api/image/convert', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Server conversion endpoint failed');
        
        const convertedBlob = await res.blob();
        const arrayBuffer = await convertedBlob.arrayBuffer();
        resolve({
          bytes: new Uint8Array(arrayBuffer),
          type: 'png'
        });
      } catch (e) {
        reject(new Error('Failed to convert image on both client and server.'));
      }
    }
  });
}

export default function ImageToPdf() {
  const [images, setImages] = useState([]);
  
  // Settings States
  const [pageSize, setPageSize] = useState('A4'); // A4, Letter, Legal, Fit
  const [orientation, setOrientation] = useState('portrait'); // portrait, landscape, auto
  const [margin, setMargin] = useState('none'); // none, small, medium, large
  const [fitMode, setFitMode] = useState('contain'); // contain, cover, stretch
  const [pdfQuality, setPdfQuality] = useState('high'); // high, balanced, small
  const [fileName, setFileName] = useState('images-converted.pdf');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { name, pages, pageSize, orientation, fitMode, size, url, blob }

  const imagesRef = useRef([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: (files) => {
      setError('');
      setResult(null);
      const validated = [];
      const errors = [];

      files.forEach((file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const type = file.type || '';
        const isSupported = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) || 
                            ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type);

        if (!isSupported) {
          errors.push(`Unsupported file type. Please upload a JPG, PNG, WebP or AVIF image.`);
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          errors.push(`This image is too large. Please upload an image under 10 MB.`);
          return;
        }

        validated.push(file);
      });

      if (errors.length > 0) {
        setError(errors.join(' '));
      }

      if (validated.length > 0) {
        const newImgs = validated.map(f => ({
          file: f,
          url: URL.createObjectURL(f),
          id: Math.random().toString(36).substring(2, 9)
        }));
        setImages(prev => [...prev, ...newImgs]);
      }
    },
  });

  const remove = (id) => setImages(prev => {
    const removed = prev.find(i => i.id === id);
    revokeObjectUrl(removed?.url);
    return prev.filter(i => i.id !== id);
  });

  const reset = () => {
    images.forEach(img => revokeObjectUrl(img.url));
    setImages([]);
    setResult(null);
    setError('');
  };

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach(img => revokeObjectUrl(img.url)), []);

  // PDF Generator Action
  const generate = async () => {
    if (!images.length) return;
    setLoading(true);
    setError('');

    try {
      const pdfDoc = await PDFDocument.create();

      const marginPoints = {
        none: 0,
        small: 15,
        medium: 30,
        large: 50,
      }[margin];

      for (let i = 0; i < images.length; i++) {
        const file = images[i].file;
        
        // Convert format if necessary and get bytes
        const { bytes, type } = await getImageBytes(file, pdfQuality);

        // Embed image in document
        let embeddedImage;
        if (type === 'png') {
          embeddedImage = await pdfDoc.embedPng(bytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        }

        const imgW = embeddedImage.width;
        const imgH = embeddedImage.height;

        // Determine Page Size
        let pw = 595.28;
        let ph = 841.89;

        if (pageSize === 'Fit') {
          pw = imgW + marginPoints * 2;
          ph = imgH + marginPoints * 2;
        } else {
          const dims = {
            A4: [595.28, 841.89],
            Letter: [612, 792],
            Legal: [612, 1008],
          }[pageSize];

          // Determine orientation
          let isLandscape = false;
          if (orientation === 'landscape') {
            isLandscape = true;
          } else if (orientation === 'auto') {
            isLandscape = imgW > imgH;
          }

          pw = isLandscape ? dims[1] : dims[0];
          ph = isLandscape ? dims[0] : dims[1];
        }

        const page = pdfDoc.addPage([pw, ph]);

        // Calculate available dimensions in page margins
        const availW = pw - marginPoints * 2;
        const availH = ph - marginPoints * 2;

        let w = availW;
        let h = availH;
        let x = marginPoints;
        let y = marginPoints;

        if (fitMode === 'contain') {
          const imgRatio = imgW / imgH;
          const availRatio = availW / availH;
          if (imgRatio > availRatio) {
            w = availW;
            h = availW / imgRatio;
          } else {
            h = availH;
            w = availH * imgRatio;
          }
          x = marginPoints + (availW - w) / 2;
          y = marginPoints + (availH - h) / 2;
        } else if (fitMode === 'cover') {
          const imgRatio = imgW / imgH;
          const availRatio = availW / availH;
          if (imgRatio > availRatio) {
            h = availH;
            w = availH * imgRatio;
          } else {
            w = availW;
            h = availW / imgRatio;
          }
          x = marginPoints + (availW - w) / 2;
          y = marginPoints + (availH - h) / 2;
        } else {
          // Stretch mode
          w = availW;
          h = availH;
          x = marginPoints;
          y = marginPoints;
        }

        page.drawImage(embeddedImage, {
          x,
          y,
          width: w,
          height: h
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const outUrl = URL.createObjectURL(blob);

      let cleanName = fileName.trim();
      if (!cleanName) {
        cleanName = 'images-converted.pdf';
      }
      if (!cleanName.toLowerCase().endsWith('.pdf')) {
        cleanName += '.pdf';
      }

      setResult({
        name: cleanName,
        pages: images.length,
        pageSize: pageSize === 'Fit' ? 'Fit to Image' : pageSize,
        orientation: orientation === 'auto' ? 'Auto (Match Image)' : orientation.charAt(0).toUpperCase() + orientation.slice(1),
        fitMode: fitMode.charAt(0).toUpperCase() + fitMode.slice(1),
        size: blob.size,
        url: outUrl,
        blob
      });

    } catch (err) {
      console.error(err);
      setError('Conversion failed. Please try another image or choose different settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
          Convert Image to PDF
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert JPG, PNG, WebP and AVIF images into a single compiled PDF file.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload box and image reordering list */}
        <div className="lg:col-span-7 space-y-6">
          {images.length === 0 ? (
            <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-2">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm font-semibold text-foreground">{isDragActive ? 'Drop your images here' : 'Drop your images here or click to upload'}</p>
                <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, WebP and AVIF. Max 10 MB per image.</p>
              </div>
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Your images are processed securely directly in your browser.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add more images button inside dropzone */}
              <div {...getRootProps()} className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 bg-card/10'}`}>
                <input {...getInputProps()} />
                <p className="text-xs font-semibold text-foreground">+ Add more images (Drag & drop or Click)</p>
              </div>

              {/* Reorderable list of image thumbnails */}
              <div className="space-y-2.5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1 block px-1">
                  {images.length} Image{images.length > 1 ? 's' : ''} Selected — Drag handles to reorder
                </Label>
                
                <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-3">
                  <AnimatePresence>
                    {images.map((img, idx) => (
                      <Reorder.Item key={img.id} value={img} className="touch-none">
                        <motion.div 
                          layout 
                          initial={{ opacity: 0, y: -8 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-4 bg-card border border-border/40 hover:border-primary/30 rounded-2xl px-4 py-3 shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs font-bold text-muted-foreground w-4 text-center">{idx + 1}</span>
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0 hover:text-foreground active:cursor-grabbing" />
                          </div>
                          <img src={img.url} alt="" className="w-14 h-12 object-cover rounded-xl shrink-0 border border-border/50 bg-muted/20" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">{img.file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(img.file.size)}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => remove(img.id)} 
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: PDF settings and controls */}
        <div className="lg:col-span-5 bg-card/45 backdrop-blur-md border border-border/50 p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">PDF Settings</h2>
          </div>

          {/* Page Size Select */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Page Size</Label>
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc}</option>
              ))}
            </select>
          </div>

          {/* Page Orientation */}
          {pageSize !== 'Fit' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
              <Label className="text-sm font-semibold text-foreground">Orientation</Label>
              <div className="grid grid-cols-3 gap-2">
                {ORIENTATION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOrientation(opt.id)}
                    className={`px-3 py-2 text-xs rounded-xl border font-semibold cursor-pointer transition-colors ${
                      orientation === opt.id 
                        ? 'bg-primary border-primary text-white shadow-sm' 
                        : 'border-border/60 bg-card/30 hover:border-primary/40 text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Page Margins */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Margin</Label>
            <div className="grid grid-cols-4 gap-2">
              {MARGIN_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMargin(opt.id)}
                  className={`px-2 py-2 text-xs rounded-xl border font-semibold cursor-pointer transition-all ${
                    margin === opt.id 
                      ? 'bg-primary border-primary text-white shadow-sm' 
                      : 'border-border/60 bg-card/30 hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Fit Mode */}
          {pageSize !== 'Fit' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
              <Label className="text-sm font-semibold text-foreground">Image Fit Mode</Label>
              <select
                value={fitMode}
                onChange={e => setFitMode(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                {FIT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc}</option>
                ))}
              </select>
            </motion.div>
          )}

          {/* PDF Compression Quality */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">PDF Quality (Compression)</Label>
            <select
              value={pdfQuality}
              onChange={e => setPdfQuality(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {QUALITY_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc}</option>
              ))}
            </select>
          </div>

          {/* File Name input */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">PDF File Name</Label>
            <Input 
              type="text" 
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="e.g. images-converted.pdf"
              className="rounded-xl h-10 text-foreground"
            />
          </div>

          {/* Trigger Actions */}
          <div className="space-y-3 pt-2">
            {images.length > 0 && !result && (
              <Button 
                onClick={generate} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer text-white"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Generating PDF...' : `Generate PDF (${images.length} Page${images.length > 1 ? 's' : ''})`}
              </Button>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                {/* Result Card details */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-border/40 pb-3">
                    <span className="text-sm font-bold text-foreground">Conversion Complete</span>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Success
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                      <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">PDF Name</p>
                      <p className="font-bold text-foreground truncate">{result.name}</p>
                    </div>
                    <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                      <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Total Pages</p>
                      <p className="font-bold text-foreground">{result.pages} Page(s)</p>
                    </div>
                    <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                      <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Page Size</p>
                      <p className="font-bold text-foreground">{result.pageSize}</p>
                    </div>
                    <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                      <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">PDF Size</p>
                      <p className="font-bold text-foreground">{formatFileSize(result.size)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={reset} 
                    className="rounded-2xl gap-2 py-6 font-bold cursor-pointer text-foreground"
                  >
                    <RefreshCw className="w-4.5 h-4.5" /> Start Over
                  </Button>
                  <Button 
                    onClick={() => downloadBlob(result.blob, result.name)}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 font-bold cursor-pointer"
                  >
                    <Download className="w-4.5 h-4.5" /> Download PDF
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Privacy footer */}
          <div className="p-3 border border-border/40 rounded-2xl bg-muted/5 text-[11px] text-muted-foreground flex gap-1.5 items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Your images stay in the browser. Conversion is securely processed client-side.</span>
          </div>
        </div>

      </div>

      {/* Info and How to use section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/40 pt-10">
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Check className="w-5.5 h-5.5 text-primary" /> How to convert an image to PDF:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload your JPG, PNG, WebP or AVIF image files.</li>
            <li>Drag and drop the thumbnails to arrange the pages in your preferred order.</li>
            <li>Select PDF layout settings (Page Size, Orientation, Margin, and Fit Mode).</li>
            <li>Choose output quality/compression level and customize the PDF file name.</li>
            <li>Click <strong>Generate PDF</strong> to compile all images.</li>
            <li>Download your generated PDF.</li>
          </ol>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Does this support iOS/iPhone HEIC photos?</h4>
              <p className="text-xs text-muted-foreground">This tool supports JPG, PNG, WebP and AVIF formats. If you have HEIC photos from an iPhone, convert them to JPG using our Image Converter first before compiling to PDF.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Will my images stretch when fitting the page?</h4>
              <p className="text-xs text-muted-foreground">No, unless you choose <strong>Stretch</strong> fit mode. Under default <strong>Contain</strong> and <strong>Cover</strong> modes, images maintain their original aspect ratio.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">What is the "Fit to Image" setting?</h4>
              <p className="text-xs text-muted-foreground">The "Fit to Image" page size adjusts each page's dimensions to match the image's dimensions, preserving original resolution with zero padding or borders.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Are my files uploaded to any servers?</h4>
              <p className="text-xs text-muted-foreground">No. PDF compilation is done directly inside your browser. No files are uploaded to third-party databases, ensuring 100% privacy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
