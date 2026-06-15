import { saveAs } from 'file-saver';

/**
 * Downloads a Blob to the user's device with the given file name.
 * @param {Blob} blob 
 * @param {string} fileName 
 */
export function downloadBlob(blob, fileName) {
  saveAs(blob, fileName);
}
