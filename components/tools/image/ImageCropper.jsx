import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Download, RefreshCw, RotateCw, FlipHorizontal, FlipVertical, Crop, 
  Image as ImageIcon, Settings, AlertCircle, Info, Trash2, Check, 
  ShieldCheck, Sliders, ZoomIn, ZoomOut, Move, Loader2
} from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import BeforeAfter from './BeforeAfter';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';

// Import newly created modular utilities
import { formatFileSize } from '@/utils/image/formatFileSize';
import { getImageDimensions } from '@/utils/image/getImageDimensions';
import { downloadBlob } from '@/utils/image/downloadBlob';
import { cropImageHelper } from '@/utils/image/cropImageHelper';
import { revokeObjectUrl } from '@/lib/fileProcessing';

const CROP_PRESETS = [
  { id: 'free', label: 'Free Crop', aspect: undefined },
  { id: 'square', label: 'Square 1:1 (Profile)', aspect: 1, width: 1080, height: 1080 },
  { id: 'insta_portrait', label: 'Instagram Post Portrait', aspect: 4/5, width: 1080, height: 1350 },
  { id: 'insta_story', label: 'Instagram Story/Reel', aspect: 9/16, width: 1080, height: 1920 },
  { id: 'youtube', label: 'YouTube Thumbnail', aspect: 16/9, width: 1280, height: 720 },
  { id: 'facebook', label: 'Facebook Post', aspect: 1200/630, width: 1200, height: 630 },
  { id: 'linkedin', label: 'LinkedIn Banner', aspect: 4, width: 1584, height: 396 },
  { id: 'x_post', label: 'X/Twitter Post', aspect: 16/9, width: 1600, height: 900 },
  { id: 'whatsapp_dp', label: 'WhatsApp DP', aspect: 1, width: 500, height: 500 },
  { id: 'profile', label: 'Profile Picture', aspect: 1, width: 400, height: 400 },
  { id: 'blog', label: 'Blog Featured Image', aspect: 16/9, width: 1200, height: 675 },
  { id: 'web_thumbnail', label: 'Website Thumbnail', aspect: 16/9, width: 800, height: 450 },
  { id: 'custom', label: 'Custom Ratio', aspect: null }
];

