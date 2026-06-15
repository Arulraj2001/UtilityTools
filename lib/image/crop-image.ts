import sharp from 'sharp';

export type CropImageInput = {
  buffer: Buffer;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotate?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  circle?: boolean;
  background?: string;
  outputFormat: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  targetWidth?: number;
  targetHeight?: number;
};

export type CropImageOutput = {
  buffer: Buffer;
  original: {
    size: number;
    width: number;
    height: number;
    format: string;
  };
  output: {
    size: number;
    width: number;
    height: number;
    format: string;
  };
};

function parseBackground(colorStr?: string) {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0,0,0,0)') {
    return { r: 255, g: 255, b: 255, alpha: 0 };
  }
  // Hex color parsing
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, alpha: 1 };
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b, alpha: 1 };
    }
  }
  return { r: 255, g: 255, b: 255, alpha: 1 };
}

/**
 * Crops, rotates, flips, and masks an image buffer using sharp.
 */
export async function cropImage({
  buffer,
  crop,
  rotate = 0,
  flipHorizontal = false,
  flipVertical = false,
  circle = false,
  background = 'transparent',
  outputFormat,
  quality = 90,
  targetWidth,
  targetHeight
}: CropImageInput): Promise<CropImageOutput> {
  const originalMetadata = await sharp(buffer).metadata();
  const originalSize = buffer.length;
  const originalFormat = originalMetadata.format || 'unknown';

  let pipeline = sharp(buffer);
  const bgParsed = parseBackground(background);

  // 1. Rotate (custom angles supported)
  if (rotate !== 0) {
    pipeline = pipeline.rotate(rotate, { background: bgParsed });
  }

  // 2. Flip
  if (flipHorizontal) {
    pipeline = pipeline.flop();
  }
  if (flipVertical) {
    pipeline = pipeline.flip();
  }

  // Get intermediate buffer to read rotated/flipped dimensions safely
  const transformedBuffer = await pipeline.toBuffer();
  const transformedMetadata = await sharp(transformedBuffer).metadata();
  const currentWidth = transformedMetadata.width || 0;
  const currentHeight = transformedMetadata.height || 0;

  // 3. Crop coordinates clamping
  let left = Math.round(crop.x);
  let top = Math.round(crop.y);
  let width = Math.round(crop.width);
  let height = Math.round(crop.height);

  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + width > currentWidth) {
    width = currentWidth - left;
  }
  if (top + height > currentHeight) {
    height = currentHeight - top;
  }
  if (width <= 0) width = 1;
  if (height <= 0) height = 1;

  pipeline = sharp(transformedBuffer).extract({ left, top, width, height });

  // 4. Circle crop composite mask
  if (circle) {
    const r = Math.min(width, height) / 2;
    const cx = width / 2;
    const cy = height / 2;
    const svgMask = `
      <svg width="${width}" height="${height}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="white" />
      </svg>
    `;
    const croppedBuffer = await pipeline.toBuffer();
    pipeline = sharp(croppedBuffer).composite([
      { input: Buffer.from(svgMask), blend: 'dest-in' }
    ]);
  }

  // 5. Optional Target Resizing
  if (targetWidth && targetHeight && targetWidth > 0 && targetHeight > 0) {
    pipeline = pipeline.resize(targetWidth, targetHeight, { fit: 'fill' });
  }

  // 6. Output format and Flattening for transparent-to-lossy targets
  let targetFormat = outputFormat.toLowerCase();
  if (targetFormat === 'jpg') targetFormat = 'jpeg';

  const supportsTransparency = ['png', 'webp', 'avif'].includes(targetFormat);
  if (!supportsTransparency || background !== 'transparent') {
    let bgOption = background;
    if (bgOption === 'transparent' || bgOption === 'rgba(0,0,0,0)') {
      bgOption = '#ffffff'; // Fallback to white for JPEGs
    }
    pipeline = pipeline.flatten({ background: bgOption });
  }

  if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (targetFormat === 'avif') {
    pipeline = pipeline.avif({ quality, effort: 3 });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  const outputBuffer = await pipeline.toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    original: {
      size: originalSize,
      width: originalMetadata.width || 0,
      height: originalMetadata.height || 0,
      format: originalFormat.toUpperCase()
    },
    output: {
      size: outputBuffer.length,
      width: outputMetadata.width || width,
      height: outputMetadata.height || height,
      format: targetFormat.toUpperCase()
    }
  };
}
