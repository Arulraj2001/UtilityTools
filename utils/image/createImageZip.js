import JSZip from 'jszip';

/**
 * Packs multiple files/blobs into a single ZIP file.
 * @param {Array<{blob: Blob, name: string}>} files 
 * @returns {Promise<Blob>}
 */
export async function createImageZip(files) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  return await zip.generateAsync({ type: 'blob' });
}
