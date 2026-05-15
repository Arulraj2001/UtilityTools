import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Download,
  RefreshCw,
  Lock,
  Unlock,
  Maximize,
  Image as ImageIcon,
  FileImage,
  Sparkles,
} from 'lucide-react';

import ImageDropZone from './ImageDropZone';
import ImageStatChips from './ImageStatChips';

import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';

const PRESETS = [
  { label: 'Instagram Post', w: 1080, h: 1080 },
  { label: 'Instagram Story', w: 1080, h: 1920 },
  { label: 'YouTube Thumbnail', w: 1280, h: 720 },
  { label: 'Twitter Header', w: 1500, h: 500 },
  { label: 'Facebook Cover', w: 820, h: 312 },
  { label: 'LinkedIn Banner', w: 1584, h: 396 },
  { label: 'HD (1080p)', w: 1920, h: 1080 },
  { label: '2K', w: 2560, h: 1440 },
  { label: '4K', w: 3840, h: 2160 },
];

export default function ImageResizer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [origDims, setOrigDims] = useState({
    w: 0,
    h: 0,
  });

  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const [locked, setLocked] = useState(true);

  const [quality, setQuality] = useState(92);

  const [format, setFormat] = useState('auto');

  const [result, setResult] = useState(null);

  const [upscale, setUpscale] = useState(false);

  const aspectRef = useRef(1);

  const onFiles = ([f]) => {
    setFile(f);
    setResult(null);

    const url = URL.createObjectURL(f);

    setPreview(url);

    const img = new Image();

    img.onload = () => {
      setOrigDims({
        w: img.width,
        h: img.height,
      });

      setWidth(String(img.width));
      setHeight(String(img.height));

      aspectRef.current = img.width / img.height;
    };

    img.src = url;
  };

  const onWidth = (v) => {
    setWidth(v);

    if (locked && v) {
      setHeight(
        String(
          Math.round(Number(v) / aspectRef.current)
        )
      );
    }
  };

  const onHeight = (v) => {
    setHeight(v);

    if (locked && v) {
      setWidth(
        String(
          Math.round(Number(v) * aspectRef.current)
        )
      );
    }
  };

  const applyPreset = (p) => {
    setWidth(String(p.w));
    setHeight(String(p.h));
  };

  // LIVE resize estimation
  const liveEstimate = useMemo(() => {
    const w = Number(width);
    const h = Number(height);

    if (!w || !h || !origDims.w || !origDims.h) {
      return null;
    }

    const ratio =
      (w * h) / (origDims.w * origDims.h);

    return {
      scale:
        ratio > 1
          ? `${ratio.toFixed(2)}× Larger`
          : `${(1 / ratio).toFixed(2)}× Smaller`,
    };
  }, [width, height, origDims]);

  const resize = () => {
    const w = Number(width);
    const h = Number(height);

    if (!file || !w || !h) return;

    const img = new Image();

    img.src = preview;

    img.onload = () => {
      const canvas = document.createElement('canvas');

      // HD rendering
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = w * pixelRatio;
      canvas.height = h * pixelRatio;

      const ctx = canvas.getContext('2d');

      ctx.scale(pixelRatio, pixelRatio);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Better upscale rendering
      if (upscale) {
        ctx.filter = 'contrast(1.02) saturate(1.03)';
      }

      ctx.drawImage(img, 0, 0, w, h);

      let mime = file.type;

      if (format === 'png') {
        mime = 'image/png';
      } else if (format === 'jpeg') {
        mime = 'image/jpeg';
      } else if (format === 'webp') {
        mime = 'image/webp';
      }

      canvas.toBlob(
        (blob) => {
          setResult({
            url: URL.createObjectURL(blob),
            blob,
            w,
            h,
            size: blob.size,
            mime,
          });
        },
        mime,
        quality / 100
      );
    };
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const fmt = (b) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <div className="space-y-6">
      {!file ? (
        <ImageDropZone
          onFiles={onFiles}
          hint="Upload image for HD smart resizing"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          {/* Preview */}
          <div className="rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
            <img
              src={result?.url || preview}
              alt="preview"
              className="w-full max-h-[420px] object-contain"
            />
          </div>

          {/* LIVE INFO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Original
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <ImageIcon className="w-4 h-4 text-primary" />
                {origDims.w}×{origDims.h}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                New Size
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <Maximize className="w-4 h-4 text-primary" />
                {width || '--'}×{height || '--'}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Quality
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-primary" />
                {quality}%
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Scale
              </p>

              <div className="flex items-center gap-2 font-semibold">
                <FileImage className="w-4 h-4 text-primary" />
                {liveEstimate?.scale || '--'}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Social Media Presets
            </Label>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border/50 transition-colors"
                >
                  {p.label} ({p.w}×{p.h})
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">
                Width (px)
              </Label>

              <Input
                value={width}
                onChange={(e) =>
                  onWidth(e.target.value)
                }
                type="number"
                min={1}
                className="rounded-xl"
              />
            </div>

            <button
              onClick={() =>
                setLocked((l) => !l)
              }
              className="mb-0.5 p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {locked ? (
                <Lock className="w-4 h-4 text-primary" />
              ) : (
                <Unlock className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Height (px)
              </Label>

              <Input
                value={height}
                onChange={(e) =>
                  onHeight(e.target.value)
                }
                type="number"
                min={1}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label className="text-sm">
              Export Format
            </Label>

            <div className="flex flex-wrap gap-2">
              {['auto', 'png', 'jpeg', 'webp'].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      format === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border/50'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Quality</span>

              <span className="font-bold text-primary">
                {quality}%
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) =>
                setQuality(
                  Number(e.target.value)
                )
              }
              className="w-full accent-primary h-2 rounded-full cursor-pointer"
            />
          </div>

          {/* AI Upscale */}
          <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">
                HD Smart Upscale
              </p>

              <p className="text-sm text-muted-foreground">
                Improve quality during enlarging
              </p>
            </div>

            <button
              onClick={() =>
                setUpscale((u) => !u)
              }
              className={`w-14 h-8 rounded-full transition-all relative ${
                upscale
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                  upscale
                    ? 'left-7'
                    : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Result Stats */}
          {result && (
            <ImageStatChips
              stats={[
                {
                  label: 'Original',
                  value: `${origDims.w}×${origDims.h}`,
                },
                {
                  label: 'Resized',
                  value: `${result.w}×${result.h}`,
                  accent: true,
                },
                {
                  label: 'File Size',
                  value: fmt(result.size),
                },
                {
                  label: 'Format',
                  value:
                    result.mime
                      ?.split('/')
                      ?.pop()
                      ?.toUpperCase() || 'IMG',
                },
              ]}
            />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={resize}
              className="rounded-xl gap-2 px-6"
            >
              Resize Image
            </Button>

            {result && (
              <Button
                onClick={() =>
                  saveAs(
                    result.url,
                    `resized_${file.name}`
                  )
                }
                className="rounded-xl gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download HD
              </Button>
            )}

            <Button
              variant="outline"
              onClick={reset}
              className="rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}