import sharp from 'sharp';

/**
 * Resizes an image buffer using sharp.
 * @param {object} input 
 * @param {Buffer} input.buffer
 * @param {number} [input.width]
 * @param {number} [input.height]
 * @param {string} input.mode - 'width' | 'height' | 'exact' | 'percentage'
 * @param {number} [input.percentage]
 * @param {string} input.fit - 'contain' | 'cover' | 'stretch'
 * @param {string} [input.background] - background padding color (e.g. '#ffffff')
 * @param {string} input.outputFormat - 'jpeg' | 'png' | 'webp' | 'avif'
 * @param {number} [input.quality] - 10-100
 * @returns {Promise<{
 *   buffer: Buffer,
 *   original: { size: number, width: number, height: number, format: string },
 *   output: { size: number, width: number, height: number, format: string }
 * }>}
 */
export async function resizeImage({
  buffer,
  width,
  height,
  mode,
  percentage,
  fit = 'contain',
  background = '#ffffff',
  outputFormat = 'jpeg',
  quality = 85
}) {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;
  const aspect = origWidth / origHeight;
  const originalFormat = metadata.format || 'unknown';

  let targetWidth = width;
  let borderHeight = height;

  if (mode === 'width') {
    targetWidth = width;
    borderHeight = Math.round(width / aspect);
  } else if (mode === 'height') {
    borderHeight = height;
    targetWidth = Math.round(height * aspect);
  } else if (mode === 'percentage') {
    const scale = (percentage || 100) / 100;
    targetWidth = Math.round(origWidth * scale);
    borderHeight = Math.round(origHeight * scale);
  } else if (mode === 'exact') {
    targetWidth = width;
    borderHeight = height;
  }

  // Ensure dimensions are within limits
  targetWidth = Math.min(8000, Math.max(1, targetWidth || 100));
  borderHeight = Math.min(8000, Math.max(1, borderHeight || 100));

  let pipeline = sharp(buffer);

  // Apply resize based on fit mode
  if (mode === 'exact') {
    if (fit === 'stretch') {
      pipeline = pipeline.resize({
        width: targetWidth,
        height: borderHeight,
        fit: 'fill'
      });
    } else if (fit === 'cover') {
      pipeline = pipeline.resize({
        width: targetWidth,
        height: borderHeight,
        fit: 'cover'
      });
    } else {
      // 'contain' with background padding
      // Parse background color for transparent check
      let bgOption = background;
      if (background === 'transparent' || background === 'rgba(0,0,0,0)') {
        bgOption = { r: 0, g: 0, b: 0, alpha: 0 };
      }
      pipeline = pipeline.resize({
        width: targetWidth,
        height: borderHeight,
        fit: 'contain',
        background: bgOption
      });
    }
  } else {
    // Normal width/height/percentage keeps aspect ratio naturally
    pipeline = pipeline.resize({
      width: targetWidth,
      height: borderHeight,
      fit: 'inside'
    });
  }

  // Set output format & quality
  let targetFormat = outputFormat.toLowerCase();
  if (targetFormat === 'jpg') targetFormat = 'jpeg';

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
      size: buffer.length,
      width: origWidth,
      height: origHeight,
      format: originalFormat.toUpperCase()
    },
    output: {
      size: outputBuffer.length,
      width: outputMetadata.width || targetWidth,
      height: outputMetadata.height || borderHeight,
      format: targetFormat.toUpperCase()
    }
  };
}
