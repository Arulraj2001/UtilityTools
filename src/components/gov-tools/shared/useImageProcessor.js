// Core client-side image processing hook
import { useState, useCallback } from 'react';

/**
 * Resize + compress an image to exact dimensions and target KB using binary search on quality.
 * Returns { blob, dataUrl, width, height, sizeBytes }
 */
export async function processImageToTarget({ file, targetWidth, targetHeight, targetMaxKB, format = 'image/jpeg', maintainAspect = false }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let outW = targetWidth || img.naturalWidth;
      let outH = targetHeight || img.naturalHeight;

      // Maintain aspect ratio if only one dimension is given
      if (maintainAspect) {
        if (targetWidth && !targetHeight) {
          outH = Math.round((img.naturalHeight / img.naturalWidth) * targetWidth);
        } else if (targetHeight && !targetWidth) {
          outW = Math.round((img.naturalWidth / img.naturalHeight) * targetHeight);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      // White background for JPEGs
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(img, 0, 0, outW, outH);

      if (!targetMaxKB) {
        // No KB target — just export at high quality
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ blob, dataUrl: e.target.result, width: outW, height: outH, sizeBytes: blob.size });
          reader.readAsDataURL(blob);
        }, format, 0.92);
        return;
      }

      // Binary search for quality that hits target KB
      const targetBytes = targetMaxKB * 1024;
      let lo = 0.01, hi = 0.99, best = null, bestQ = 0.85;
      for (let iter = 0; iter < 14; iter++) {
        const mid = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, format, mid);
        if (blob.size <= targetBytes) {
          if (!best || blob.size > best.size) { best = blob; bestQ = mid; }
          lo = mid;
        } else {
          hi = mid;
        }
        if (hi - lo < 0.005) break;
      }
      if (!best) best = await canvasToBlob(canvas, format, 0.1);
      const reader = new FileReader();
      reader.onload = (e) => resolve({ blob: best, dataUrl: e.target.result, width: outW, height: outH, sizeBytes: best.size });
      reader.readAsDataURL(best);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((res) => canvas.toBlob(res, format, quality));
}

/**
 * Load an image file and return a dataUrl + natural dimensions.
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ dataUrl: e.target.result, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
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