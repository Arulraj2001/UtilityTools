import React, { useState, useRef } from 'react';

import {
  Cropper,
  RectangleStencil,
} from 'react-advanced-cropper';

import 'react-advanced-cropper/dist/style.css';

import DropZone from './shared/DropZone';

import {
  DownloadButton,
} from './shared/FileStats';

import ProcessingOverlay from './shared/ProcessingOverlay';

import {
  loadImageFile,
  useImageProcessor,
} from './shared/useImageProcessor';

import { cn } from '@/lib/utils';

const CROP_PRESETS = [
  {
    id: 'ssc',
    label: 'SSC',
    aspect: 100 / 120,
    note: '100×120 px',
  },

  {
    id: 'ibps',
    label: 'IBPS/SBI',
    aspect: 200 / 230,
    note: '200×230 px',
  },

  {
    id: 'rrb',
    label: 'RRB',
    aspect: 100 / 120,
    note: '100×120 px',
  },

  {
    id: 'passport',
    label: 'Passport',
    aspect: 35 / 45,
    note: '35×45 mm',
  },

  {
    id: 'upsc',
    label: 'UPSC',
    aspect: 200 / 240,
    note: '200×240 px',
  },

  {
    id: '1:1',
    label: 'Square',
    aspect: 1,
    note: '1:1 ratio',
  },

  {
    id: 'free',
    label: 'Free Crop',
    aspect: undefined,
    note: 'Any aspect',
  },
];

async function getCroppedImg(
  canvas,
  targetMaxKB = 50
) {
  const targetBytes = targetMaxKB * 1024;

  let lo = 0.01;
  let hi = 0.99;

  let best = null;

  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;

    const blob = await new Promise((r) =>
      canvas.toBlob(r, 'image/jpeg', mid)
    );

    if (blob.size <= targetBytes) {
      if (!best || blob.size > best.size) {
        best = blob;
      }

      lo = mid;
    } else {
      hi = mid;
    }

    if (hi - lo < 0.005) {
      break;
    }
  }

  if (!best) {
    best = await new Promise((r) =>
      canvas.toBlob(r, 'image/jpeg', 0.7)
    );
  }

  const dataUrl = await new Promise((r) => {
    const reader = new FileReader();

    reader.onload = (e) => r(e.target.result);

    reader.readAsDataURL(best);
  });

  return {
    blob: best,
    dataUrl,
    sizeBytes: best.size,
    width: canvas.width,
    height: canvas.height,
  };
}

export default function ExamPhotoCropper() {
  const cropperRef = useRef(null);

  const [file, setFile] = useState(null);

  const [originalSrc, setOriginalSrc] =
    useState(null);

  const [preset, setPreset] = useState(
    CROP_PRESETS[0]
  );

  const [targetKB, setTargetKB] =
    useState(20);

  const [output, setOutput] = useState(null);

  const {
    processing,
    error,
    process,
  } = useImageProcessor();

  const handleFile = async (f) => {
    setFile(f);

    setOutput(null);

    const d = await loadImageFile(f);

    setOriginalSrc(d.dataUrl);
  };

  const reset = () => {
    setFile(null);

    setOriginalSrc(null);

    setOutput(null);
  };

  const handleCrop = async () => {
    if (!cropperRef.current) return;

    const canvas =
      cropperRef.current.getCanvas();

    if (!canvas) return;

    const result = await process(() =>
      getCroppedImg(canvas, targetKB)
    );

    if (result) {
      setOutput(result);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-2xl">✂️</div>

        <div>
          <p className="font-semibold text-sm">
            Exam Photo Cropper
          </p>

          <p className="text-xs text-muted-foreground mt-0.5">
            Crop your photo to exact exam
            aspect ratios with live preview.
            Supports SSC, IBPS, RRB, UPSC,
            Passport, and Free Crop mode.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFile={handleFile}
          label="Upload photo to crop"
          sublabel="JPG, PNG, WebP supported"
        />
      ) : (
        <div className="relative space-y-5">
          <ProcessingOverlay
            show={processing}
            message="Cropping..."
          />

          {/* Presets */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Crop Preset
            </label>

            <div className="flex flex-wrap gap-2">
              {CROP_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPreset(p);

                    setOutput(null);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    preset.id === p.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border hover:border-primary/40'
                  )}
                >
                  {p.label}

                  <span className="ml-1 text-[10px] opacity-70">
                    {p.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-[550px] bg-[#0f0f10] rounded-[28px] overflow-hidden border border-white/10 shadow-2xl">
            <Cropper
              ref={cropperRef}
              src={originalSrc}
              className="h-full w-full bg-black"
              stencilComponent={
                RectangleStencil
              }
              stencilProps={{
                movable: true,
                resizable: true,
                lines: true,
                handlers: true,
                aspectRatio:
                  preset.aspect || undefined,
              }}
              imageRestriction="fit-area"
              defaultSize={({ imageSize }) => ({
                width:
                  imageSize.width * 0.7,
                height:
                  imageSize.height * 0.7,
              })}
              style={{
                height: '100%',
                width: '100%',
              }}
            />
          </div>

          {/* Target Size */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Target size: {targetKB} KB
            </label>

            <input
              type="range"
              min="5"
              max="200"
              value={targetKB}
              onChange={(e) =>
                setTargetKB(
                  Number(e.target.value)
                )
              }
              className="flex-1 accent-primary"
            />
          </div>

          {/* Output */}
          {output && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
              <div className="px-3 py-2 text-xs font-medium text-primary flex justify-between">
                <span>Cropped Result</span>

                <span>
                  {(
                    output.sizeBytes / 1024
                  ).toFixed(1)}{' '}
                  KB — {output.width}×
                  {output.height} px
                </span>
              </div>

              <div className="flex justify-center p-4 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)_0_0/16px_16px]">
                <img
                  src={output.dataUrl}
                  alt="Cropped"
                  className="max-h-64 object-contain rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCrop}
              disabled={processing}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {processing
                ? 'Cropping...'
                : '✂️ Crop Photo'}
            </button>

            {output && (
              <DownloadButton
                blob={output.blob}
                filename={`cropped_${preset.id}.jpg`}
                label="Download"
              />
            )}
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Upload different image
          </button>
        </div>
      )}
    </div>
  );
}
