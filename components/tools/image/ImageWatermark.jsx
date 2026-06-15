import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, RefreshCw, Type, Image as ImageIcon, Sliders, Settings, 
  AlertCircle, Info, ShieldCheck, Check, Trash2, Loader2, X 
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import { motion, AnimatePresence } from 'framer-motion';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { createImageZip } from '@/utils/image/createImageZip';
import { canvasToBlob, revokeObjectUrl } from '@/lib/fileProcessing';

const POSITION_OPTIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center', label: 'Center' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'tiled', label: 'Tiled (Repeated)' },
  { id: 'diagonal', label: 'Diagonal (Center -45°)' }
];

const FORMAT_OPTIONS = [
  { id: 'original', label: 'Keep Original Format' },
  { id: 'jpeg', label: 'Export as JPG' },
  { id: 'png', label: 'Export as PNG' },
  { id: 'webp', label: 'Export as WebP' }
];

/**
 * Loads an image URL into a client-side Image element.
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = url;
  });
}

/**
 * Renders a watermark (text or logo) onto a single image canvas and returns a blob.
 */
async function applyWatermarkSingle(file, originalPreview, options) {
  const img = await loadImage(originalPreview);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  // Draw background image
  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.globalAlpha = options.opacity / 100;

  // Relative padding (5% of smallest dimension)
  const pad = Math.min(canvas.width, canvas.height) * 0.05;

  if (options.watermarkType === 'text') {
    // Relative Font Sizing
    const calculatedFontSize = Math.max(12, Math.round((options.fontSizePercent / 100) * Math.min(canvas.width, canvas.height)));
    ctx.font = `bold ${calculatedFontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = options.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Outline / Stroke options
    if (options.enableStroke) {
      ctx.strokeStyle = options.strokeColor || '#000000';
      ctx.lineWidth = Math.max(1, Math.round(calculatedFontSize * 0.1));
    }

    // Drop Shadow options
    if (options.enableShadow) {
      ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = Math.max(2, Math.round(calculatedFontSize * 0.15));
      ctx.shadowOffsetX = Math.max(1, Math.round(calculatedFontSize * 0.08));
      ctx.shadowOffsetY = Math.max(1, Math.round(calculatedFontSize * 0.08));
    }

    const text = options.text;
    const tw = ctx.measureText(text).width;
    const th = calculatedFontSize;

    const drawTextAt = (tx, ty, rot = 0) => {
      ctx.save();
      ctx.translate(tx, ty);
      if (rot !== 0) {
        ctx.rotate((rot * Math.PI) / 180);
      }
      if (options.enableStroke) {
        ctx.strokeText(text, 0, 0);
      }
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    if (options.position === 'tiled') {
      const spacingX = tw + pad * 2;
      const spacingY = th * 4;
      for (let y = th; y < canvas.height + spacingY; y += spacingY) {
        for (let x = -tw; x < canvas.width + spacingX; x += spacingX) {
          const shift = (Math.floor(y / spacingY) % 2 === 0) ? spacingX / 2 : 0;
          drawTextAt(x + shift, y, options.rotation);
        }
      }
    } else if (options.position === 'diagonal') {
      drawTextAt(canvas.width / 2, canvas.height / 2, -45);
    } else {
      let x = canvas.width / 2;
      let y = canvas.height / 2;

      if (options.position === 'top-left') {
        x = pad + tw / 2;
        y = pad + th / 2;
      } else if (options.position === 'top-center') {
        x = canvas.width / 2;
        y = pad + th / 2;
      } else if (options.position === 'top-right') {
        x = canvas.width - pad - tw / 2;
        y = pad + th / 2;
      } else if (options.position === 'bottom-left') {
        x = pad + tw / 2;
        y = canvas.height - pad - th / 2;
      } else if (options.position === 'bottom-center') {
        x = canvas.width / 2;
        y = canvas.height - pad - th / 2;
      } else if (options.position === 'bottom-right') {
        x = canvas.width - pad - tw / 2;
        y = canvas.height - pad - th / 2;
      }

      drawTextAt(x, y, options.rotation);
    }

  } else if (options.watermarkType === 'logo' && options.logoUrl) {
    const logoImg = await loadImage(options.logoUrl);
    
    // Relative Logo Sizing
    const lw = Math.max(20, Math.round((options.logoSizePercent / 100) * canvas.width));
    const lh = (logoImg.naturalHeight / logoImg.naturalWidth) * lw;

    const drawLogoAt = (lx, ly, rot = 0) => {
      ctx.save();
      ctx.translate(lx + lw / 2, ly + lh / 2);
      if (rot !== 0) {
        ctx.rotate((rot * Math.PI) / 180);
      }
      ctx.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
    };

    if (options.position === 'tiled') {
      const spacingX = lw + pad * 2;
      const spacingY = lh * 3;
      for (let y = lh; y < canvas.height + spacingY; y += spacingY) {
        for (let x = -lw; x < canvas.width + spacingX; x += spacingX) {
          const shift = (Math.floor(y / spacingY) % 2 === 0) ? spacingX / 2 : 0;
          drawLogoAt(x + shift, y, options.rotation);
        }
      }
    } else if (options.position === 'diagonal') {
      drawLogoAt((canvas.width - lw) / 2, (canvas.height - lh) / 2, -45);
    } else {
      let x = (canvas.width - lw) / 2;
      let y = (canvas.height - lh) / 2;

      if (options.position === 'top-left') {
        x = pad;
        y = pad;
      } else if (options.position === 'top-center') {
        x = (canvas.width - lw) / 2;
        y = pad;
      } else if (options.position === 'top-right') {
        x = canvas.width - pad - lw;
        y = pad;
      } else if (options.position === 'bottom-left') {
        x = pad;
        y = canvas.height - pad - lh;
      } else if (options.position === 'bottom-center') {
        x = (canvas.width - lw) / 2;
        y = canvas.height - pad - lh;
      } else if (options.position === 'bottom-right') {
        x = canvas.width - pad - lw;
        y = canvas.height - pad - lh;
      }

      drawLogoAt(x, y, options.rotation);
    }
  }

  ctx.restore();

  // Export formatting
  let resolvedFormat = options.outputFormat === 'original' ? file.type.split('/')[1] : options.outputFormat;
  if (resolvedFormat === 'jpg') resolvedFormat = 'jpeg';
  const isJpgOrWebp = ['jpeg', 'jpg', 'webp'].includes(resolvedFormat);

  let mime = 'image/png';
  if (resolvedFormat === 'webp') mime = 'image/webp';
  else if (resolvedFormat === 'jpeg') mime = 'image/jpeg';

  const blob = await canvasToBlob(canvas, mime, isJpgOrWebp ? options.quality / 100 : 1);

  // Cleanup
  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    width: img.naturalWidth,
    height: img.naturalHeight,
    format: resolvedFormat.toUpperCase()
  };
}

export default function ImageWatermark() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Settings
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'logo'
  const [text, setText] = useState('© Watermark');
  const [fontSizePercent, setFontSizePercent] = useState(5); // 1% to 20%
  const [color, setColor] = useState('#ffffff');
  
  // Stroke & Shadow options
  const [enableStroke, setEnableStroke] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [enableShadow, setEnableShadow] = useState(false);
  const [shadowColor, setShadowColor] = useState('rgba(0,0,0,0.5)');

  // Logo upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoSizePercent, setLogoSizePercent] = useState(20); // 5% to 50%

  // Placement
  const [position, setPosition] = useState('bottom-right');
  const [rotation, setRotation] = useState(0); // -180 to 180
  const [opacity, setOpacity] = useState(60); // 10 to 100

  // Export Settings
  const [outputFormat, setOutputFormat] = useState('original');
  const [quality, setQuality] = useState(90); // 10 to 100

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // Array of: { id, name, originalSize, outputSize, originalWidth, originalHeight, outputWidth, outputHeight, originalFormat, outputFormat, status, error, url, blob }
  const [error, setError] = useState('');

  const logoInputRef = useRef(null);

  // Handle files upload and validate
  const handleFiles = (newFiles) => {
    setError('');
    const validated = [];
    const errors = [];

    newFiles.forEach((file) => {
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
      const newPreviews = validated.map(f => URL.createObjectURL(f));
      setFiles((prev) => [...prev, ...validated]);
      setPreviews((prev) => [...prev, ...newPreviews]);
      setResults([]);
    }
  };

  // Remove a single file from the upload list
  const removeFile = (index) => {
    revokeObjectUrl(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    if (results.length > 0) {
      if (results[index]?.url) revokeObjectUrl(results[index].url);
      setResults((prev) => prev.filter((_, i) => i !== index));
    }
    if (selectedIndex >= files.length - 1) {
      setSelectedIndex(Math.max(0, files.length - 2));
    }
  };

  // Reset the component state
  const reset = () => {
    previews.forEach(p => revokeObjectUrl(p));
    results.forEach(r => {
      if (r.url) revokeObjectUrl(r.url);
    });
    if (logoUrl) revokeObjectUrl(logoUrl);
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setLogoFile(null);
    setLogoUrl(null);
    setSelectedIndex(0);
    setError('');
  };

  const previewsRef = useRef(previews);
  const resultsRef = useRef(results);
  const logoUrlRef = useRef(logoUrl);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    logoUrlRef.current = logoUrl;
  }, [logoUrl]);

  // Cleanup object URLs to prevent memory leaks on unmount
  useEffect(() => {
    return () => {
      previewsRef.current.forEach(p => revokeObjectUrl(p));
      resultsRef.current.forEach(r => {
        if (r.url) revokeObjectUrl(r.url);
      });
      if (logoUrlRef.current) revokeObjectUrl(logoUrlRef.current);
    };
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoUrl) revokeObjectUrl(logoUrl);
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
    setResultNull();
  };

  const removeLogo = () => {
    if (logoUrl) revokeObjectUrl(logoUrl);
    setLogoFile(null);
    setLogoUrl(null);
    setResultNull();
  };

  const setResultNull = () => {
    results.forEach(r => {
      if (r.url) revokeObjectUrl(r.url);
    });
    setResults([]);
  };

  // Main Apply Trigger
  const handleApply = async () => {
    if (files.length === 0) {
      setError('Please upload an image first.');
      return;
    }
    if (watermarkType === 'logo' && !logoUrl) {
      setError('Please upload a logo image first.');
      return;
    }

    setLoading(true);
    setError('');

    const initialResults = files.map((file, i) => ({
      id: i,
      name: file.name,
      originalSize: file.size,
      outputSize: 0,
      status: 'Waiting',
      url: '',
      blob: null,
      error: ''
    }));

    setResults(initialResults);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'Processing' } : r));

      try {
        const res = await applyWatermarkSingle(file, previews[i], {
          watermarkType,
          text,
          fontSizePercent,
          color,
          enableStroke,
          strokeColor,
          enableShadow,
          shadowColor,
          logoUrl,
          logoSizePercent,
          position,
          rotation,
          opacity,
          outputFormat,
          quality
        });

        const outUrl = URL.createObjectURL(res.blob);
        let ext = outputFormat === 'original' ? file.name.split('.').pop().toLowerCase() : outputFormat.toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const outName = `${baseName}-watermarked.${ext}`;

        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          name: outName,
          status: 'Complete',
          outputSize: res.blob.size,
          url: outUrl,
          blob: res.blob,
          originalWidth: res.width,
          originalHeight: res.height,
          outputWidth: res.width,
          outputHeight: res.height,
          originalFormat: file.name.split('.').pop()?.toUpperCase() || 'IMG',
          outputFormat: res.format
        } : r));
      } catch (err) {
        console.error(err);
        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Failed',
          error: err.message || 'Watermarking failed.'
        } : r));
      }
    }

    setLoading(false);
  };

  // Individual file download
  const handleDownload = (resItem) => {
    if (resItem.blob) {
      downloadBlob(resItem.blob, resItem.name);
    }
  };

  // ZIP download for batch files
  const handleDownloadZip = async () => {
    const successful = results.filter(r => r.status === 'Complete' && r.blob);
    if (successful.length === 0) return;

    try {
      const zipFiles = successful.map(r => ({
        blob: r.blob,
        name: r.name
      }));
      const zipBlob = await createImageZip(zipFiles);
      downloadBlob(zipBlob, 'watermarked-images.zip');
    } catch (e) {
      console.error(e);
      setError('Failed to generate ZIP file.');
    }
  };

  // Check if quality slider is relevant
  const showQualitySlider = useMemo(() => {
    let ext = outputFormat === 'original' ? files[selectedIndex]?.name.split('.').pop().toLowerCase() : outputFormat.toLowerCase();
    return ['jpeg', 'jpg', 'webp'].includes(ext || '');
  }, [outputFormat, files, selectedIndex]);

  const hasSuccessfulResults = results.some(r => r.status === 'Complete');

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
          Watermark Image Online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Add custom text or logo watermarks to multiple images simultaneously.
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
        
        {/* Left Column: Upload Box and Previews */}
        <div className="lg:col-span-7 space-y-6">
          {files.length === 0 ? (
            <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-2">
              <ImageDropZone 
                onFiles={handleFiles} 
                multiple 
                hint="Supports JPG, PNG, WebP and AVIF. Max 10 MB per image." 
              />
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Your images are processed securely directly in your browser.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* File list for batch uploads */}
              {files.length > 1 && (
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    {files.length} Files Selected
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {files.map((file, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedIndex === idx 
                            ? 'bg-primary/10 border-primary text-primary font-medium' 
                            : 'bg-card border-border/40 hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="hover:text-red-500 transition-colors ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected file preview */}
              {files[selectedIndex] && (
                <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur overflow-hidden p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold truncate max-w-[70%] text-foreground">
                      {files[selectedIndex].name}
                    </span>
                    {files.length === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeFile(0)} className="text-muted-foreground hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  {results[selectedIndex] && results[selectedIndex].status === 'Complete' ? (
                    <div className="space-y-4 animate-fade-in">
                      <BeforeAfter 
                        before={previews[selectedIndex]} 
                        after={results[selectedIndex].url} 
                        beforeLabel="Original" 
                        afterLabel="Watermarked" 
                      />
                      
                      {/* Detailed Result Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex justify-between items-center border-b border-border/40 pb-3">
                          <span className="text-sm font-bold text-foreground">Watermark Applied</span>
                          <span className="text-xs font-semibold text-muted-foreground">Original vs Output</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Original</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].originalSize)}</p>
                            <p className="text-muted-foreground">{results[selectedIndex].originalWidth} × {results[selectedIndex].originalHeight} | {results[selectedIndex].originalFormat}</p>
                          </div>
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Watermarked</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].outputSize)}</p>
                            <p className="text-muted-foreground">{results[selectedIndex].outputWidth} × {results[selectedIndex].outputHeight} | {results[selectedIndex].outputFormat}</p>
                          </div>
                        </div>

                        {results[selectedIndex].outputSize >= results[selectedIndex].originalSize && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 flex gap-2 items-center">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Output file is larger than original. Try WebP format or lower quality.</span>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleDownload(results[selectedIndex])} 
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium cursor-pointer"
                        >
                          <Download className="w-4.5 h-4.5" /> Download Watermarked Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex items-center justify-center">
                        <img 
                          src={previews[selectedIndex]} 
                          alt="preview-original" 
                          className="w-full h-full object-contain" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Format</p>
                          <p className="text-base font-semibold text-foreground">{files[selectedIndex].name.split('.').pop().toUpperCase()}</p>
                        </div>
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Original File Size</p>
                          <p className="text-base font-semibold text-foreground">{formatFileSize(files[selectedIndex].size)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Settings and Actions */}
        <div className="lg:col-span-5 bg-card/45 backdrop-blur-md border border-border/50 p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Watermark Settings</h2>
          </div>

          {/* Watermark Type tabs */}
          <div className="grid grid-cols-2 gap-2 bg-muted/20 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => { setWatermarkType('text'); setResultNull(); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                watermarkType === 'text' 
                  ? 'bg-card text-foreground shadow-sm font-bold border border-border/30' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Text Watermark
            </button>
            <button
              onClick={() => { setWatermarkType('logo'); setResultNull(); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                watermarkType === 'logo' 
                  ? 'bg-card text-foreground shadow-sm font-bold border border-border/30' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Logo Watermark
            </button>
          </div>

          {/* Text Watermark inputs */}
          {watermarkType === 'text' && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">Watermark Text</Label>
                <Input 
                  value={text} 
                  onChange={e => { setText(e.target.value); setResultNull(); }} 
                  className="rounded-xl" 
                />
              </div>

              {/* Font Size slider (relative to image) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Font Size (relative to image)</span>
                  <span className="font-bold text-primary">{fontSizePercent}%</span>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={20} 
                  value={fontSizePercent} 
                  onChange={e => { setFontSizePercent(Number(e.target.value)); setResultNull(); }}
                  className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
                />
              </div>

              {/* Color inputs */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-foreground">Font Colour</Label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={color} 
                    onChange={e => { setColor(e.target.value); setResultNull(); }}
                    className="w-10 h-9 rounded border border-border/50 cursor-pointer bg-transparent" 
                  />
                  <Input 
                    type="text" 
                    value={color} 
                    onChange={e => { setColor(e.target.value); setResultNull(); }}
                    className="rounded-xl flex-1 text-sm h-9 text-foreground" 
                  />
                </div>
              </div>

              {/* Outline / Stroke check option */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable-stroke"
                    checked={enableStroke}
                    onChange={e => { setEnableStroke(e.target.checked); setResultNull(); }}
                    className="w-4 h-4 rounded border-border/50 text-primary accent-primary cursor-pointer"
                  />
                  <Label htmlFor="enable-stroke" className="text-xs font-semibold text-foreground cursor-pointer">
                    Add Outline (Stroke)
                  </Label>
                </div>

                {enableStroke && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pl-6 overflow-hidden">
                    <Label className="text-[11px] text-muted-foreground">Outline Color</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={strokeColor} 
                        onChange={e => { setStrokeColor(e.target.value); setResultNull(); }}
                        className="w-8 h-8 rounded border border-border/50 cursor-pointer bg-transparent" 
                      />
                      <Input 
                        type="text" 
                        value={strokeColor} 
                        onChange={e => { setStrokeColor(e.target.value); setResultNull(); }}
                        className="rounded-xl flex-1 text-xs h-8 text-foreground" 
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Drop Shadow check option */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable-shadow"
                    checked={enableShadow}
                    onChange={e => { setEnableShadow(e.target.checked); setResultNull(); }}
                    className="w-4 h-4 rounded border-border/50 text-primary accent-primary cursor-pointer"
                  />
                  <Label htmlFor="enable-shadow" className="text-xs font-semibold text-foreground cursor-pointer">
                    Add Drop Shadow
                  </Label>
                </div>

                {enableShadow && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pl-6 overflow-hidden">
                    <Label className="text-[11px] text-muted-foreground">Shadow Color</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={shadowColor} 
                        onChange={e => { setShadowColor(e.target.value); setResultNull(); }}
                        className="w-8 h-8 rounded border border-border/50 cursor-pointer bg-transparent" 
                      />
                      <Input 
                        type="text" 
                        value={shadowColor} 
                        onChange={e => { setShadowColor(e.target.value); setResultNull(); }}
                        className="rounded-xl flex-1 text-xs h-8 text-foreground" 
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Logo Watermark inputs */}
          {watermarkType === 'logo' && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Label className="text-sm font-semibold text-foreground">Upload Logo Image</Label>
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-xl text-xs cursor-pointer h-10 gap-1.5 text-foreground border-border/60 hover:border-primary/50"
                >
                  <ImageIcon className="w-4 h-4" /> Choose Logo
                </Button>
                <input 
                  type="file" 
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
                {logoFile ? (
                  <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-1.5 text-xs">
                    <img src={logoUrl} alt="logo-preview" className="w-8 h-8 object-contain rounded border bg-card" />
                    <span className="truncate max-w-[100px] font-medium text-foreground">{logoFile.name}</span>
                    <button type="button" onClick={removeLogo} className="text-muted-foreground hover:text-red-500 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No logo selected.</span>
                )}
              </div>
              
              {/* Logo Size percent */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Logo Size (relative to image)</span>
                  <span className="font-bold text-primary">{logoSizePercent}%</span>
                </div>
                <input 
                  type="range" 
                  min={5} 
                  max={50} 
                  value={logoSizePercent} 
                  onChange={e => { setLogoSizePercent(Number(e.target.value)); setResultNull(); }}
                  className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
                />
              </div>
            </motion.div>
          )}

          {/* Watermark position & rotations */}
          <div className="space-y-4 border-t border-border/40 pt-4">
            <Label className="text-sm font-semibold text-foreground">Position</Label>
            <select
              value={position}
              onChange={e => { setPosition(e.target.value); setResultNull(); }}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {POSITION_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            {/* Rotation slider (if applicable) */}
            {position !== 'diagonal' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Rotation Angle</span>
                  <span className="font-bold text-primary">{rotation}°</span>
                </div>
                <input 
                  type="range" 
                  min={-180} 
                  max={180} 
                  value={rotation} 
                  onChange={e => { setRotation(Number(e.target.value)); setResultNull(); }}
                  className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
                />
              </motion.div>
            )}

            {/* Opacity slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Watermark Opacity</span>
                <span className="font-bold text-primary">{opacity}%</span>
              </div>
              <input 
                type="range" 
                min={10} 
                max={100} 
                value={opacity} 
                onChange={e => { setOpacity(Number(e.target.value)); setResultNull(); }}
                className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
              />
            </div>
          </div>

          {/* Output Format Settings */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Output Format</Label>
              <select
                value={outputFormat}
                onChange={e => { setOutputFormat(e.target.value); setResultNull(); }}
                className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Quality Slider (Lossy output formats) */}
            {showQualitySlider && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Quality</span>
                  <span className="font-bold text-primary">{quality}%</span>
                </div>
                <input 
                  type="range" 
                  min={10} 
                  max={100} 
                  value={quality} 
                  onChange={e => { setQuality(Number(e.target.value)); setResultNull(); }}
                  className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
                />
              </motion.div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3 pt-2">
            {files.length > 0 && !hasSuccessfulResults && (
              <Button 
                onClick={handleApply} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer text-white"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Applying Watermark...' : `Apply Watermark ${files.length > 1 ? `(${files.length} Images)` : ''}`}
              </Button>
            )}

            {hasSuccessfulResults && (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={reset} 
                  className="rounded-2xl gap-2 py-6 font-bold cursor-pointer text-foreground"
                >
                  <RefreshCw className="w-4.5 h-4.5" /> Start Over
                </Button>
                {files.length > 1 ? (
                  <Button 
                    onClick={handleDownloadZip}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 font-bold cursor-pointer"
                  >
                    <Download className="w-4.5 h-4.5" /> Download ZIP
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleDownload(results[0])}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 font-bold cursor-pointer"
                  >
                    <Download className="w-4.5 h-4.5" /> Download
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Privacy Footnote */}
          <div className="p-3 border border-border/40 rounded-2xl bg-muted/5 text-[11px] text-muted-foreground flex gap-1.5 items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Your images are processed securely directly in your browser.</span>
          </div>
        </div>

      </div>

      {/* Batch table section */}
      {results.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md overflow-hidden p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold px-1 text-foreground">Batch Watermark Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Original Format</th>
                  <th className="py-3 px-4">Output Format</th>
                  <th className="py-3 px-4">Original Size</th>
                  <th className="py-3 px-4">Output Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.map((resItem) => (
                  <tr key={resItem.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-medium max-w-[200px] truncate text-foreground">{resItem.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{resItem.originalFormat || '--'}</td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{resItem.status === 'Complete' ? resItem.outputFormat : '--'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{formatFileSize(resItem.originalSize)}</td>
                    <td className="py-3.5 px-4 text-foreground">
                      {resItem.status === 'Complete' ? formatFileSize(resItem.outputSize) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {resItem.status === 'Waiting' && <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Waiting</span>}
                      {resItem.status === 'Processing' && (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      )}
                      {resItem.status === 'Complete' && <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Complete</span>}
                      {resItem.status === 'Failed' && <span className="text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Failed</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {resItem.status === 'Complete' && (
                        <Button 
                          onClick={() => handleDownload(resItem)} 
                          size="sm" 
                          variant="ghost" 
                          className="text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {resItem.status === 'Failed' && (
                        <span className="text-xs text-red-500">{resItem.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Info and How to Use Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/40 pt-10">
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Check className="w-5.5 h-5.5 text-primary" /> How to watermark an image:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload one or multiple JPG, PNG, WebP or AVIF images.</li>
            <li>Choose either Text Watermark or Logo Watermark.</li>
            <li>Adjust watermark position, size, opacity, and rotation controls.</li>
            <li>If using Text, customize colors, outlines (stroke), and drop shadows.</li>
            <li>If using Logo, upload your transparent PNG logo.</li>
            <li>Click **Apply Watermark** and download your watermarked image (or ZIP for batch).</li>
          </ol>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Why are font and logo sizes specified in percentages?</h4>
              <p className="text-xs text-muted-foreground">Fixed pixel sizes look huge on small photos but invisible on large 4K camera photos. Relative percentages ensure your watermark scales proportionally on all dimensions.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">What format should I upload for my logo?</h4>
              <p className="text-xs text-muted-foreground">PNG is highly recommended for logo watermarks because it preserves transparent backgrounds. Transparent WebP is also supported.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">How do I make my watermark readable on any background?</h4>
              <p className="text-xs text-muted-foreground">Toggle on **Add Outline (Stroke)** or **Add Drop Shadow** options. This creates borders around the text, making it stand out on both pure white and black areas.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Are my uploads private?</h4>
              <p className="text-xs text-muted-foreground">Yes. The entire watermarking process takes place client-side in your web browser. No files are uploaded to outer servers, ensuring 100% data security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
