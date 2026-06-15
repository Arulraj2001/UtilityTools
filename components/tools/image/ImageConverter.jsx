import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Download, RefreshCw, Loader2, FileImage, Image as ImageIcon, 
  Settings, AlertCircle, Info, Trash2, Check, ShieldCheck, Sliders
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import { motion, AnimatePresence } from 'framer-motion';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { getImageDimensions } from '@/utils/image/getImageDimensions';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { createImageZip } from '@/utils/image/createImageZip';
import { convertImageHelper } from '@/utils/image/convertImageHelper';
import { revokeObjectUrl } from '@/lib/fileProcessing';

export default function ImageConverter() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [outputFormat, setOutputFormat] = useState('webp'); // 'jpeg', 'png', 'webp', 'avif', 'tiff'
  const [quality, setQuality] = useState(85); // 10-100
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // Array of: { id, name, originalSize, outputSize, originalWidth, originalHeight, outputWidth, outputHeight, originalFormat, outputFormat, status, error, url, blob }
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
      const isSupported = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'tiff', 'tif', 'gif'].includes(ext) || 
                          ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/tiff', 'image/gif'].includes(type);

      if (!isSupported) {
        errors.push(`Unsupported file type. Please upload a JPG, PNG, WebP, AVIF, HEIC or TIFF image.`);
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
      const newPreviews = validated.map(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        if (['heic', 'heif', 'tiff', 'tif'].includes(ext)) {
          return ''; // No native preview support in browser for HEIC/TIFF before conversion
        }
        return URL.createObjectURL(f);
      });
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
      if (r.url) revokeObjectUrl(r.url);
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
        if (r.url) revokeObjectUrl(r.url);
      });
    };
  }, [previews, results]);

  // Main convert trigger
  const handleConvert = async () => {
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
      outputSize: 0,
      status: 'Waiting',
      url: '',
      blob: null,
      error: ''
    }));

    setResults(initialResults);

    const finalBackground = backgroundColor === 'custom' ? customColor : backgroundColor;

    // Process batch images one-by-one sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResults(prev => prev.map(r => r.id === i ? { ...r, status: 'Converting' } : r));

      try {
        let originalDims = { width: 0, height: 0 };
        try {
          originalDims = await getImageDimensions(file);
        } catch (e) {
          console.warn('Could not read dimensions', e);
        }

        const res = await convertImageHelper(file, {
          outputFormat,
          quality,
          background: finalBackground,
          preserveTransparency
        });

        const outUrl = URL.createObjectURL(res.blob);
        const ext = outputFormat.toLowerCase();
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const outName = `${baseName}-converted.${ext === 'jpeg' ? 'jpg' : ext}`;

        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          name: outName,
          status: 'Complete',
          outputSize: res.blob.size,
          url: outUrl,
          blob: res.blob,
          originalWidth: originalDims.width || res.width,
          originalHeight: originalDims.height || res.height,
          outputWidth: res.width,
          outputHeight: res.height,
          originalFormat: file.name.split('.').pop()?.toUpperCase() || 'IMG',
          outputFormat: outputFormat.toUpperCase()
        } : r));
      } catch (err) {
        console.error(err);
        setResults(prev => prev.map(r => r.id === i ? {
          ...r,
          status: 'Failed',
          error: err.message || 'Conversion failed.'
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
      downloadBlob(zipBlob, 'converted-images.zip');
    } catch (e) {
      console.error(e);
      setError('Failed to generate ZIP file.');
    }
  };

  // Check if quality slider is relevant
  const showQualitySlider = useMemo(() => {
    return ['jpeg', 'webp', 'avif', 'tiff'].includes(outputFormat.toLowerCase());
  }, [outputFormat]);

  // Check if transparency flattening needs to be configurable
  const showBackgroundColor = useMemo(() => {
    const isTargetJpg = outputFormat.toLowerCase() === 'jpeg';
    return isTargetJpg || !preserveTransparency;
  }, [outputFormat, preserveTransparency]);

  // Check if JPEG transparency fill warning text is needed
  const showTransparencyWarning = useMemo(() => {
    if (outputFormat.toLowerCase() !== 'jpeg') return false;
    if (files[selectedIndex]) {
      const type = files[selectedIndex].type || '';
      const ext = files[selectedIndex].name.split('.').pop().toLowerCase();
      return type.includes('png') || type.includes('webp') || type.includes('gif') || ['png', 'webp', 'gif'].includes(ext);
    }
    return false;
  }, [outputFormat, files, selectedIndex]);

  // Check if original and converted can be visualised in BeforeAfter slider
  const showBeforeAfter = useMemo(() => {
    const resItem = results[selectedIndex];
    const originalPreview = previews[selectedIndex];
    if (!resItem || resItem.status !== 'Complete' || !resItem.url || !originalPreview) return false;
    
    const renderableFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    const inExt = files[selectedIndex]?.name.split('.').pop().toLowerCase() || '';
    const outExt = outputFormat.toLowerCase();
    
    return renderableFormats.includes(inExt) && renderableFormats.includes(outExt);
  }, [results, selectedIndex, previews, files, outputFormat]);

  // Check if image processing falls fully client-side
  const isFullyClientSide = useMemo(() => {
    if (files.length === 0) return true;
    const hasTiffInput = files.some(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['tiff', 'tif'].includes(ext);
    });
    const targetServerFormat = ['avif', 'tiff'].includes(outputFormat.toLowerCase());
    return !hasTiffInput && !targetServerFormat;
  }, [files, outputFormat]);

  const hasSuccessfulResults = results.some(r => r.status === 'Complete');

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
          Convert Image Online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert images between JPG, PNG, WebP, AVIF, HEIC and other formats.
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
        
        {/* Left Column: Upload and Previews */}
        <div className="lg:col-span-7 space-y-6">
          {files.length === 0 ? (
            <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-2">
              <ImageDropZone 
                onFiles={handleFiles} 
                multiple 
                hint="Supports JPG, PNG, WebP, AVIF, HEIC and TIFF. Max 10 MB per image." 
              />
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Your images are processed securely and automatically deleted after processing.</span>
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
                      {showBeforeAfter ? (
                        <BeforeAfter 
                          before={previews[selectedIndex]} 
                          after={results[selectedIndex].url} 
                          beforeLabel={`Original: ${results[selectedIndex].originalFormat}`} 
                          afterLabel={`Converted: ${results[selectedIndex].outputFormat}`} 
                        />
                      ) : results[selectedIndex].url ? (
                        <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex items-center justify-center">
                          <img 
                            src={results[selectedIndex].url} 
                            alt="preview-converted" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex flex-col items-center justify-center text-muted-foreground text-sm">
                          <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-2" />
                          <span>Preview not supported for {results[selectedIndex].outputFormat}</span>
                        </div>
                      )}
                      
                      {/* Detailed Result Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex justify-between items-center border-b border-border/40 pb-3">
                          <span className="text-sm font-bold text-foreground">Conversion Complete</span>
                          {results[selectedIndex].outputSize < results[selectedIndex].originalSize ? (
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                              -{(((results[selectedIndex].originalSize - results[selectedIndex].outputSize) / results[selectedIndex].originalSize) * 100).toFixed(1)}% Size
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">Original vs Converted</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Original</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].originalSize)}</p>
                            <p className="text-muted-foreground">
                              {results[selectedIndex].originalWidth > 0 ? `${results[selectedIndex].originalWidth} × ${results[selectedIndex].originalHeight} | ` : ''}
                              {results[selectedIndex].originalFormat}
                            </p>
                          </div>
                          <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                            <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Converted</p>
                            <p className="font-bold text-foreground">{formatFileSize(results[selectedIndex].outputSize)}</p>
                            <p className="text-muted-foreground">
                              {results[selectedIndex].outputWidth > 0 ? `${results[selectedIndex].outputWidth} × ${results[selectedIndex].outputHeight} | ` : ''}
                              {results[selectedIndex].outputFormat}
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
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium cursor-pointer"
                        >
                          <Download className="w-4.5 h-4.5" /> Download Converted Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {previews[selectedIndex] ? (
                        <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex items-center justify-center">
                          <img 
                            src={previews[selectedIndex]} 
                            alt="preview-original" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50 aspect-video flex flex-col items-center justify-center text-muted-foreground text-sm">
                          <FileImage className="w-12 h-12 text-muted-foreground/50 mb-2" />
                          <span>Preview not available for this input format</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card p-3 rounded-2xl border border-border/40 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Original Format</p>
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
            <h2 className="text-lg font-bold text-foreground">Conversion Settings</h2>
          </div>

          {/* Output Format Select */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Output Format</Label>
            <select
              value={outputFormat}
              onChange={e => setOutputFormat(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="jpeg">Convert to JPG</option>
              <option value="png">Convert to PNG</option>
              <option value="webp">Convert to WebP (Recommended)</option>
              <option value="avif">Convert to AVIF</option>
              <option value="tiff">Convert to TIFF</option>
            </select>
            {outputFormat === 'webp' && (
              <p className="text-[11px] text-primary flex gap-1 items-center mt-1.5 bg-primary/5 p-2 rounded-lg border border-primary/10">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>WebP usually creates smaller images with good quality.</span>
              </p>
            )}
          </div>

          {/* Preserve Transparency Toggle (where supported) */}
          {['png', 'webp', 'avif'].includes(outputFormat.toLowerCase()) && (
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="preserve-transparency" className="text-xs font-semibold text-foreground cursor-pointer">
                  Preserve Transparency
                </Label>
                <p className="text-[10px] text-muted-foreground leading-tight">Keep alpha transparency intact.</p>
              </div>
              <input
                type="checkbox"
                id="preserve-transparency"
                checked={preserveTransparency}
                onChange={(e) => setPreserveTransparency(e.target.checked)}
                className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/40 accent-primary cursor-pointer shrink-0"
              />
            </div>
          )}

          {/* Background color selector (for transparency warnings / flattening) */}
          {showBackgroundColor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 border-t border-border/40 pt-4 overflow-hidden">
              {showTransparencyWarning && (
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600 flex gap-1.5 items-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>JPG does not support transparency. Transparent areas will be filled with the selected background colour.</span>
                </div>
              )}
              <Label className="text-xs font-semibold text-muted-foreground">Background Fill Colour</Label>
              <div className="flex gap-2 items-center">
                {[
                  { id: '#ffffff', label: 'White' },
                  { id: '#000000', label: 'Black' },
                  { id: 'custom', label: 'Custom' },
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBackgroundColor(c.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                      backgroundColor === c.id 
                        ? 'bg-primary border-primary text-white shadow-sm' 
                        : 'border-border/60 bg-card/30 hover:border-primary/40 text-foreground'
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
                    className="w-10 h-8 rounded border border-border/50 cursor-pointer bg-transparent" 
                  />
                  <input 
                    type="text" 
                    value={customColor} 
                    onChange={e => setCustomColor(e.target.value)}
                    className="rounded-xl border border-border/50 px-3 py-1 text-xs bg-card focus:outline-none w-28 text-foreground" 
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Quality Slider */}
          {showQualitySlider && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 border-t border-border/40 pt-4 overflow-hidden">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Quality</span>
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
              <p className="text-[10px] text-muted-foreground leading-tight">Lower quality creates smaller files but may reduce visual detail.</p>
              
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
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      quality === preset.val 
                        ? 'bg-primary/15 border-primary text-primary font-bold' 
                        : 'border-border bg-card/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    {preset.label} ({preset.val}%)
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Trigger Buttons */}
          <div className="space-y-3 pt-2">
            {files.length > 0 && !hasSuccessfulResults && (
              <Button 
                onClick={handleConvert} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Converting Images...' : `Convert ${files.length > 1 ? `${files.length} Images` : 'Image'}`}
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

          {/* Privacy Text Footer */}
          <div className="p-3 border border-border/40 rounded-2xl bg-muted/5 text-[11px] text-muted-foreground flex gap-1.5 items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isFullyClientSide 
                ? "Your images are converted directly in your browser." 
                : "Your images are processed securely and automatically deleted after processing."}
            </span>
          </div>
        </div>

      </div>

      {/* Batch Table */}
      {results.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md overflow-hidden p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold px-1 text-foreground">Batch Conversion Results</h3>
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
                      {resItem.status === 'Converting' && (
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                          <Loader2 className="w-3 h-3 animate-spin" /> Converting
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

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/40 pt-10">
        
        {/* How to Use */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Check className="w-5.5 h-5.5 text-primary" /> How to convert an image:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload your JPG, PNG, WebP, AVIF, HEIC or TIFF image.</li>
            <li>Choose the output format.</li>
            <li>Adjust quality or background settings if needed.</li>
            <li>Click Convert Image.</li>
            <li>Download your converted image.</li>
          </ol>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Which image formats can I convert?</h4>
              <p className="text-xs text-muted-foreground">You can convert common formats such as JPG, PNG, WebP, AVIF, HEIC and TIFF, depending on browser and server support.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I convert HEIC photos from iPhone?</h4>
              <p className="text-xs text-muted-foreground">Yes. HEIC to JPG or PNG conversion should be supported using the existing HEIC conversion engine.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Does JPG support transparent backgrounds?</h4>
              <p className="text-xs text-muted-foreground">No. JPG does not support transparency. Transparent areas will be filled with the selected background colour.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Which format gives the smallest file size?</h4>
              <p className="text-xs text-muted-foreground">WebP and AVIF usually create smaller files than JPG or PNG while keeping good quality.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I convert multiple images?</h4>
              <p className="text-xs text-muted-foreground">Yes. Upload multiple images and download them individually or as a ZIP file.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Are my images private?</h4>
              <p className="text-xs text-muted-foreground">If conversion is client-side, images stay in the browser. If server processing is used, files should be processed temporarily and deleted after processing.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
