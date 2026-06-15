import { NextResponse } from 'next/server';
import { cropImage } from '@/lib/image/crop-image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const cropJson = formData.get('crop') as string | null;
    const rotate = parseInt(formData.get('rotate') as string || '0', 10);
    const flipHorizontal = formData.get('flipHorizontal') === 'true';
    const flipVertical = formData.get('flipVertical') === 'true';
    const circle = formData.get('circle') === 'true';
    const background = formData.get('background') as string || 'transparent';
    const outputFormat = (formData.get('outputFormat') as string || 'webp') as 'jpeg' | 'png' | 'webp' | 'avif';
    const quality = parseInt(formData.get('quality') as string || '90', 10);
    const targetWidthStr = formData.get('targetWidth') as string | null;
    const targetHeightStr = formData.get('targetHeight') as string | null;

    const targetWidth = targetWidthStr ? parseInt(targetWidthStr, 10) : undefined;
    const targetHeight = targetHeightStr ? parseInt(targetHeightStr, 10) : undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!cropJson) {
      return NextResponse.json({ error: 'No crop coordinates provided' }, { status: 400 });
    }

    const crop = JSON.parse(cropJson);
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await cropImage({
      buffer,
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
    });

    return new Response(new Uint8Array(result.buffer), {
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
  } catch (error: any) {
    console.error('API Error during cropping:', error);
    return NextResponse.json({ error: 'Cropping failed on server: ' + error.message }, { status: 500 });
  }
}
