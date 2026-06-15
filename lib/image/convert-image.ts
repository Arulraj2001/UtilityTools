import sharp from 'sharp';

export type ConvertImageInput = {
  buffer: Buffer;
  outputFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  quality?: number;
  background?: string;
  preserveTransparency?: boolean;
};

export type ConvertImageOutput = {
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

/**
 * Converts an image buffer to another format using sharp.
 */
export async function convertImage({
  buffer,
  outputFormat,
  quality = 85,
  background = '#ffffff',
  preserveTransparency = true
}: ConvertImageInput): Promise<ConvertImageOutput> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;
  const originalSize = buffer.length;
  const originalFormat = metadata.format || 'unknown';

  let pipeline = sharp(buffer);
  let targetFormat = outputFormat.toLowerCase();
  if (targetFormat === 'jpg') targetFormat = 'jpeg';

  // Determine if output format supports transparency
  const formatSupportsTransparency = ['png', 'webp', 'avif'].includes(targetFormat);

  // Handle transparency if output format doesn't support it or if user explicitly requested flattening
  if (!formatSupportsTransparency || !preserveTransparency) {
    let bgOption = background;
    if (bgOption === 'transparent' || bgOption === 'rgba(0,0,0,0)') {
      bgOption = '#ffffff'; // Fallback to white if transparent is requested for flattening
    }
    pipeline = pipeline.flatten({ background: bgOption });
  }

  // Set output format & quality/compression settings
  if (targetFormat === 'png') {
    // PNG is lossless but we can optimize compression
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality });
  } else if (targetFormat === 'avif') {
    pipeline = pipeline.avif({ quality, effort: 3 });
  } else if (targetFormat === 'tiff') {
    pipeline = pipeline.tiff({ quality });
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  const outputBuffer = await pipeline.toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    original: {
      size: originalSize,
      width: origWidth,
      height: origHeight,
      format: originalFormat.toUpperCase()
    },
    output: {
      size: outputBuffer.length,
      width: outputMetadata.width || origWidth,
      height: outputMetadata.height || origHeight,
      format: targetFormat.toUpperCase()
    }
  };
}
