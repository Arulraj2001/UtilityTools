import { NextResponse } from 'next/server';
import { resizeImage } from '@/lib/image/resize-image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mode = formData.get('mode') || 'exact'; // 'width', 'height', 'exact', 'percentage'
    const width = formData.get('width') ? parseInt(formData.get('width'), 10) : undefined;
    const height = formData.get('height') ? parseInt(formData.get('height'), 10) : undefined;
    const percentage = formData.get('percentage') ? parseInt(formData.get('percentage'), 10) : undefined;
    const fit = formData.get('fit') || 'contain'; // 'contain', 'cover', 'stretch'
    const background = formData.get('background') || '#ffffff';
    const outputFormat = formData.get('outputFormat') || 'keep'; // 'keep', 'jpeg', 'png', 'webp', 'avif'
    const quality = parseInt(formData.get('quality') || '85', 10);

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resolve "keep" output format
    let targetFormat = outputFormat.toLowerCase();
    if (targetFormat === 'keep') {
      const mime = file.type || '';
      if (mime.includes('png')) targetFormat = 'png';
      else if (mime.includes('webp')) targetFormat = 'webp';
      else if (mime.includes('avif')) targetFormat = 'avif';
      else targetFormat = 'jpeg';
    }

    const result = await resizeImage({
      buffer,
      width,
      height,
      mode,
      percentage,
      fit,
      background,
      outputFormat: targetFormat,
      quality
    });

    return new Response(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': `image/${result.output.format.toLowerCase() === 'jpeg' ? 'jpeg' : result.output.format.toLowerCase()}`,
        'X-Image-Original-Width': String(result.original.width),
        'X-Image-Original-Height': String(result.original.height),
        'X-Image-Original-Size': String(result.original.size),
        'X-Image-Original-Format': result.original.format,
        'X-Image-Output-Width': String(result.output.width),
        'X-Image-Output-Height': String(result.output.height),
        'X-Image-Output-Size': String(result.output.size),
        'X-Image-Output-Format': result.output.format,
      },
    });
  } catch (error) {
    console.error('API Error during resize:', error);
    return NextResponse.json({ error: 'Resize failed on server: ' + error.message }, { status: 500 });
  }
}
