import imageCompression from 'browser-image-compression';
import { getImageDimensions } from './getImageDimensions';

/**
 * Compresses an image either client-side or server-side depending on format and requirements.
 * @param {File} file 
 * @param {object} options 
 * @param {number} options.quality - 10-100
 * @param {string} options.format - 'keep', 'jpeg', 'png', 'webp', 'avif'
 * @param {boolean} options.removeMetadata
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function compressImage(file, { quality, format = 'keep', removeMetadata = true, maxWidthOrHeight }) {
  const fileType = file.type || '';
  const isAvif = fileType.includes('avif') || file.name.toLowerCase().endsWith('.avif');
  const needsConversion = format !== 'keep' && format.toLowerCase() !== fileType.split('/')[1];
  const targetAvif = format === 'avif';

  // If we need AVIF, or format conversion, or the input is AVIF, we use the server-side sharp API
  if (isAvif || needsConversion || targetAvif) {
    return await compressImageServer(file, { quality, format, removeMetadata, maxWidthOrHeight });
  }

  // Client-side compression using browser-image-compression
  try {
    const options = {
      maxSizeMB: 10,
      useWebWorker: true,
      initialQuality: quality / 100,
    };
    if (maxWidthOrHeight) {
      options.maxWidthOrHeight = maxWidthOrHeight;
    }

    const compressedBlob = await imageCompression(file, options);
    
    // Safety check: if browser-image-compression returned a file larger than the original
    // (sometimes happens for small files or optimized PNGs), let's fallback to server-side sharp
    if (compressedBlob.size >= file.size && quality < 90) {
      return await compressImageServer(file, { quality, format, removeMetadata, maxWidthOrHeight });
    }

    const dims = await getImageDimensions(compressedBlob);

    return {
      blob: compressedBlob,
      width: dims.width,
      height: dims.height,
    };
  } catch (error) {
    console.warn('Client-side compression failed, falling back to server-side:', error);
    return await compressImageServer(file, { quality, format, removeMetadata, maxWidthOrHeight });
  }
}

async function compressImageServer(file, { quality, format, removeMetadata, maxWidthOrHeight }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', String(quality));
  formData.append('format', format);
  formData.append('removeMetadata', String(removeMetadata));
  if (maxWidthOrHeight) {
    formData.append('maxWidthOrHeight', String(maxWidthOrHeight));
  }

  const res = await fetch('/api/image/compress', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Server-side compression failed');
  }

  const blob = await res.blob();
  const width = parseInt(res.headers.get('X-Image-Width') || '0', 10);
  const height = parseInt(res.headers.get('X-Image-Height') || '0', 10);

  return {
    blob,
    width,
    height,
  };
}
