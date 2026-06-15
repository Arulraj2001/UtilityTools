import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BeforeAfter from './BeforeAfter';
import { 
  Download, RefreshCw, Lock, Unlock, Maximize, Image as ImageIcon, 
  FileImage, Sparkles, Loader2, AlertCircle, Info, Trash2, Check, ShieldCheck 
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { motion, AnimatePresence } from 'framer-motion';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { getImageDimensions } from '@/utils/image/getImageDimensions';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { createImageZip } from '@/utils/image/createImageZip';
import { resizeImageHelper } from '@/utils/image/resizeImageHelper';
import { revokeObjectUrl } from '@/lib/fileProcessing';

const PRESETS = [
  { label: 'Square 1:1', w: 1080, h: 1080, fit: 'contain' },
  { label: 'Instagram Post Portrait', w: 1080, h: 1350, fit: 'cover' },
  { label: 'Instagram Story/Reel', w: 1080, h: 1920, fit: 'cover' },
  { label: 'YouTube Thumbnail', w: 1280, h: 720, fit: 'contain' },
  { label: 'Facebook Post', w: 1200, h: 630, fit: 'cover' },
  { label: 'LinkedIn Banner', w: 1584, h: 396, fit: 'cover' },
  { label: 'X/Twitter Post', w: 1600, h: 900, fit: 'cover' },
  { label: 'WhatsApp DP', w: 500, h: 500, fit: 'contain' },
  { label: 'Profile Picture', w: 400, h: 400, fit: 'cover' },
  { label: 'Website Thumbnail', w: 800, h: 450, fit: 'contain' },
  { label: 'Blog Featured Image', w: 1200, h: 675, fit: 'cover' },
];

export default function ImageResizer() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [mode, setMode] = useState('width'); // 'width', 'height', 'exact', 'percentage'
  const [width, setWidth] = useState('1080');
  const [height, setHeight] = useState('1080');
  const [percentage, setPercentage] = useState('50');
  const [locked, setLocked] = useState(true);
  const [fit, setFit] = useState('contain'); // 'contain', 'cover', 'stretch'
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [format, setFormat] = useState('keep'); // 'keep', 'jpeg', 'png', 'webp', 'avif'
  const [quality, setQuality] = useState(85); // 10-100
  const [selectedPreset, setSelectedPreset] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // Array of: { id, name, originalSize, outputSize, originalWidth, originalHeight, outputWidth, outputHeight, originalFormat, outputFormat, status, error, url, blob, modeUsed, presetUsed }
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [origDims, setOrigDims] = useState({ w: 0, h: 0 });

  const aspectRef = useRef(1);

  // Validate files and handle upload
  const handleFiles = async (newFiles) => {
    setError('');
    const validated = [];
    const errors = [];

    newFiles.forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const type = file.type || '';
      const isSupported = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) || 
                          ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type);

      if (!isSupported) {
        errors.push(`Unsupported file type: "${file.name}". Please upload a JPG, PNG, WebP or AVIF image.`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`"${file.name}" is too large. Please upload an image under 10 MB.`);
        return;
      }

      validated.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
    }

    if (validated.length > 0) {
      const newPreviews = validated.map(f => URL.createObjectURL(f));
      
      // If first upload, set initial details
      if (files.length === 0) {
        const firstFile = validated[0];
        try {
          const dims = await getImageDimensions(firstFile);
          setOrigDims({ w: dims.width, h: dims.height });
          aspectRef.current = dims.width / dims.height;
          
          if (mode === 'width') {
            setHeight(String(Math.round(dims.width / aspectRef.current)));
          } else if (mode === 'height') {
            setWidth(String(Math.round(dims.height * aspectRef.current)));
          }
        } catch (e) {
          console.warn('Could not read image dimensions', e);
        }
      }

      setFiles((prev) => [...prev, ...validated]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // Remove a single file from the list
  const removeFile = (index) => {
    revokeObjectUrl(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setSelectedIndex(0);
    setError('');
    setSelectedPreset('');
  };

  // Cleanup object URLs to prevent leaks
  useEffect(() => {
    return () => {
      previews.forEach(p => revokeObjectUrl(p));
      results.forEach(r => {
        if (r.url) revokeObjectUrl(r.url);
      });
    };
  }, [previews, results]);

  // Sync index dimensions
  useEffect(() => {
    if (files[selectedIndex]) {
      getImageDimensions(files[selectedIndex]).then(dims => {
        setOrigDims({ w: dims.width, h: dims.height });
        aspectRef.current = dims.width / dims.height;
      }).catch(e => console.warn(e));
    }
  }, [selectedIndex, files]);

  // Width dimension changes
  const onWidthChange = (val) => {
    setWidth(val);
    setSelectedPreset('');
    if (locked && val && aspectRef.current) {
      setHeight(String(Math.round(Number(val) / aspectRef.current)));
    }
  };

  // Height dimension changes
  const onHeightChange = (val) => {
    setHeight(val);
    setSelectedPreset('');
    if (locked && val && aspectRef.current) {
      setWidth(String(Math.round(Number(val) * aspectRef.current)));
    }
  };

  // Preset configuration applicator
  const applyPreset = (preset) => {
    setMode('exact');
    setWidth(String(preset.w));
    setHeight(String(preset.h));
    setFit(preset.fit);
    setSelectedPreset(preset.label);
  };

  // Determine if quality slider is relevant
  const showQualitySlider = useMemo(() => {
    const currentFormat = format.toLowerCase();
    if (['jpeg', 'webp', 'avif'].includes(currentFormat)) return true;
    if (currentFormat === 'keep' && files[selectedIndex]) {
      const type = files[selectedIndex].type || '';
      return type.includes('jpeg') || type.includes('jpg') || type.includes('webp') || type.includes('avif');
    }
    return false;
  }, [format, files, selectedIndex]);

  // Dynamic live output size estimator
  const liveOutputDims = useMemo(() => {
    if (!origDims.w || !origDims.h) return null;
    const aspect = origDims.w / origDims.h;

    if (mode === 'width') {
      const w = parseInt(width, 10) || 0;
      return { w, h: Math.round(w / aspect) };
    }
    if (mode === 'height') {
      const h = parseInt(height, 10) || 0;
      return { w: Math.round(h * aspect), h };
    }
    if (mode === 'percentage') {
      const pct = parseInt(percentage, 10) || 100;
      return {
        w: Math.round((origDims.w * pct) / 100),
        h: Math.round((origDims.h * pct) / 100),
      };
    }
    return { w: parseInt(width, 10) || 0, h: parseInt(height, 10) || 0 };
  }, [mode, width, height, percentage, origDims]);

  // Input validator
  const validateInputs = () => {
    if (files.length === 0) {
      return 'Please upload an image first.';
    }

    if (mode === 'width') {
      const w = parseInt(width, 10);
      if (!w || isNaN(w) || w <= 0) return 'Please enter a valid width.';
      if (w > 8000) return 'Output dimensions are too large. Please use a size under 8000 × 8000 pixels.';
    } else if (mode === 'height') {
      const h = parseInt(height, 10);
      if (!h || isNaN(h) || h <= 0) return 'Please enter a valid height.';
      if (h > 8000) return 'Output dimensions are too large. Please use a size under 8000 × 8000 pixels.';
    } else if (mode === 'exact') {
      const w = parseInt(width, 10);
      const h = parseInt(height, 10);
      if (!w || isNaN(w) || w <= 0) return 'Please enter a valid width.';
      if (!h || isNaN(h) || h <= 0) return 'Please enter a valid height.';
      if (w > 8000 || h > 8000) return 'Output dimensions are too large. Please use a size under 8000 × 8000 pixels.';
    } else if (mode === 'percentage') {
      const p = parseInt(percentage, 10);
      if (!p || isNaN(p) || p < 1 || p > 500) return 'Percentage must be between 1 and 500.';
      
      if (origDims.w && origDims.h) {
        const w = Math.round((origDims.w * p) / 100);
        const h = Math.round((origDims.h * p) / 100);
        if (w > 8000 || h > 8000) return 'Output dimensions are too large. Please use a size under 8000 × 8000 pixels.';
      }
    }

    return '';
  };

  // Main resize executor
  const handleResize = async () => {
    const validationErr = validateInputs();
    if (validationErr) {
      setError(validationErr);
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

    const finalFit = mode === 'exact' ? fit : 'contain';
    const finalBackground = backgroundColor === 'custom' ? customColor : backgroundColor;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'Resizing' } : r));

      try {
        let originalDims = { width: 0, height: 0 };
        try {
          originalDims = await getImageDimensions(file);
        } catch (e) {
          console.warn('Could not read dimensions', e);
        }

        let runWidth = parseInt(width, 10);
        let runHeight = parseInt(height, 10);
        const aspect = originalDims.width / originalDims.height;

        if (mode === 'width') {
          runWidth = parseInt(width, 10);
          runHeight = Math.round(runWidth / aspect);
        } else if (mode === 'height') {
          runHeight = parseInt(height, 10);
          runWidth = Math.round(runHeight * aspect);
        } else if (mode === 'percentage') {
          const p = parseInt(percentage, 10);
          runWidth = Math.round((originalDims.width * p) / 100);
          runHeight = Math.round((originalDims.height * p) / 100);
        }

        const res = await resizeImageHelper(file, {
          width: runWidth,
          height: runHeight,
          mode: mode === 'exact' ? 'exact' : mode,
          percentage: parseInt(percentage, 10),
          fit: finalFit,
          background: finalBackground,
          outputFormat: format,
          quality
        });

        const outUrl = URL.createObjectURL(res.blob);

        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Complete',
          outputSize: res.blob.size,
          url: outUrl,
          blob: res.blob,
          originalWidth: originalDims.width,
          originalHeight: originalDims.height,
          outputWidth: res.width,
          outputHeight: res.height,
          originalFormat: file.type.split('/')[1]?.toUpperCase() || 'IMG',
          outputFormat: res.blob.type.split('/')[1]?.toUpperCase() || format.toUpperCase(),
          modeUsed: mode.charAt(0).toUpperCase() + mode.slice(1),
          presetUsed: selectedPreset || 'Custom Size'
        } : r));
      } catch (err) {
        console.error(err);
        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Failed',
          error: err.message || 'Resize failed.'
        } : r));
      }
    }

    setLoading(false);
  };

  // Download individual file
  const handleDownload = (resItem) => {
    if (resItem.blob) {
      const ext = resItem.outputFormat.toLowerCase();
      downloadBlob(resItem.blob, resItem.name.replace(/\.[^.]+$/, `-resized-${resItem.outputWidth}x${resItem.outputHeight}.${ext}`));
    }
  };

  // Download all as ZIP
  const handleDownloadZip = async () => {
    const successful = results.filter(r => r.status === 'Complete' && r.blob);
    if (successful.length === 0) return;

    try {
      const zipFiles = successful.map(r => ({
        blob: r.blob,
        name: r.name.replace(/\.[^.]+$/, `-resized-${r.outputWidth}x${r.outputHeight}.${r.outputFormat.toLowerCase()}`)
      }));
      const zipBlob = await createImageZip(zipFiles);
      downloadBlob(zipBlob, 'resized-images.zip');
    } catch (e) {
      console.error(e);
      setError('Failed to generate ZIP file.');
    }
  };

  const hasSuccessfulResults = results.some(r => r.status === 'Complete');

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
          Resize Image Online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Resize images by width, height, percentage or exact social media presets while keeping good visual quality.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Upload Zone & Previews */}
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
              
              {/* Batch Selector List */}
              {files.length > 1 && (
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    {files.length} Files Selected
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="hover:text-red-500 transition-colors ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Previews */}
              {files[selectedIndex] && (
                <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur overflow-hidden p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold truncate max-w-[75%]">
                      {files[selectedIndex].name}
                    </span>
                    {files.length === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeFile(0)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  {results[selectedIndex] && results[selectedIndex].status === 'Complete' ? (
                    <div className="space-y-4">
                      {/* Before / After comparison */}
                      <BeforeAfter 
                        before={previews[selectedIndex]} 
                        after={results[selectedIndex].url} 
                        beforeLabel={`Original: ${results[selectedIndex].originalWidth}×${results[selectedIndex].originalHeight}`} 
                        afterLabel={`Resized: ${results[selectedIndex].outputWidth}×${results[selectedIndex].outputHeight}`} 
                      />

                      {/* Result Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex justify-between items-center border-b border-border/40 pb-3">
                          <span className="text-sm font-bold text-foreground">Resize Complete</span>
                          <span className="text-xs text-muted-foreground">
                            {results[selectedIndex].modeUsed} Resizing
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Original</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].originalSize)}</p>
                            <p className="text-muted-foreground">
                              {results[selectedIndex].originalWidth} × {results[selectedIndex].originalHeight} | {results[selectedIndex].originalFormat}
                            </p>
                          </div>
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Resized</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].outputSize)}</p>
                            <p className="text-muted-foreground">
                              {results[selectedIndex].outputWidth} × {results[selectedIndex].outputHeight} | {results[selectedIndex].outputFormat}
                            </p>
                          </div>
                        </div>

                        {/* File size increases warning */}
                        {results[selectedIndex].outputSize >= results[selectedIndex].originalSize && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 flex gap-2 items-center">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Output file is larger than original. Try WebP format or lower quality.</span>
                          </div>
                        )}

                        <Button 
                          onClick={() => handleDownload(results[selectedIndex])} 
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                        >
                          <Download className="w-4.5 h-4.5" /> Download Resized Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex items-center justify-center">
                        <img 
                          src={previews[selectedIndex]} 
                          alt="preview" 
                          className="w-full h-full object-contain" 
                        />
                      </div>

                      {/* Info Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Original Dims</p>
                          <p className="text-sm font-semibold">{origDims.w ? `${origDims.w}×${origDims.h}` : '--'}</p>
                        </div>
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Target Dims</p>
                          <p className="text-sm font-semibold">
                            {liveOutputDims ? `${liveOutputDims.w}×${liveOutputDims.h}` : '--'}
                          </p>
                        </div>
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">File Size</p>
                          <p className="text-sm font-semibold">{formatFileSize(files[selectedIndex].size)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Options & Settings */}
        <div className="lg:col-span-5 bg-card/45 backdrop-blur-md border border-border/50 p-6 rounded-3xl space-y-6 shadow-sm">
          
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
            <Maximize className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Resize Settings</h2>
          </div>

          {/* Social Media Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social Presets</Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl p-2 bg-muted/10 border border-border/40">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                    selectedPreset === preset.label
                      ? 'bg-primary border-primary text-white shadow'
                      : 'border-border/60 bg-card/30 hover:border-primary/40'
                  }`}
                >
                  {preset.label} ({preset.w}×{preset.h})
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">Resize Mode</Label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/20 border border-border/40 rounded-xl">
              {[
                { id: 'width', label: 'Width' },
                { id: 'height', label: 'Height' },
                { id: 'exact', label: 'Exact' },
                { id: 'percentage', label: 'Scale %' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setMode(item.id); setSelectedPreset(''); }}
                  className={`py-2 text-center rounded-lg text-xs font-semibold transition-all ${
                    mode === item.id 
                      ? 'bg-primary text-primary-foreground shadow' 
                      : 'hover:bg-card/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Input Fields */}
          {mode === 'percentage' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Scale Ratio (%)</Label>
              <Input
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                type="number"
                min={1}
                max={500}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">Scale dimensions between 1% and 500%.</p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Width (px)</Label>
                  <Input
                    value={width}
                    onChange={e => onWidthChange(e.target.value)}
                    type="number"
                    disabled={mode === 'height'}
                    className="rounded-xl"
                  />
                </div>

                {mode === 'exact' ? (
                  <div className="mb-2.5 text-muted-foreground font-semibold px-1">×</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLocked(!locked)}
                    className="mb-0.5 p-2 rounded-xl border border-border hover:bg-muted transition-colors"
                    title={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  >
                    {locked ? (
                      <Lock className="w-4 h-4 text-primary" />
                    ) : (
                      <Unlock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Height (px)</Label>
                  <Input
                    value={height}
                    onChange={e => onHeightChange(e.target.value)}
                    type="number"
                    disabled={mode === 'width'}
                    className="rounded-xl"
                  />
                </div>
              </div>
              {!locked && mode !== 'exact' && (
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600 flex gap-1.5 items-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Aspect ratio is unlocked. The image may look stretched.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Exact Fit Modes */}
          {mode === 'exact' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 border-t border-border/40 pt-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Fit Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'contain', label: 'Contain', desc: 'Adds background padding' },
                    { id: 'cover', label: 'Cover', desc: 'Fills box & crops edges' },
                    { id: 'stretch', label: 'Stretch', desc: 'Forces sizes (may distort)' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFit(f.id)}
                      className={`p-2.5 text-left rounded-xl border text-[11px] transition-all flex flex-col justify-between ${
                        fit === f.id 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border/60 hover:border-primary/40 bg-card/30'
                      }`}
                    >
                      <span className="font-bold">{f.label}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {fit === 'stretch' && (
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600 flex gap-1.5 items-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Stretch mode may distort the image.</span>
                </div>
              )}

              {/* Contain background color selector */}
              {fit === 'contain' && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Background Padding Color</Label>
                  <div className="flex gap-2 items-center">
                    {[
                      { id: '#ffffff', label: 'White' },
                      { id: '#000000', label: 'Black' },
                      { id: 'transparent', label: 'Transparent' },
                      { id: 'custom', label: 'Custom' },
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setBackgroundColor(c.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
                          backgroundColor === c.id 
                            ? 'bg-primary border-primary text-white' 
                            : 'border-border/60 hover:border-primary/40 bg-card/30'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {backgroundColor === 'custom' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-2 items-center mt-2">
                      <input 
                        type="color" 
                        value={customColor} 
                        onChange={e => setCustomColor(e.target.value)}
                        className="w-10 h-8 rounded border border-border/50 cursor-pointer" 
                      />
                      <input 
                        type="text" 
                        value={customColor} 
                        onChange={e => setCustomColor(e.target.value)}
                        className="rounded-xl border border-border/50 px-3 py-1 text-xs bg-card focus:outline-none w-28" 
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Export Options */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Export Format</Label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="keep">Keep original format</option>
                <option value="jpeg">Convert to JPG</option>
                <option value="png">Convert to PNG</option>
                <option value="webp">Convert to WebP (Recommended)</option>
                <option value="avif">Convert to AVIF</option>
              </select>
              {format === 'webp' && (
                <p className="text-[11px] text-primary flex gap-1 items-center mt-1.5 bg-primary/5 p-2 rounded-lg border border-primary/10">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>WebP usually creates smaller images with good quality.</span>
                </p>
              )}
            </div>

            {/* Quality Slider (Lossy formats only) */}
            {showQualitySlider && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Quality</span>
                  <span className="font-bold text-primary">{quality}%</span>
                </div>
                <input 
                  type="range" 
                  min={10} 
                  max={100} 
                  value={quality} 
                  onChange={e => setQuality(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-full cursor-pointer" 
                />
                
                {/* Quality presets */}
                <div className="flex justify-between gap-2 pt-1">
                  {[
                    { label: 'High Quality', val: 90 },
                    { label: 'Balanced', val: 80 },
                    { label: 'Small File', val: 65 }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setQuality(preset.val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        quality === preset.val 
                          ? 'bg-primary/15 border-primary text-primary font-bold' 
                          : 'border-border bg-card/40 hover:bg-muted'
                      }`}
                    >
                      {preset.label} ({preset.val}%)
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3 pt-2">
            {files.length > 0 && !hasSuccessfulResults && (
              <Button 
                onClick={handleResize} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Resizing Images...' : `Resize ${files.length > 1 ? `${files.length} Images` : 'Image'}`}
              </Button>
            )}

            {hasSuccessfulResults && (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={reset} 
                  className="rounded-2xl gap-2 py-6 font-bold cursor-pointer"
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

        </div>

      </div>

      {/* Batch Table */}
      {results.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md overflow-hidden p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold px-1">Batch Resize Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Original Dims</th>
                  <th className="py-3 px-4">Output Dims</th>
                  <th className="py-3 px-4">Original Size</th>
                  <th className="py-3 px-4">Output Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.map((resItem) => (
                  <tr key={resItem.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-medium max-w-[200px] truncate">{resItem.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {resItem.status === 'Complete' ? `${resItem.originalWidth}×${resItem.originalHeight}` : '--'}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {resItem.status === 'Complete' ? `${resItem.outputWidth}×${resItem.outputHeight}` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{formatFileSize(resItem.originalSize)}</td>
                    <td className="py-3.5 px-4">
                      {resItem.status === 'Complete' ? formatFileSize(resItem.outputSize) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {resItem.status === 'Waiting' && <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Waiting</span>}
                      {resItem.status === 'Resizing' && (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                          <Loader2 className="w-3 h-3 animate-spin" /> Resizing
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
                          className="text-primary hover:bg-primary/10 rounded-xl"
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

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/40 pt-10">
        
        {/* How to Use */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Check className="w-5.5 h-5.5 text-primary" /> How to resize an image:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload your <strong>JPG, PNG, WebP or AVIF</strong> image (up to 10 MB).</li>
            <li>Choose a <strong>Resize Mode</strong>: Width, Height, Exact Dimensions, or Percentage.</li>
            <li>Select an automated <strong>Social Preset</strong> (like Instagram or YouTube) or type your custom dimensions.</li>
            <li>Set the <strong>Fit Mode</strong> (Contain, Cover, or Stretch) and select the desired export format.</li>
            <li>Click <strong>Resize Image</strong> and download your newly scaled high-resolution output.</li>
          </ol>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Will resizing reduce image quality?</h4>
              <p className="text-xs text-muted-foreground">Downscaling (making smaller) keeps excellent, crisp details. Enlarging (making larger) can make an image look slightly soft or blurry because pixels must be interpolated.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">How do I resize an image without stretching it?</h4>
              <p className="text-xs text-muted-foreground">Keep the aspect ratio lock enabled. If resizing to exact dimensions, use <strong>Contain</strong> mode (adds color padding) or <strong>Cover</strong> mode (crops edges) to prevent stretching.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">What is the difference between Contain and Cover?</h4>
              <p className="text-xs text-muted-foreground"><strong>Contain</strong> ensures 100% of the image is visible inside the box, adding padding margins if the aspect ratios don't match. <strong>Cover</strong> crops the left/right or top/bottom edges so the image fills the entire box without margin bars.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I resize multiple images?</h4>
              <p className="text-xs text-muted-foreground">Yes. Upload multiple files at once to run batch resizing. You can download individual resized files or compile them all together into a single ZIP file.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
