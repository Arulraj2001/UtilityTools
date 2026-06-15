import { canvasToBlob } from '@/lib/fileProcessing';
import { getImageDimensions } from './getImageDimensions';

/**
 * Converts an image either client-side (via Canvas + heic2any) or server-side (via sharp API)
 * @param {File} file 
 * @param {object} options 
 * @param {string} options.outputFormat - 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff'
 * @param {number} [options.quality] - 10-100
 * @param {string} [options.background] - hex background padding color
 * @param {boolean} [options.preserveTransparency]
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function convertImageHelper(file, {
  outputFormat,
  quality = 85,
  background = '#ffffff',
  preserveTransparency = true
}) {
  const fileType = file.type || '';
  const isHeic = fileType.includes('heic') || fileType.includes('heif') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  const isTiff = fileType.includes('tiff') || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif');
  const targetAvif = outputFormat === 'avif';
  const targetTiff = outputFormat === 'tiff';

  // If input is TIFF, or target is AVIF/TIFF, use server-side sharp
  if (isTiff || targetAvif || targetTiff) {
    return await convertImageServer(file, { outputFormat, quality, background, preserveTransparency });
  }

  // Handle HEIC using client-side heic2any first
  let srcFile = file;
  if (isHeic) {
    try {
      const heic2any = (await import('heic2any')).default;
      const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
      const convertedBlob = Array.isArray(blob) ? blob[0] : blob;
      srcFile = new File([convertedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch (e) {
      console.warn('heic2any failed client-side, falling back to server-side sharp:', e);
      return await convertImageServer(file, { outputFormat, quality, background, preserveTransparency });
    }
  }

  // If the target format is JPEG/PNG/WebP, we can try to do it client-side
  const resolvedFormat = outputFormat.toLowerCase();
  if (['jpeg', 'jpg', 'png', 'webp'].includes(resolvedFormat)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Handle transparency background fill if output is JPEG or preserveTransparency is disabled
            const isTargetJpg = ['jpeg', 'jpg'].includes(resolvedFormat);
            if (isTargetJpg || !preserveTransparency) {
              ctx.fillStyle = (background === 'transparent' || !background) ? '#ffffff' : background;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            let mime = 'image/webp';
            if (resolvedFormat === 'png') mime = 'image/png';
            else if (isTargetJpg) mime = 'image/jpeg';

            const blob = await canvasToBlob(canvas, mime, quality / 100);

            canvas.width = 0;
            canvas.height = 0;

            resolve({
              blob,
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image on client.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(srcFile);
    });
  }

  // Fallback to server side
  return await convertImageServer(file, { outputFormat, quality, background, preserveTransparency });
}

async function convertImageServer(file, {
  outputFormat,
  quality,
  background,
  preserveTransparency
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('outputFormat', outputFormat);
  formData.append('quality', String(quality));
  formData.append('background', background);
  formData.append('preserveTransparency', String(preserveTransparency));

  const res = await fetch('/api/image/convert', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Server-side conversion failed');
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
