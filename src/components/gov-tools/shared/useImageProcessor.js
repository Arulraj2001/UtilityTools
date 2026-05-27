// Core client-side image processing hook
import { useState, useCallback } from 'react';
import { blobToDataUrl, canvasToBlob, yieldToMainThread } from '@/lib/fileProcessing';

const MAX_CANVAS_PIXELS = 80_000_000;

function validateCanvasSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('Please enter valid output dimensions.');
  }
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error('Output dimensions are too large for this browser. Try a smaller width or height.');
  }
}

/**
 * Resize + compress an image to exact dimensions and target KB using binary search on quality.
 * Returns { blob, dataUrl, width, height, sizeBytes }
 */
export async function processImageToTarget({ file, targetWidth, targetHeight, targetMaxKB, format = 'image/jpeg', maintainAspect = false }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let outW = targetWidth || img.naturalWidth;
        let outH = targetHeight || img.naturalHeight;

        if (maintainAspect) {
          if (targetWidth && !targetHeight) {
            outH = Math.round((img.naturalHeight / img.naturalWidth) * targetWidth);
          } else if (targetHeight && !targetWidth) {
            outW = Math.round((img.naturalWidth / img.naturalHeight) * targetHeight);
          }
        }

        outW = Math.round(outW);
        outH = Math.round(outH);
        validateCanvasSize(outW, outH);

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);
        }

        ctx.drawImage(img, 0, 0, outW, outH);

        if (!targetMaxKB) {
          const blob = await canvasToBlob(canvas, format, 0.92);
          const dataUrl = await blobToDataUrl(blob);
          canvas.width = 0;
          canvas.height = 0;
          resolve({ blob, dataUrl, width: outW, height: outH, sizeBytes: blob.size });
          return;
        }

        const targetBytes = targetMaxKB * 1024;
        let lo = 0.01;
        let hi = 0.99;
        let best = null;
        let smallest = null;

        for (let iter = 0; iter < 14; iter++) {
          const mid = (lo + hi) / 2;
          const blob = await canvasToBlob(canvas, format, mid);

          if (!smallest || blob.size < smallest.size) smallest = blob;
          if (blob.size <= targetBytes) {
            if (!best || blob.size > best.size) best = blob;
            lo = mid;
          } else {
            hi = mid;
          }

          if (iter % 3 === 2) await yieldToMainThread();
          if (hi - lo < 0.005) break;
        }

        const outputBlob = best || smallest;
        const dataUrl = await blobToDataUrl(outputBlob);
        canvas.width = 0;
        canvas.height = 0;
        resolve({ blob: outputBlob, dataUrl, width: outW, height: outH, sizeBytes: outputBlob.size });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Load an image file and return a dataUrl + natural dimensions.
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const dataUrl = await blobToDataUrl(file);
        resolve({ dataUrl, width, height });
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

export function useImageProcessor() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const process = useCallback(async (fn) => {
    setProcessing(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setError(e.message || 'Processing failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processing, error, process };
}