export default function ImageCropper() {
  const [file, setFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [circleCrop, setCircleCrop] = useState(false);
  
  const [selectedPreset, setSelectedPreset] = useState(CROP_PRESETS[0]);
  const [customWidthRatio, setCustomWidthRatio] = useState('4');
  const [customHeightRatio, setCustomHeightRatio] = useState('3');

  // Sizing Override
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [targetWidth, setTargetWidth] = useState('1080');
  const [targetHeight, setTargetHeight] = useState('1080');

  // Export Settings
  const [outputFormat, setOutputFormat] = useState('original'); // 'original', 'jpeg', 'png', 'webp', 'avif'
  const [quality, setQuality] = useState(90); // 10-100
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [customColor, setCustomColor] = useState('#ffffff');
  
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { url, blob, w, h, originalSize, outputSize, originalFormat, outputFormat }
  const [error, setError] = useState('');

  // Dimensions of uploaded image
  const [origDimensions, setOrigDimensions] = useState({ width: 0, height: 0 });

  // Handle image upload and validation
  const handleFiles = async ([f]) => {
    if (!f) return;
    setError('');
    setResult(null);

    const ext = f.name.split('.').pop().toLowerCase();
    const type = f.type || '';
    const isSupported = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) || 
                        ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type);

    if (!isSupported) {
      setError('Unsupported file type. Please upload a JPG, PNG, WebP or AVIF image.');
      return;
    }

    if (f.size > 10 * 1024 * 1024) {
      setError('This image is too large. Please upload an image under 10 MB.');
      return;
    }

    setFile(f);
    
    // Auto detect original dimensions
    try {
      const dims = await getImageDimensions(f);
      setOrigDimensions(dims);
    } catch (e) {
      console.warn('Failed to detect dimensions', e);
    }

    // Reset crop states
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCircleCrop(false);
    setSelectedPreset(CROP_PRESETS[0]);
    setUseTargetSize(false);

    setImageSrc(URL.createObjectURL(f));
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Preset Selection Change
  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    if (preset.circle) {
      setCircleCrop(true);
    }
    
    // Auto-populate target dimensions if preset specifies it
    if (preset.width && preset.height) {
      setTargetWidth(String(preset.width));
      setTargetHeight(String(preset.height));
      setUseTargetSize(true);
    } else {
      setUseTargetSize(false);
    }
  };

  // Compute Active Aspect Ratio
  const activeAspect = useMemo(() => {
    if (circleCrop) return 1;
    if (selectedPreset.id === 'custom') {
      const w = parseFloat(customWidthRatio);
      const h = parseFloat(customHeightRatio);
      return (w > 0 && h > 0) ? w / h : undefined;
    }
    return selectedPreset.aspect;
  }, [circleCrop, selectedPreset, customWidthRatio, customHeightRatio]);

  // Main Crop Action
  const doCrop = async () => {
    if (!file || !croppedAreaPixels) {
      setError('Please upload an image first.');
      return;
    }

    // Output dimension validations
    const finalW = useTargetSize ? parseInt(targetWidth, 10) : croppedAreaPixels.width;
    const finalH = useTargetSize ? parseInt(targetHeight, 10) : croppedAreaPixels.height;

    if (finalW > 8000 || finalH > 8000) {
      setError('Output dimensions are too large. Please use a size under 8000 × 8000 pixels.');
      return;
    }

    if (finalW <= 0 || finalH <= 0) {
      setError('Please select a valid crop area.');
      return;
    }

    setLoading(true);
    setError('');

    const finalBackground = backgroundColor === 'custom' ? customColor : backgroundColor;

    try {
      const res = await cropImageHelper(file, {
        crop: croppedAreaPixels,
        rotate: rotation,
        flipHorizontal: flipH,
        flipVertical: flipV,
        circle: circleCrop,
        background: finalBackground,
        outputFormat,
        quality,
        targetWidth: useTargetSize ? finalW : undefined,
        targetHeight: useTargetSize ? finalH : undefined
      });

      const outUrl = URL.createObjectURL(res.blob);
      let resolvedFormat = outputFormat === 'original' ? file.name.split('.').pop() : outputFormat;
      if (resolvedFormat.toLowerCase() === 'jpeg') resolvedFormat = 'jpg';

      setResult({
        url: outUrl,
        blob: res.blob,
        w: res.width,
        h: res.height,
        originalSize: file.size,
        outputSize: res.blob.size,
        originalFormat: file.name.split('.').pop().toUpperCase(),
        outputFormat: resolvedFormat.toUpperCase()
      });
    } catch (err) {
      console.error(err);
      setError('Crop failed. Please try another image or adjust the crop area.');
    } finally {
      setLoading(false);
    }
  };

  // Reset/Start Over
  const reset = () => {
    if (imageSrc) revokeObjectUrl(imageSrc);
    if (result?.url) revokeObjectUrl(result.url);
    setFile(null);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCircleCrop(false);
    setResult(null);
    setError('');
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc) revokeObjectUrl(imageSrc);
      if (result?.url) revokeObjectUrl(result.url);
    };
  }, [imageSrc, result]);

  // Determine export format mime/file extension
  const exportMime = useMemo(() => {
    let fmt = outputFormat === 'original' ? file?.name.split('.').pop().toLowerCase() : outputFormat.toLowerCase();
    if (fmt === 'jpg') fmt = 'jpeg';
    return fmt;
  }, [outputFormat, file]);

  const showQualitySlider = useMemo(() => {
    return ['jpeg', 'jpg', 'webp', 'avif'].includes(exportMime || '');
  }, [exportMime]);

  const showBackgroundColor = useMemo(() => {
    const isJpg = exportMime === 'jpeg' || exportMime === 'jpg';
    return isJpg || circleCrop || rotation !== 0;
  }, [exportMime, circleCrop, rotation]);

  const showTransparencyWarning = useMemo(() => {
    const isJpg = exportMime === 'jpeg' || exportMime === 'jpg';
    return isJpg && (circleCrop || file?.type.includes('png') || file?.type.includes('webp'));
  }, [exportMime, circleCrop, file]);

  // Privacy description helper
  const isFullyClientSide = useMemo(() => {
    if (!file) return true;
    const targetServerFormat = outputFormat.toLowerCase() === 'avif';
    const customRotation = rotation % 90 !== 0;
    return !targetServerFormat && !customRotation;
  }, [file, outputFormat, rotation]);

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
          Crop Image Online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Crop images freely or use ready-made presets for social media and profile photos.
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
        
        {/* Left Column: Crop Workspace & Image Previews */}
        <div className="lg:col-span-7 space-y-6">
          {!imageSrc ? (
            <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-2">
              <ImageDropZone 
                onFiles={handleFiles} 
                hint="Supports JPG, PNG, WebP and AVIF. Max 10 MB per image." 
              />
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Your images are processed securely and automatically deleted after processing.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {result ? (
                /* Crop Complete Preview Mode */
                <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur overflow-hidden p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold truncate max-w-[70%] text-foreground">
                      Cropped Result
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="text-muted-foreground hover:text-primary cursor-pointer">
                      <RefreshCw className="w-4 h-4 mr-1" /> Re-crop
                    </Button>
                  </div>

                  <BeforeAfter 
                    before={imageSrc} 
                    after={result.url} 
                    beforeLabel={`Original: ${origDimensions.width}×${origDimensions.height}`} 
                    afterLabel={`Cropped: ${result.w}×${result.h}`} 
                  />

                  {/* Detailed Result Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <span className="text-sm font-bold text-foreground">Crop Complete</span>
                      <span className="text-xs font-semibold text-muted-foreground">Original vs Cropped</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                        <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Original</p>
                        <p className="font-bold text-foreground">{formatFileSize(result.originalSize)}</p>
                        <p className="text-muted-foreground">{origDimensions.width} × {origDimensions.height} | {result.originalFormat}</p>
                      </div>
                      <div className="space-y-1 bg-card p-3 rounded-xl border border-border/30">
                        <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Cropped</p>
                        <p className="font-bold text-foreground">{formatFileSize(result.outputSize)}</p>
                        <p className="text-muted-foreground">{result.w} × {result.h} | {result.outputFormat}</p>
                      </div>
                    </div>

                    {/* Dimensions & Sizing Warnings */}
                    {result.outputSize >= result.originalSize && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Output file is larger than original. Try WebP format or lower quality.</span>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => {
                        const filename = `${file.name.replace(/\.[^.]+$/, '')}-${circleCrop ? 'circle-crop' : 'cropped'}.${exportMime === 'jpeg' ? 'jpg' : exportMime}`;
                        downloadBlob(result.blob, filename);
                      }}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium cursor-pointer"
                    >
                      <Download className="w-4.5 h-4.5" /> Download Cropped Image
                    </Button>
                  </div>
                </div>
              ) : (
                /* Interactive Crop Editor Mode */
                <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur overflow-hidden p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold truncate max-w-[70%] text-foreground">
                      Edit Crop Selection
                    </span>
                    <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-red-500 cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  </div>

                  {/* Interactive react-easy-crop window */}
                  <div className="relative w-full h-[45vh] bg-zinc-950/90 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      rotation={rotation}
                      aspect={activeAspect}
                      cropShape={circleCrop ? 'round' : 'rect'}
                      showGrid={true}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      style={{
                        containerStyle: {
                          width: '100%',
                          height: '100%',
                          transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                        }
                      }}
                    />
                  </div>

                  {/* Crop Visual Helper Status */}
                  <div className="flex justify-between text-xs text-muted-foreground bg-muted/20 border border-border/30 rounded-xl p-3">
                    <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5" /> Drag image to adjust position</span>
                    <span className="font-semibold text-foreground">
                      Crop Area: {croppedAreaPixels ? `${croppedAreaPixels.width}×${croppedAreaPixels.height} px` : '--'}
                    </span>
                  </div>

                  {/* Visual Transformation Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                    {/* Zoom Sliders */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5" /> Zoom</span>
                        <span className="font-bold text-primary">{zoom.toFixed(1)}x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setZoom(z => Math.max(1, z - 0.2))} 
                          className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <input 
                          type="range" 
                          min={1} 
                          max={5} 
                          step={0.1}
                          value={zoom} 
                          onChange={e => setZoom(Number(e.target.value))}
                          className="flex-1 accent-primary h-1.5 bg-muted rounded-full cursor-pointer" 
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setZoom(z => Math.min(5, z + 0.2))} 
                          className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Rotation Sliders */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5" /> Rotation</span>
                        <span className="font-bold text-primary">{rotation}°</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setRotation(r => (r - 90) % 360)} 
                          className="h-8 px-2 text-xs rounded-lg cursor-pointer gap-0.5"
                        >
                          <RotateCw className="w-3 h-3 -scale-x-100" /> -90°
                        </Button>
                        <input 
                          type="range" 
                          min={-180} 
                          max={180} 
                          step={1}
                          value={rotation} 
                          onChange={e => setRotation(Number(e.target.value))}
                          className="flex-1 accent-primary h-1.5 bg-muted rounded-full cursor-pointer" 
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setRotation(r => (r + 90) % 360)} 
                          className="h-8 px-2 text-xs rounded-lg cursor-pointer gap-0.5"
                        >
                          <RotateCw className="w-3 h-3" /> +90°
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Flipping & Quick Alignment Options */}
                  <div className="flex flex-wrap gap-2 pt-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setFlipH(f => !f)} 
                      className={`rounded-xl gap-1.5 text-xs h-9 cursor-pointer ${flipH ? 'bg-primary/10 border-primary text-primary font-bold' : ''}`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" /> Flip Horizontal
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setFlipV(f => !f)} 
                      className={`rounded-xl gap-1.5 text-xs h-9 cursor-pointer ${flipV ? 'bg-primary/10 border-primary text-primary font-bold' : ''}`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" /> Flip Vertical
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                        setRotation(0);
                        setFlipH(false);
                        setFlipV(false);
                      }} 
                      className="rounded-xl gap-1.5 text-xs h-9 cursor-pointer text-muted-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reset Cropper
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Settings & Triggers */}
        <div className="lg:col-span-5 bg-card/45 backdrop-blur-md border border-border/50 p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Crop Settings</h2>
          </div>

          {/* Preset Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Aspect Ratio / Preset</Label>
            <select
              value={selectedPreset.id}
              onChange={e => {
                const preset = CROP_PRESETS.find(p => p.id === e.target.value);
                if (preset) handlePresetChange(preset);
              }}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {CROP_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Aspect Ratios */}
          {selectedPreset.id === 'custom' && !circleCrop && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4 overflow-hidden">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Width Ratio</Label>
                <Input 
                  type="number" 
                  value={customWidthRatio} 
                  onChange={e => setCustomWidthRatio(e.target.value)} 
                  className="rounded-xl"
                  placeholder="e.g. 4"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Height Ratio</Label>
                <Input 
                  type="number" 
                  value={customHeightRatio} 
                  onChange={e => setCustomHeightRatio(e.target.value)} 
                  className="rounded-xl"
                  placeholder="e.g. 3"
                />
              </div>
            </motion.div>
          )}

          {/* Target Resize Override Settings */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-target-size" className="text-xs font-semibold text-foreground cursor-pointer">
                  Scale Output Resolution
                </Label>
                <p className="text-[10px] text-muted-foreground leading-tight">Scale cropped crop region to exact output pixels.</p>
              </div>
              <input
                type="checkbox"
                id="use-target-size"
                checked={useTargetSize}
                onChange={(e) => setUseTargetSize(e.target.checked)}
                className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/40 accent-primary cursor-pointer shrink-0"
              />
            </div>

            {useTargetSize && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3 overflow-hidden">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Width (px)</Label>
                  <Input 
                    type="number" 
                    value={targetWidth} 
                    onChange={e => setTargetWidth(e.target.value)} 
                    className="rounded-xl h-9 text-xs"
                    max={8000}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Height (px)</Label>
                  <Input 
                    type="number" 
                    value={targetHeight} 
                    onChange={e => setTargetHeight(e.target.value)} 
                    className="rounded-xl h-9 text-xs"
                    max={8000}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Circle Crop Switch */}
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div className="space-y-0.5 pr-2">
              <Label htmlFor="circle-crop" className="text-xs font-semibold text-foreground cursor-pointer">
                Circle Crop Mode
              </Label>
              <p className="text-[10px] text-muted-foreground leading-tight">Crop image into circular shape (locks aspect ratio to 1:1).</p>
            </div>
            <input
              type="checkbox"
              id="circle-crop"
              checked={circleCrop}
              onChange={(e) => setCircleCrop(e.target.checked)}
              className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/40 accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* Output Export Formats */}
          <div className="space-y-2 border-t border-border/40 pt-4">
            <Label className="text-sm font-semibold text-foreground">Export Format</Label>
            <select
              value={outputFormat}
              onChange={e => setOutputFormat(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="original">Keep Original Format</option>
              <option value="jpeg">Export as JPG</option>
              <option value="png">Export as PNG</option>
              <option value="webp">Export as WebP</option>
              <option value="avif">Export as AVIF</option>
            </select>
          </div>

          {/* Background Solid Color Selector */}
          {showBackgroundColor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 border-t border-border/40 pt-4 overflow-hidden">
              {showTransparencyWarning && (
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-600 flex gap-1.5 items-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>JPG does not support transparency. Transparent areas will use the selected background colour.</span>
                </div>
              )}
              <Label className="text-xs font-semibold text-muted-foreground">Background Padding Color</Label>
              <div className="flex gap-2 items-center">
                {[
                  { id: 'transparent', label: 'Transparent' },
                  { id: '#ffffff', label: 'White' },
                  { id: '#000000', label: 'Black' },
                  { id: 'custom', label: 'Custom' },
                ].map(c => {
                  const isTransparentForbidden = c.id === 'transparent' && (exportMime === 'jpeg' || exportMime === 'jpg');
                  if (isTransparentForbidden) return null;
                  return (
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
                  );
                })}
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

          {/* Quality Slider (Lossy Formats Only) */}
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
            {imageSrc && !result && (
              <Button 
                onClick={doCrop} 
                disabled={loading} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 py-6 gap-2 text-base font-bold shadow-lg shadow-primary/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crop className="w-5 h-5" />}
                {loading ? 'Cropping Image...' : 'Crop Image'}
              </Button>
            )}

            {result && (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={reset} 
                  className="rounded-2xl gap-2 py-6 font-bold cursor-pointer text-foreground"
                >
                  <RefreshCw className="w-4.5 h-4.5" /> Start Over
                </Button>
                <Button 
                  onClick={() => {
                    const filename = `${file.name.replace(/\.[^.]+$/, '')}-${circleCrop ? 'circle-crop' : 'cropped'}.${exportMime === 'jpeg' ? 'jpg' : exportMime}`;
                    downloadBlob(result.blob, filename);
                  }}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 font-bold cursor-pointer"
                >
                  <Download className="w-4.5 h-4.5" /> Download
                </Button>
              </div>
            )}
          </div>

          {/* Privacy Footnote */}
          <div className="p-3 border border-border/40 rounded-2xl bg-muted/5 text-[11px] text-muted-foreground flex gap-1.5 items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isFullyClientSide 
                ? "Your image is cropped directly in your browser." 
                : "Your images are processed securely and automatically deleted after processing."}
            </span>
          </div>
        </div>

      </div>

      {/* How to Use Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/40 pt-10">
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Check className="w-5.5 h-5.5 text-primary" /> How to crop an image:
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
            <li>Upload your JPG, PNG, WebP or AVIF image.</li>
            <li>Choose free crop, fixed ratio or a preset.</li>
            <li>Adjust the crop area, zoom and rotation.</li>
            <li>Select output format and quality.</li>
            <li>Click Crop Image.</li>
            <li>Download your cropped image.</li>
          </ol>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5.5 h-5.5 text-primary" /> FAQ
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I crop an image into a circle?</h4>
              <p className="text-xs text-muted-foreground">Yes. Use Circle Crop mode and download as PNG or WebP to keep the transparent background.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">How do I crop an image for Instagram?</h4>
              <p className="text-xs text-muted-foreground">Use the Instagram Post, Square or Story/Reel preset depending on where you want to upload it.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Will cropping reduce image quality?</h4>
              <p className="text-xs text-muted-foreground">Cropping itself does not usually reduce quality, but exporting to JPG/WebP with lower quality settings can reduce file size and detail.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">What is the best format for a circle crop?</h4>
              <p className="text-xs text-muted-foreground">PNG or WebP is best because they support transparency.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Can I crop without stretching the image?</h4>
              <p className="text-xs text-muted-foreground">Yes. Cropping does not stretch the image. It only cuts out the selected area.</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Are my images private?</h4>
              <p className="text-xs text-muted-foreground">If cropping is client-side, images stay in the browser. If server processing is used, files should be processed temporarily and deleted after processing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
