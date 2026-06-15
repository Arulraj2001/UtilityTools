import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const quality = parseInt(formData.get('quality') || '75', 10);
    const format = formData.get('format') || 'keep'; // 'keep', 'jpeg', 'png', 'webp', 'avif'
    const removeMetadata = formData.get('removeMetadata') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(buffer);

    const maxWidthOrHeight = formData.get('maxWidthOrHeight') ? parseInt(formData.get('maxWidthOrHeight'), 10) : null;
    if (maxWidthOrHeight && !isNaN(maxWidthOrHeight)) {
      pipeline = pipeline.resize({
        width: maxWidthOrHeight,
        height: maxWidthOrHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Metadata removal
    if (!removeMetadata) {
      pipeline = pipeline.withMetadata();
    }

    // Determine target format
    let targetFormat = format.toLowerCase();
    if (targetFormat === 'keep') {
      const mime = file.type || '';
      if (mime.includes('png')) targetFormat = 'png';
      else if (mime.includes('webp')) targetFormat = 'webp';
      else if (mime.includes('avif')) targetFormat = 'avif';
      else targetFormat = 'jpeg'; // fallback
    }

    if (targetFormat === 'jpg') {
      targetFormat = 'jpeg';
    }

    // Format & Quality configuration
    if (targetFormat === 'png') {
      pipeline = pipeline.png({ 
        palette: true, 
        quality: Math.max(30, quality),
        compressionLevel: 9 
      });
    } else if (targetFormat === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (targetFormat === 'avif') {
      pipeline = pipeline.avif({ quality, effort: 3 });
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    const outputBuffer = await pipeline.toBuffer();
    
    // Get new dimensions
    const newMetadata = await sharp(outputBuffer).metadata();

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': `image/${targetFormat}`,
        'X-Image-Width': String(newMetadata.width || 0),
        'X-Image-Height': String(newMetadata.height || 0),
      },
    });
  } catch (error) {
    console.error('API Error during compression:', error);
    return NextResponse.json({ error: 'Compression failed on server: ' + error.message }, { status: 500 });
  }
}
