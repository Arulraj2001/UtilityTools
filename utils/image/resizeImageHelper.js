import { canvasToBlob } from '@/lib/fileProcessing';
import { getImageDimensions } from './getImageDimensions';

/**
 * Resizes an image either client-side (via Canvas) or server-side (via sharp API)
 * @param {File} file 
 * @param {object} options 
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {string} options.mode - 'width' | 'height' | 'exact' | 'percentage'
 * @param {number} [options.percentage]
 * @param {string} options.fit - 'contain' | 'cover' | 'stretch'
 * @param {string} [options.background] - background padding color
 * @param {string} options.outputFormat - 'keep' | 'jpeg' | 'png' | 'webp' | 'avif'
 * @param {number} [options.quality] - 10-100
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function resizeImageHelper(file, {
  width,
  height,
  mode,
  percentage,
  fit = 'contain',
  background = '#ffffff',
  outputFormat = 'keep',
  quality = 85
}) {
  const fileType = file.type || '';
  const isAvif = fileType.includes('avif') || file.name.toLowerCase().endsWith('.avif');
  const needsConversion = outputFormat !== 'keep' && outputFormat.toLowerCase() !== fileType.split('/')[1];
  const targetAvif = outputFormat === 'avif';

  // Read original dims to check if it's very large
  let dims = { width: 0, height: 0 };
  try {
    dims = await getImageDimensions(file);
  } catch (e) {
    console.warn('Could not read dimensions', e);
  }

  const isLarge = dims.width > 2500 || dims.height > 2500;

  // Use server-side sharp if AVIF, large image, or format conversion is requested
  if (isAvif || targetAvif || needsConversion || isLarge) {
    return await resizeImageServer(file, { width, height, mode, percentage, fit, background, outputFormat, quality });
  }

  // Client-side canvas resize
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const origWidth = img.naturalWidth;
          const origHeight = img.naturalHeight;
          const aspect = origWidth / origHeight;

          let targetWidth = width;
          let targetHeight = height;

          if (mode === 'width') {
            targetWidth = width;
            targetHeight = Math.round(width / aspect);
          } else if (mode === 'height') {
            targetHeight = height;
            targetWidth = Math.round(height * aspect);
          } else if (mode === 'percentage') {
            const scale = (percentage || 100) / 100;
            targetWidth = Math.round(origWidth * scale);
            targetHeight = Math.round(origHeight * scale);
          }

          // Limit client-side dimensions
          targetWidth = Math.min(8000, Math.max(1, targetWidth || 100));
          targetHeight = Math.min(8000, Math.max(1, targetHeight || 100));

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (mode === 'exact') {
            if (fit === 'stretch') {
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            } else if (fit === 'cover') {
              const scale = Math.max(targetWidth / origWidth, targetHeight / origHeight);
              const nw = origWidth * scale;
              const nh = origHeight * scale;
              const nx = (targetWidth - nw) / 2;
              const ny = (targetHeight - nh) / 2;
              ctx.drawImage(img, nx, ny, nw, nh);
            } else {
              // contain mode with background padding
              ctx.fillStyle = background === 'transparent' ? 'rgba(0,0,0,0)' : background;
              if (background !== 'transparent') {
                ctx.fillRect(0, 0, targetWidth, targetHeight);
              }
              const scale = Math.min(targetWidth / origWidth, targetHeight / origHeight);
              const nw = origWidth * scale;
              const nh = origHeight * scale;
              const nx = (targetWidth - nw) / 2;
              const ny = (targetHeight - nh) / 2;
              ctx.drawImage(img, nx, ny, nw, nh);
            }
          } else {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          }

          let mime = file.type;
          if (outputFormat === 'jpeg') mime = 'image/jpeg';
          else if (outputFormat === 'png') mime = 'image/png';
          else if (outputFormat === 'webp') mime = 'image/webp';

          const blob = await canvasToBlob(canvas, mime || 'image/jpeg', quality / 100);
          
          canvas.width = 0;
          canvas.height = 0;

          resolve({
            blob,
            width: targetWidth,
            height: targetHeight
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image on client.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

async function resizeImageServer(file, {
  width,
  height,
  mode,
  percentage,
  fit,
  background,
  outputFormat,
  quality
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  if (width) formData.append('width', String(width));
  if (height) formData.append('height', String(height));
  if (percentage) formData.append('percentage', String(percentage));
  formData.append('fit', fit);
  formData.append('background', background);
  formData.append('outputFormat', outputFormat);
  formData.append('quality', String(quality));

  const res = await fetch('/api/image/resize', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Server-side resize failed');
  }

  const blob = await res.blob();
  const outWidth = parseInt(res.headers.get('X-Image-Output-Width') || '0', 10);
  const outHeight = parseInt(res.headers.get('X-Image-Output-Height') || '0', 10);

  return {
    blob,
    width: outWidth,
    height: outHeight
  };
}
