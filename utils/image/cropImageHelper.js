import { canvasToBlob } from '@/lib/fileProcessing';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for cropping.'));
    img.src = url;
  });
}

/**
 * Crops an image either client-side (via dual-Canvas operations) or server-side (via sharp API)
 * @param {File} file 
 * @param {object} options 
 * @param {object} options.crop - { x, y, width, height }
 * @param {number} [options.rotate] - rotation angle in degrees
 * @param {boolean} [options.flipHorizontal]
 * @param {boolean} [options.flipVertical]
 * @param {boolean} [options.circle]
 * @param {string} [options.background] - transparent | #ffffff | etc.
 * @param {string} [options.outputFormat] - keep original | jpeg | png | webp | avif
 * @param {number} [options.quality] - 10-100
 * @param {number} [options.targetWidth]
 * @param {number} [options.targetHeight]
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function cropImageHelper(file, {
  crop,
  rotate = 0,
  flipHorizontal = false,
  flipVertical = false,
  circle = false,
  background = 'transparent',
  outputFormat = 'original',
  quality = 90,
  targetWidth,
  targetHeight
}) {
  const fileType = file.type || '';
  const isTiff = fileType.includes('tiff') || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif');
  const targetAvif = outputFormat === 'avif';
  const customRotation = rotate % 90 !== 0;

  // Fallback to server-side sharp if TIFF, AVIF target, or custom rotation
  if (isTiff || targetAvif || customRotation) {
    return await cropImageServer(file, { crop, rotate, flipHorizontal, flipVertical, circle, background, outputFormat, quality, targetWidth, targetHeight });
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    // Canvas 1: Draw rotated and flipped full image
    const is90or270 = Math.abs(rotate % 180) === 90;
    const transformedWidth = is90or270 ? img.naturalHeight : img.naturalWidth;
    const transformedHeight = is90or270 ? img.naturalWidth : img.naturalHeight;

    const canvas1 = document.createElement('canvas');
    canvas1.width = transformedWidth;
    canvas1.height = transformedHeight;
    const ctx1 = canvas1.getContext('2d');

    ctx1.translate(transformedWidth / 2, transformedHeight / 2);
    ctx1.rotate((rotate * Math.PI) / 180);
    ctx1.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx1.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // Canvas 2: Extract the crop area (and optionally scale/resize)
    const canvas2 = document.createElement('canvas');
    const finalW = (targetWidth && targetWidth > 0) ? targetWidth : crop.width;
    const finalH = (targetHeight && targetHeight > 0) ? targetHeight : crop.height;

    canvas2.width = finalW;
    canvas2.height = finalH;
    const ctx2 = canvas2.getContext('2d');

    ctx2.imageSmoothingEnabled = true;
    ctx2.imageSmoothingQuality = 'high';

    let resolvedFormat = outputFormat === 'original' ? file.type.split('/')[1] : outputFormat;
    if (resolvedFormat === 'jpg') resolvedFormat = 'jpeg';
    const isJpg = ['jpeg', 'jpg'].includes(resolvedFormat);

    // If JPEG or solid background color is selected, fill background
    if (isJpg || background !== 'transparent') {
      ctx2.fillStyle = (background === 'transparent' || !background) ? '#ffffff' : background;
      ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    }

    // Apply circular clipping path if circle crop is enabled
    if (circle) {
      ctx2.beginPath();
      ctx2.arc(canvas2.width / 2, canvas2.height / 2, Math.min(canvas2.width, canvas2.height) / 2, 0, Math.PI * 2);
      ctx2.closePath();
      ctx2.clip();
    }

    ctx2.drawImage(canvas1, crop.x, crop.y, crop.width, crop.height, 0, 0, finalW, finalH);

    let mime = 'image/png';
    if (resolvedFormat === 'webp') mime = 'image/webp';
    else if (isJpg) mime = 'image/jpeg';

    const blob = await canvasToBlob(canvas2, mime, quality / 100);

    // Cleanup
    canvas1.width = 0;
    canvas1.height = 0;
    canvas2.width = 0;
    canvas2.height = 0;

    return {
      blob,
      width: finalW,
      height: finalH
    };
  } catch (err) {
    console.warn('Canvas crop failed client-side, falling back to server-side sharp:', err);
    return await cropImageServer(file, { crop, rotate, flipHorizontal, flipVertical, circle, background, outputFormat, quality, targetWidth, targetHeight });
  }
}

async function cropImageServer(file, {
  crop,
  rotate,
  flipHorizontal,
  flipVertical,
  circle,
  background,
  outputFormat,
  quality,
  targetWidth,
  targetHeight
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('crop', JSON.stringify(crop));
  formData.append('rotate', String(rotate));
  formData.append('flipHorizontal', String(flipHorizontal));
  formData.append('flipVertical', String(flipVertical));
  formData.append('circle', String(circle));
  formData.append('background', background);
  if (targetWidth) formData.append('targetWidth', String(targetWidth));
  if (targetHeight) formData.append('targetHeight', String(targetHeight));

  // If format is 'original', resolve to the file extension or type
  let resolvedFormat = outputFormat === 'original' ? file.name.split('.').pop().toLowerCase() : outputFormat.toLowerCase();
  if (resolvedFormat === 'jpg') resolvedFormat = 'jpeg';
  formData.append('outputFormat', resolvedFormat);
  formData.append('quality', String(quality));

  const res = await fetch('/api/image/crop', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Server-side cropping failed');
  }

  const blob = await res.blob();
  const outWidth = parseInt(res.headers.get('X-Image-Output-Width') || '0', 10);
  const outHeight = parseInt(res.headers.get('X-Image-Output-Height') || '0', 10);

  return {
    blob,
    width: outWidth > 0 ? outWidth : crop.width,
    height: outHeight > 0 ? outHeight : crop.height
  };
}
