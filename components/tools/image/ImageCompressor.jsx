import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Loader2, RefreshCw, Settings, Sliders, Target, 
  Check, AlertCircle, Info, Trash2, FileImage, Image as ImageIcon,
  ArrowRight, ShieldCheck, Heart
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import { motion, AnimatePresence } from 'framer-motion';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { getImageDimensions } from '@/utils/image/getImageDimensions';
import { compressImage } from '@/utils/image/compressImage';
import { compressToTargetSize } from '@/utils/image/compressToTargetSize';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { createImageZip } from '@/utils/image/createImageZip';
import { revokeObjectUrl } from '@/lib/fileProcessing';

const TARGET_SIZE_PRESETS = [50, 100, 200, 500, 1000];

export default function ImageCompressor() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [mode, setMode] = useState('balanced'); // 'high', 'balanced', 'smallest', 'custom', 'target'
  const [quality, setQuality] = useState(75); // 10-100
  const [targetSize, setTargetSize] = useState('100'); // preset size in KB (or 'custom')
  const [customTargetSize, setCustomTargetSize] = useState(''); // user input in KB
  const [format, setFormat] = useState('keep'); // 'keep', 'jpeg', 'png', 'webp', 'avif'
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // Array of: { id, name, originalSize, compressedSize, savings, compressedUrl, compressedBlob, width, height, newWidth, newHeight, format, status, error, reachedTarget, warning, qualityUsed }
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');

  // Handle files upload and validate
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
      setFiles((prev) => [...prev, ...validated]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // Remove a single file from the upload list
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
      if (r.compressedUrl) revokeObjectUrl(r.compressedUrl);
    });
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setSelectedIndex(0);
    setError('');
  };

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach(p => revokeObjectUrl(p));
      results.forEach(r => {
        if (r.compressedUrl) revokeObjectUrl(r.compressedUrl);
      });
    };
  }, [previews, results]);

  // Estimate size based on compression options (for display purposes)
  const estimatedSize = useMemo(() => {
    if (files.length === 0 || !files[selectedIndex]) return null;
    const selectedFile = files[selectedIndex];
    
    if (mode === 'target') {
      const val = targetSize === 'custom' ? parseInt(customTargetSize, 10) : parseInt(targetSize, 10);
      if (val && !isNaN(val)) {
        return Math.min(selectedFile.size, val * 1024);
      }
    }

    let estQuality = 75;
    if (mode === 'high') estQuality = 85;
    else if (mode === 'smallest') estQuality = 55;
    else if (mode === 'custom') estQuality = quality;

    const ratio = Math.min(0.88, Math.max(0.18, (estQuality / 100) * 0.72));
    return Math.max(1024, Math.round(selectedFile.size * ratio));
  }, [files, selectedIndex, mode, quality, targetSize, customTargetSize]);

  // Main compress trigger
  const handleCompress = async () => {
    if (files.length === 0) {
      setError('Please upload an image first.');
      return;
    }

    setLoading(true);
    setError('');

    const initialResults = files.map((file, i) => ({
      id: i,
      name: file.name,
      originalSize: file.size,
      compressedSize: 0,
      savings: 0,
      status: 'Waiting',
      compressedUrl: '',
      compressedBlob: null,
      error: '',
      reachedTarget: true
    }));

    setResults(initialResults);

    let finalQuality = quality;
    if (mode === 'high') finalQuality = 85;
    else if (mode === 'balanced') finalQuality = 75;
    else if (mode === 'smallest') finalQuality = 55;

    const targetSizeVal = mode === 'target'
      ? (targetSize === 'custom' ? parseInt(customTargetSize, 10) : parseInt(targetSize, 10))
      : 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'Compressing' } : r));

      try {
        let compressedData;
        let originalDims = { width: 0, height: 0 };
        
        try {
          originalDims = await getImageDimensions(file);
        } catch (e) {
          console.warn('Could not read dimensions', e);
        }

        if (mode === 'target') {
          if (!targetSizeVal || isNaN(targetSizeVal)) {
            throw new Error('Please specify a valid target size.');
          }
          compressedData = await compressToTargetSize(file, targetSizeVal, { format, removeMetadata });
        } else {
          const res = await compressImage(file, { quality: finalQuality, format, removeMetadata });
          compressedData = {
            blob: res.blob,
            width: res.width,
            height: res.height,
            reachedTarget: true,
            qualityUsed: finalQuality
          };
        }

        const compSize = compressedData.blob.size;
        const savings = parseFloat((((file.size - compSize) / file.size) * 100).toFixed(1));
        const compUrl = URL.createObjectURL(compressedData.blob);

        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Complete',
          compressedSize: compSize,
          savings,
          compressedUrl: compUrl,
          compressedBlob: compressedData.blob,
          width: originalDims.width,
          height: originalDims.height,
          newWidth: compressedData.width,
          newHeight: compressedData.height,
          format: compressedData.blob.type.split('/')[1]?.toUpperCase() || format.toUpperCase(),
          reachedTarget: compressedData.reachedTarget,
          warning: compressedData.warning,
          qualityUsed: compressedData.qualityUsed
        } : r));
      } catch (err) {
        console.error(err);
        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Failed',
          error: err.message || 'Compression failed.'
        } : r));
      }
    }

    setLoading(false);
  };

  // Individual file download
  const handleDownload = (resItem) => {
    if (resItem.compressedBlob) {
      downloadBlob(resItem.compressedBlob, resItem.name.replace(/\.[^.]+$/, `-compressed.${resItem.format.toLowerCase()}`));
    }
  };

  // ZIP download for batch files
  const handleDownloadZip = async () => {
    const successful = results.filter(r => r.status === 'Complete' && r.compressedBlob);
    if (successful.length === 0) return;

    try {
      const zipFiles = successful.map(r => ({
        blob: r.compressedBlob,
        name: r.name.replace(/\.[^.]+$/, `-compressed.${r.format.toLowerCase()}`)
      }));
      const zipBlob = await createImageZip(zipFiles);
      downloadBlob(zipBlob, 'compressed-images.zip');
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
          Compress Image Online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Reduce image file size while keeping good visual quality. Direct browser processing with smart server-side conversion when needed.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </motion.div>
      )}

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload and Previews */}
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
                <span>Your images are compressed directly in your browser.</span>
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
                          className="hover:text-red-500 transition-colors ml-1"
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
                <div className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur overflow-hidden p-4 space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold truncate max-w-[70%]">
                      {files[selectedIndex].name}
                    </span>
                    {files.length === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeFile(0)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  {/* Previews: side by side or BeforeAfter */}
                  {results[selectedIndex] && results[selectedIndex].status === 'Complete' ? (
                    <div className="space-y-4 animate-fade-in">
                      <BeforeAfter 
                        before={previews[selectedIndex]} 
                        after={results[selectedIndex].compressedUrl} 
                        beforeLabel={`Original: ${formatFileSize(results[selectedIndex].originalSize)}`} 
                        afterLabel={`Compressed: ${formatFileSize(results[selectedIndex].compressedSize)}`} 
                      />
                      
                      {/* Detailed Result Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex justify-between items-center border-b border-border/40 pb-3">
                          <span className="text-sm font-bold text-foreground">Compression Complete</span>
                          <span className="text-sm font-extrabold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            Saved {results[selectedIndex].savings}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Original</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].originalSize)}</p>
                            <p className="text-muted-foreground">{results[selectedIndex].width} × {results[selectedIndex].height}</p>
                          </div>
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Compressed</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].compressedSize)}</p>
                            <p className="text-muted-foreground">{results[selectedIndex].newWidth} × {results[selectedIndex].newHeight}</p>
                          </div>
                        </div>
                        
                        {/* Target warnings */}
                        {!results[selectedIndex].reachedTarget && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 flex gap-2 items-center">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{results[selectedIndex].warning}</span>
                          </div>
                        )}

                        {/* File size increases warning */}
                        {results[selectedIndex].compressedSize >= results[selectedIndex].originalSize && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 flex gap-2 items-center">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Output is larger than original. Try a lower quality or WebP format.</span>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleDownload(results[selectedIndex])} 
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                        >
                          <Download className="w-4.5 h-4.5" /> Download {results[selectedIndex].format} Image
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
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Estimated output</p>
                          <p className="text-base font-semibold">{formatFileSize(estimatedSize)}</p>
                        </div>
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Original dimensions</p>
                          <p className="text-base font-semibold">Ready</p>
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
            <h2 className="text-lg font-bold">Compression Settings</h2>
          </div>

          {/* Compression Modes */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" /> Compression Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'balanced', label: 'Balanced', desc: 'Default (75% quality)' },
                { id: 'high', label: 'High Quality', desc: 'Slight comp (85% quality)' },
                { id: 'smallest', label: 'Smallest Size', desc: 'Max comp (55% quality)' },
                { id: 'custom', label: 'Custom Quality', desc: 'Manual control' },
                { id: 'target', label: 'Target Size', desc: 'Fit under size limit' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-3 text-left rounded-xl border text-xs transition-all relative flex flex-col justify-between ${
                    m.id === 'target' ? 'col-span-2' : ''
                  } ${
                    mode === m.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border/60 hover:border-primary/40 bg-card/30'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold">{m.label}</span>
                    {mode === m.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Quality Slider */}
          {mode === 'custom' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">Select Quality</span>
                <span className="font-bold text-primary">{quality}%</span>
              </div>
              <input 
                type="range" 
                min={10} 
                max={100} 
                value={quality} 
                onChange={e => setQuality(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full bg-muted cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Maximum compression</span>
                <span>Best quality</span>
              </div>
            </motion.div>
          )}

          {/* Target File Size Selection */}
          {mode === 'target' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
              <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" /> Target Size Limit (KB)
              </label>
              <div className="flex flex-wrap gap-2">
                {TARGET_SIZE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setTargetSize(String(preset)); setCustomTargetSize(''); }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      targetSize === String(preset) && !customTargetSize
                        ? 'bg-primary border-primary text-white shadow'
                        : 'border-border/60 bg-card/30 hover:border-primary/40'
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000} MB` : `${preset} KB`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTargetSize('custom')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    targetSize === 'custom'
                      ? 'bg-primary border-primary text-white shadow'
                      : 'border-border/60 bg-card/30 hover:border-primary/40'
                  }`}
                >
                  Custom KB
                </button>
              </div>
              
              {targetSize === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                  <input
                    type="number"
                    value={customTargetSize}
                    onChange={e => setCustomTargetSize(e.target.value)}
                    placeholder="Enter limit in KB (e.g. 150)"
                    className="w-full rounded-xl border border-border/50 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Output Format Options */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Output Format</label>
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
                <span>WebP usually gives smaller file sizes while keeping good quality.</span>
              </p>
            )}
          </div>

          {/* Metadata Removal */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="metadata-chk"
              checked={removeMetadata}
              onChange={e => setRemoveMetadata(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
            <label htmlFor="metadata-chk" className="text-xs text-muted-foreground font-medium cursor-pointer selection:bg-transparent select-none">
              Remove metadata for smaller file and better privacy
            </label>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {files.length > 0 && !hasSuccessfulResults && (
              <Button 
                onClick={handleCompress} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Compressing Images...' : `Compress ${files.length > 1 ? `${files.length} Images` : 'Image'}`}
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

      {/* Batch Results Table */}
      {results.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md overflow-hidden p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold px-1">Batch Compression Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Original Size</th>
                  <th className="py-3 px-4">Compressed Size</th>
                  <th className="py-3 px-4">Saved %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.map((resItem) => (
                  <tr key={resItem.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-medium max-w-[200px] truncate">{resItem.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{formatFileSize(resItem.originalSize)}</td>
                    <td className="py-3.5 px-4">
                      {resItem.status === 'Complete' ? formatFileSize(resItem.compressedSize) : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {resItem.status === 'Complete' ? (
                        <span className="font-bold text-emerald-500">-{resItem.savings}%</span>
                      ) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {resItem.status === 'Waiting' && <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Waiting</span>}
                      {resItem.status === 'Compressing' && (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                          <Loader2 className="w-3 h-3 animate-spin" /> Compressing
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
            <Check className="w-5.5 h-5.5 text-primary" /> How to compress an image:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload your <strong>JPG, PNG, WebP or AVIF</strong> image (up to 10 MB per file).</li>
            <li>Choose your preferred <strong>Compression Mode</strong>: Balanced (recommended), High Quality, Smallest Size, Custom Quality, or Target Size (e.g. compress under 100 KB).</li>
            <li>Select your desired <strong>Output Format</strong> (keep original or convert).</li>
            <li>Click <strong>Compress Image</strong> to start the optimization process.</li>
            <li>Preview the output and download your optimized image (or a ZIP bundle for batch files).</li>
          </ol>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Will image compression reduce quality?</h4>
              <p className="text-xs text-muted-foreground">Strong compression can reduce quality. Use High Quality or Balanced mode to optimize file sizes while preserving visual clarity.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I compress an image under 100 KB?</h4>
              <p className="text-xs text-muted-foreground">Yes. Select the Target Size mode and choose 100 KB. Our engine will dynamically adjust quality parameters iteratively to fit within your specified size limit.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Which format gives the smallest file size?</h4>
              <p className="text-xs text-muted-foreground">WebP and AVIF formats generally produce much smaller file sizes than traditional JPEG or PNG formats at equivalent quality levels.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I compress multiple images?</h4>
              <p className="text-xs text-muted-foreground">Yes. Drag and drop multiple images at once to queue batch compression. You can review individual results and download all files bundled in a single ZIP.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
