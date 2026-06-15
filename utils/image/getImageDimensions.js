/**
 * Loads an image and returns its natural width and height.
 * @param {File|Blob} file 
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image to get dimensions.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
