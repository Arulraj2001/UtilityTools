import { NextResponse } from 'next/server';
import { convertImage } from '@/lib/image/convert-image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const outputFormat = formData.get('outputFormat') || 'webp'; // 'jpeg', 'png', 'webp', 'avif', 'tiff'
    const quality = parseInt(formData.get('quality') || '85', 10);
    const background = formData.get('background') || '#ffffff';
    const preserveTransparency = formData.get('preserveTransparency') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let targetFormat = outputFormat.toLowerCase();
    if (targetFormat === 'jpg') targetFormat = 'jpeg';

    const result = await convertImage({
      buffer,
      outputFormat: targetFormat,
      quality,
      background,
      preserveTransparency
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
    console.error('API Error during conversion:', error);
    return NextResponse.json({ error: 'Conversion failed on server: ' + error.message }, { status: 500 });
  }
}
