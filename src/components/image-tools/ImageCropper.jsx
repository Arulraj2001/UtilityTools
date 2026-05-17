import React, { useState, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Download,
  RefreshCw,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  Crop,
  Image as ImageIcon,
} from 'lucide-react';

import ImageDropZone from './ImageDropZone';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';

const ASPECT_PRESETS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: 'Circle', value: 1, circle: true },
];

// Enhanced HD crop processor with REAL circle export
async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  flipH = false,
  outputFormat = 'image/png',
  quality = 1,
  isCircle = false
) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const pixelRatio = window.devicePixelRatio || 1;
  const radians = (rotation * Math.PI) / 180;

  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  const boundW = Math.ceil(img.width * cos + img.height * sin);
  const boundH = Math.ceil(img.width * sin + img.height * cos);

  // Temp rotation canvas
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  tempCanvas.width = boundW * pixelRatio;
  tempCanvas.height = boundH * pixelRatio;

  tempCtx.scale(pixelRatio, pixelRatio);

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';

  tempCtx.translate(boundW / 2, boundH / 2);
  tempCtx.rotate(radians);

  if (flipH) {
    tempCtx.scale(-1, 1);
  }

  tempCtx.drawImage(
    img,
    -img.width / 2,
    -img.height / 2
  );

  // Final output canvas
  const outCanvas = document.createElement('canvas');
  const outCtx = outCanvas.getContext('2d');

  outCanvas.width = pixelCrop.width * pixelRatio;
  outCanvas.height = pixelCrop.height * pixelRatio;

  outCtx.scale(pixelRatio, pixelRatio);

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  // REAL circle export
  if (isCircle) {
    outCtx.beginPath();

    outCtx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      Math.PI * 2
    );

    outCtx.closePath();
    outCtx.clip();
  }

  outCtx.drawImage(
    tempCanvas,
    pixelCrop.x * pixelRatio,
    pixelCrop.y * pixelRatio,
    pixelCrop.width * pixelRatio,
    pixelCrop.height * pixelRatio,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    outCanvas.toBlob(
      (blob) => resolve(blob),
      outputFormat,
      quality
    );
  });
}

export default function ImageCropper() {
  const [imageSrc, setImageSrc] = useState(null);
  const [file, setFile] = useState(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);

  const [aspect, setAspect] = useState({
    label: 'Free',
    value: null,
  });

  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [result, setResult] = useState(null);

  // LIVE preview info
  const liveInfo = useMemo(() => {
    if (!croppedAreaPixels) return null;

    return {
      width: Math.round(croppedAreaPixels.width),
      height: Math.round(croppedAreaPixels.height),
    };
  }, [croppedAreaPixels]);

  const onFiles = ([f]) => {
    setFile(f);
    setResult(null);
    setImageSrc(URL.createObjectURL(f));
  };

  const onCropComplete = useCallback((_, pix) => {
    setCroppedAreaPixels(pix);
  }, []);

  const doCrop = async () => {
    const blob = await getCroppedImg(
      imageSrc,
      croppedAreaPixels,
      rotation,
      flipH,
      'image/png',
      1,
      aspect.circle
    );

    setResult({
      url: URL.createObjectURL(blob),
      blob,
      w: croppedAreaPixels.width,
      h: croppedAreaPixels.height,
    });
  };

  const reset = () => {
    setImageSrc(null);
    setFile(null);
    setResult(null);
    setRotation(0);
    setFlipH(false);
    setZoom(1);
  };

  return (
    <div className="space-y-6">
      {!imageSrc ? (
        <ImageDropZone
          onFiles={onFiles}
          hint="Upload image for HD smart crop"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          {/* Top Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Format</p>
              <div className="flex items-center gap-2 font-semibold">
                <ImageIcon className="w-4 h-4 text-primary" />
                PNG HD
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Zoom</p>
              <div className="flex items-center gap-2 font-semibold">
                <ZoomIn className="w-4 h-4 text-primary" />
                {zoom.toFixed(1)}×
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Rotation</p>
              <div className="flex items-center gap-2 font-semibold">
                <RotateCw className="w-4 h-4 text-primary" />
                {rotation}°
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Crop Size</p>
              <div className="flex items-center gap-2 font-semibold">
                <Crop className="w-4 h-4 text-primary" />
                {liveInfo
                  ? `${liveInfo.width}×${liveInfo.height}`
                  : '--'}
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
              Aspect Ratio
            </Label>

            <div className="flex flex-wrap gap-2">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setAspect(p)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    aspect.label === p.label
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                      : 'bg-muted border-border/50 hover:border-primary/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/20 p-4 flex items-center justify-center">
                <img
                  src={result.url}
                  alt="cropped"
                  className={`max-h-96 object-contain ${
                    aspect.circle ? 'rounded-full' : 'rounded-xl'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/50 bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Resolution
                  </p>
                  <p className="font-semibold">
                    {result.w} × {result.h}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Export Type
                  </p>
                  <p className="font-semibold">
                    {aspect.circle ? 'Circle PNG' : 'PNG HD'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    saveAs(
                      result.url,
                      `cropped_${file.name.replace(/\.[^.]+$/, '')}.png`
                    )
                  }
                  className="flex-1 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Download HD
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  className="rounded-xl"
                >
                  Re-crop
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cropper */}
              <div
                className="relative rounded-2xl overflow-hidden bg-muted/30 border border-border/50"
                style={{ height: 420 }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect.value || undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape={aspect.circle ? 'round' : 'rect'}
                  showGrid
                />
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>Zoom</span>
                    <span className="font-bold text-primary">
                      {zoom.toFixed(1)}×
                    </span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>Rotation</span>
                    <span className="font-bold text-primary">
                      {rotation}°
                    </span>
                  </div>

                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={doCrop}
                  className="flex-1 rounded-xl px-6"
                >
                  Crop Image
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setFlipH((f) => !f)}
                  className="rounded-xl gap-2"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  Flip
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded-xl gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  90°
                </Button>
              </div>
            </>
          )}

          {/* Reset */}
          <Button
            variant="outline"
            onClick={reset}
            className="w-full rounded-xl gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Start Over
          </Button>
        </motion.div>
      )}
    </div>
  );
}
