import React, {
  useState,
  useRef,
  useMemo,
} from 'react';

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';

import 'react-image-crop/dist/ReactCrop.css';

import { motion } from 'framer-motion';

import {
  Download,
  RefreshCw,
  RotateCw,
  FlipHorizontal,
  Crop,
  Image as ImageIcon,
  Move,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { saveAs } from 'file-saver';

import ImageDropZone from './ImageDropZone';

// ========================================
// Aspect Presets
// ========================================

const ASPECT_PRESETS = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: 'Circle', value: 1, circle: true },
];

// ========================================
// Center Aspect Crop
// ========================================

function centerAspectCrop(
  mediaWidth,
  mediaHeight,
  aspect
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

// ========================================
// Component
// ========================================

export default function ImageCropper() {
  const [imageSrc, setImageSrc] = useState(null);

  const [file, setFile] = useState(null);

  const imageRef = useRef(null);

  const [crop, setCrop] = useState();

  const [completedCrop, setCompletedCrop] =
    useState(null);

  const [aspect, setAspect] = useState(
    ASPECT_PRESETS[0]
  );

  const [rotation, setRotation] = useState(0);

  const [flipH, setFlipH] = useState(false);

  const [result, setResult] = useState(null);

  // ========================================
  // Upload
  // ========================================

  const onFiles = ([f]) => {
    setFile(f);

    setResult(null);

    setCrop(undefined);

    setCompletedCrop(null);

    setRotation(0);

    setFlipH(false);

    setImageSrc(URL.createObjectURL(f));
  };

  // ========================================
  // Crop Action
  // ========================================

  const doCrop = async () => {
    if (!completedCrop || !imageRef.current)
      return;

    const image = imageRef.current;

    const canvas =
      document.createElement('canvas');

    const ctx = canvas.getContext('2d');

    const scaleX =
      image.naturalWidth / image.width;

    const scaleY =
      image.naturalHeight / image.height;

    canvas.width =
      completedCrop.width * scaleX;

    canvas.height =
      completedCrop.height * scaleY;

    ctx.imageSmoothingEnabled = true;

    ctx.imageSmoothingQuality = 'high';

    // Rotation + Flip
    ctx.save();

    ctx.translate(
      canvas.width / 2,
      canvas.height / 2
    );

    if (flipH) {
      ctx.scale(-1, 1);
    }

    ctx.rotate((rotation * Math.PI) / 180);

    // Circle crop
    if (aspect.circle) {
      ctx.beginPath();

      ctx.arc(
        0,
        0,
        Math.min(canvas.width, canvas.height) /
          2,
        0,
        Math.PI * 2
      );

      ctx.closePath();

      ctx.clip();
    }

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );

    ctx.restore();

    canvas.toBlob(
      (blob) => {
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          w: canvas.width,
          h: canvas.height,
        });
      },
      'image/png',
      1
    );
  };

  // ========================================
  // Reset
  // ========================================

  const reset = () => {
    setImageSrc(null);

    setFile(null);

    setCrop(undefined);

    setCompletedCrop(null);

    setRotation(0);

    setFlipH(false);

    setResult(null);
  };

  // ========================================
  // Live Crop Size
  // ========================================

  const liveInfo = useMemo(() => {
    if (!completedCrop) return null;

    return {
      width: Math.round(completedCrop.width),
      height: Math.round(
        completedCrop.height
      ),
    };
  }, [completedCrop]);

  return (
    <div className="space-y-6">
      {!imageSrc ? (
        <ImageDropZone
          onFiles={onFiles}
          hint="Upload image for professional HD crop"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          {/* ======================================== */}
          {/* INFO CARDS */}
          {/* ======================================== */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Export
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
                Crop Size
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <Crop className="w-4 h-4 text-primary" />

                {liveInfo
                  ? `${liveInfo.width}×${liveInfo.height}`
                  : '--'}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Mode
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <Move className="w-4 h-4 text-primary" />
                Free Resize
              </div>
            </div>
          </div>

          {/* ======================================== */}
          {/* ASPECT RATIO */}
          {/* ======================================== */}

          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
              Aspect Ratio
            </Label>

            <div className="flex flex-wrap gap-2">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setAspect(p);

                    if (
                      imageRef.current &&
                      p.value
                    ) {
                      const {
                        width,
                        height,
                      } =
                        imageRef.current;

                      setCrop(
                        centerAspectCrop(
                          width,
                          height,
                          p.value
                        )
                      );
                    } else {
                      setCrop({
                        unit: '%',
                        x: 10,
                        y: 10,
                        width: 80,
                        height: 80,
                      });
                    }
                  }}
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

          {/* ======================================== */}
          {/* RESULT */}
          {/* ======================================== */}

          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/20 p-4 flex items-center justify-center">
                <img
                  src={result.url}
                  alt="cropped"
                  className={`max-h-96 object-contain ${
                    aspect.circle
                      ? 'rounded-full'
                      : 'rounded-xl'
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
                  onClick={() => setResult(null)}
                  className="rounded-xl"
                >
                  Re-crop
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ======================================== */}
              {/* CROPPER */}
              {/* ======================================== */}

              <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20 p-4">
                <ReactCrop
                  crop={crop}
                  onChange={(c) =>
                    setCrop(c)
                  }
                  onComplete={(c) =>
                    setCompletedCrop(c)
                  }
                  aspect={aspect.value}
                  circularCrop={aspect.circle}
                  keepSelection
                  minWidth={50}
                  minHeight={50}
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="crop"
                    className={`max-h-[75vh] w-full object-contain rounded-xl transition-all ${
                      flipH
                        ? '-scale-x-100'
                        : ''
                    }`}
                    style={{
                      transform: `rotate(${rotation}deg) scaleX(${
                        flipH ? -1 : 1
                      })`,
                    }}
                    onLoad={(e) => {
                      if (aspect.value) {
                        const {
                          width,
                          height,
                        } =
                          e.currentTarget;

                        setCrop(
                          centerAspectCrop(
                            width,
                            height,
                            aspect.value
                          )
                        );
                      } else {
                        setCrop({
                          unit: '%',
                          x: 10,
                          y: 10,
                          width: 80,
                          height: 80,
                        });
                      }
                    }}
                  />
                </ReactCrop>
              </div>

              {/* ======================================== */}
              {/* ROTATION */}
              {/* ======================================== */}

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
                  onChange={(e) =>
                    setRotation(
                      Number(e.target.value)
                    )
                  }
                  className="w-full accent-primary h-2 rounded-full cursor-pointer"
                />
              </div>

              {/* ======================================== */}
              {/* ACTIONS */}
              {/* ======================================== */}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={doCrop}
                  className="flex-1 rounded-xl px-6"
                >
                  Crop Image
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    setFlipH((f) => !f)
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
                      (r) => (r + 90) % 360
                    )
                  }
                  className="rounded-xl gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  90°
                </Button>
              </div>
            </>
          )}

          {/* ======================================== */}
          {/* RESET */}
          {/* ======================================== */}

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