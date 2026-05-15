import React from 'react';
import ImageCompressor from './ImageCompressor';
import ImageResizer from './ImageResizer';
import ImageConverter from './ImageConverter';
import ImageCropper from './ImageCropper';
import ImageToPdf from './ImageToPdf';
import ImageWatermark from './ImageWatermark';
import ImageColorPicker from './ImageColorPicker';
import ImageMetadata from './ImageMetadata';
import BackgroundRemover from './BackgroundRemover';
import ImageRotator from './ImageRotator';

const TOOL_MAP = {
  'image-compressor': ImageCompressor,
  'image-resizer': ImageResizer,
  'image-converter': ImageConverter,
  'image-cropper': ImageCropper,
  'image-to-pdf': ImageToPdf,
  'image-watermark': ImageWatermark,
  'image-color-picker': ImageColorPicker,
  'image-metadata-viewer': ImageMetadata,
  'background-remover': BackgroundRemover,
  'image-rotator': ImageRotator,
  // Legacy slugs
  'jpg-to-png': ImageConverter,
  'png-to-jpg': ImageConverter,
};

export default function ImageToolRouter({ tool }) {
  const Component = TOOL_MAP[tool?.slug];
  if (!Component) return null;
  return <Component tool={tool} />;
}

export const IMAGE_TOOL_SLUGS = Object.keys(TOOL_MAP);