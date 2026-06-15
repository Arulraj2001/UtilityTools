export function clonePdfData(data) {
  if (data instanceof Uint8Array) return data.slice();
  if (data instanceof ArrayBuffer) return new Uint8Array(data.slice(0));
  return data;
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Browser could not export the image. Try a smaller file or lower resolution.'));
    }, type, quality);
  });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Could not read processed file.'));
    reader.readAsDataURL(blob);
  });
}

export async function yieldToMainThread() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function revokeObjectUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
