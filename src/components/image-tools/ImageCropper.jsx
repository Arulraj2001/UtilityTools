import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';

import {
  Cropper,
  RectangleStencil,
  CircleStencil,
} from 'react-advanced-cropper';

import 'react-advanced-cropper/dist/style.css';

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
  ScanLine,
} from 'lucide-react';

import ImageDropZone from './ImageDropZone';

import { motion } from 'framer-motion';

import { saveAs } from 'file-saver';

const ASPECT_PRESETS = [
  { label: 'Free', value: undefined },

  { label: '1:1', value: 1 },

  { label: '16:9', value: 16 / 9 },

  { label: '9:16', value: 9 / 16 },

  { label: '4:3', value: 4 / 3 },

  { label: '3:2', value: 3 / 2 },

  {
    label: 'Circle',
    value: 1,
    circle: true,
  },
];

async function exportCanvas(
  canvas,
  quality = 1,
  isCircle = false
) {
  if (!canvas) return null;

  if (isCircle) {
    const size = Math.min(
      canvas.width,
      canvas.height
    );

    const circleCanvas =
      document.createElement('canvas');

    const ctx =
      circleCanvas.getContext('2d');

    circleCanvas.width = size;
    circleCanvas.height = size;

    ctx.beginPath();

    ctx.arc(
      size / 2,
      size / 2,
      size / 2,
      0,
      Math.PI * 2
    );

    ctx.closePath();

    ctx.clip();

    ctx.drawImage(
      canvas,
      0,
      0,
      size,
      size
    );

    canvas = circleCanvas;
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/png',
      quality
    );
  });
}

export default function ImageCropper() {
  const cropperRef = useRef(null);

  const [imageSrc, setImageSrc] =
    useState(null);

  const [file, setFile] = useState(null);

  const [rotation, setRotation] =
    useState(0);

  const [flipH, setFlipH] =
    useState(false);

  const [quality, setQuality] =
    useState(1);

  const [showOriginal, setShowOriginal] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [aspect, setAspect] = useState({
    label: 'Free',
    value: undefined,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e) => {
      if (!imageSrc) return;

      if (e.key === 'r') {
        setRotation((p) => p + 90);
      }

      if (e.key === 'f') {
        setFlipH((p) => !p);
      }
    };

    window.addEventListener(
      'keydown',
      handle
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handle
      );
    };
  }, [imageSrc]);

  const onFiles = ([f]) => {
    setFile(f);

    setResult(null);

    setImageSrc(
      URL.createObjectURL(f)
    );
  };

  const doCrop = async () => {
    if (!cropperRef.current) return;

    const canvas =
      cropperRef.current.getCanvas();

    if (!canvas) return;

    const blob = await exportCanvas(
      canvas,
      quality,
      aspect.circle
    );

    setResult({
      url: URL.createObjectURL(blob),

      blob,

      w: canvas.width,

      h: canvas.height,
    });
  };

  const reset = () => {
    setImageSrc(null);

    setFile(null);

    setResult(null);

    setRotation(0);

    setFlipH(false);

    setAspect({
      label: 'Free',
      value: undefined,
    });
  };

  const liveInfo = useMemo(() => {
    const canvas =
      cropperRef.current?.getCanvas();

    if (!canvas) return null;

    return {
      width: canvas.width,
      height: canvas.height,
    };
  }, [aspect]);

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
          {/* Top Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Format
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <ImageIcon className="w-4 h-4 text-primary" />
                PNG HD
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Rotation
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <RotateCw className="w-4 h-4 text-primary" />
                {rotation}°
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Flip
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <FlipHorizontal className="w-4 h-4 text-primary" />
                {flipH
                  ? 'Enabled'
                  : 'Disabled'}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Crop Size
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <Crop className="w-4 h-4 text-primary" />

                {liveInfo
                  ? `${liveInfo.width}×${liveInfo.height}`
                  : '--'}
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block">
              Aspect Ratio
            </Label>

            <div className="flex flex-wrap gap-2">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setAspect(p);

                    setResult(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-200 ${
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
              <div className="rounded-[28px] border border-border/50 overflow-hidden bg-muted/20 p-4 flex items-center justify-center">
                <img
                  src={result.url}
                  alt="cropped"
                  className={`max-h-[550px] object-contain ${
                    aspect.circle
                      ? 'rounded-full'
                      : 'rounded-2xl'
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
                    {aspect.circle
                      ? 'Circle PNG'
                      : 'PNG HD'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    saveAs(
                      result.url,
                      `cropped_${file.name.replace(
                        /\.[^.]+$/,
                        ''
                      )}.png`
                    )
                  }
                  className="flex-1 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Download HD
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    setResult(null)
                  }
                  className="rounded-xl"
                >
                  Re-crop
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Compare */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onMouseDown={() =>
                    setShowOriginal(true)
                  }
                  onMouseUp={() =>
                    setShowOriginal(false)
                  }
                  onMouseLeave={() =>
                    setShowOriginal(false)
                  }
                  className="rounded-xl gap-2"
                >
                  <ScanLine className="w-4 h-4" />
                  Hold to Compare
                </Button>
              </div>

              {/* Cropper */}
              <div
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f10]"
                style={{
                  height: 520,
                  backdropFilter:
                    'blur(20px)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 z-10 border border-white/10 rounded-[28px]" />

                <Cropper
                  ref={cropperRef}
                  src={
                    showOriginal
                      ? imageSrc
                      : imageSrc
                  }
                  className="h-full w-full bg-black"
                  stencilComponent={
                    aspect.circle
                      ? CircleStencil
                      : RectangleStencil
                  }
                  stencilProps={{
                    movable: true,
                    resizable: true,
                    handlers: true,
                    lines: true,
                    aspectRatio:
                      aspect.value,
                  }}
                  imageRestriction="fit-area"
                  defaultSize={({
                    imageSize,
                  }) => ({
                    width:
                      imageSize.width *
                      0.7,

                    height:
                      imageSize.height *
                      0.7,
                  })}
                  transforms={{
                    rotate: rotation,

                    flip: {
                      horizontal: flipH,
                      vertical: false,
                    },
                  }}
                  style={{
                    height: '100%',
                    width: '100%',
                  }}
                />
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>
                      Straighten
                    </span>

                    <span className="font-bold text-primary">
                      {rotation}°
                    </span>
                  </div>

                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    onChange={(e) =>
                      setRotation(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="w-full accent-primary h-2 rounded-full cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Export Quality
                  </Label>

                  <div className="flex gap-2 flex-wrap">
                    {[1, 0.92, 0.8].map(
                      (q) => (
                        <button
                          key={q}
                          onClick={() =>
                            setQuality(q)
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                            quality === q
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted border border-border/50'
                          }`}
                        >
                          {q === 1
                            ? 'Ultra HD'
                            : q === 0.92
                            ? 'High'
                            : 'Medium'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="sticky bottom-4 z-20">
                <div className="flex flex-wrap gap-3 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-3 shadow-2xl">
                  <Button
                    onClick={doCrop}
                    className="flex-1 rounded-xl px-6"
                  >
                    Crop Image
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setFlipH(
                        (f) => !f
                      )
                    }
                    className="rounded-xl gap-2"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    Flip
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setRotation(
                        (r) =>
                          (r + 90) %
                          360
                      )
                    }
                    className="rounded-xl gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    90°
                  </Button>
                </div>
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
