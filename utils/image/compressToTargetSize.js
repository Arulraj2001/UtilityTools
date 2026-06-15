import { compressImage } from './compressImage';

/**
 * Compresses an image to fit under a specified target file size (in KB) using iterative compression.
 * @param {File} file 
 * @param {number} targetSizeKb 
 * @param {object} options 
 * @param {string} options.format
 * @param {boolean} options.removeMetadata
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   width: number,
 *   height: number,
 *   originalSize: number,
 *   compressedSize: number,
 *   savedPercentage: number,
 *   qualityUsed: number,
 *   reachedTarget: boolean,
 *   warning?: string
 * }>}
 */
export async function compressToTargetSize(file, targetSizeKb, { format = 'keep', removeMetadata = true } = {}) {
  const targetSizeBytes = targetSizeKb * 1024;
  const originalSize = file.size;

  let originalDims = { width: 1920, height: 1080 };
  try {
    originalDims = await getImageDimensions(file);
  } catch (e) {
    console.warn('Could not read original dimensions', e);
  }

  let minQuality = 30;
  let maxQuality = 90;
  let bestResult = null;
  let iterations = 0;
  const maxIterations = 10;

  let currentQuality = originalSize <= targetSizeBytes ? 85 : 75;
  
  // Set initial max dimension limit (cap at 2400px to avoid large memory footprints for huge cameras)
  let currentMaxDim = Math.max(originalDims.width, originalDims.height);
  if (currentMaxDim > 2400) currentMaxDim = 2400;

  while (iterations < maxIterations) {
    iterations++;
    
    try {
      const result = await compressImage(file, { 
        quality: currentQuality, 
        format, 
        removeMetadata,
        maxWidthOrHeight: currentMaxDim
      });
      const compressedSize = result.blob.size;

      // Keep track of the best result (closest to target size without exceeding it, or the smallest overall if none are under target)
      if (!bestResult) {
        bestResult = {
          blob: result.blob,
          width: result.width,
          height: result.height,
          compressedSize,
          qualityUsed: currentQuality
        };
      } else {
        const currentIsUnder = compressedSize <= targetSizeBytes;
        const bestIsUnder = bestResult.compressedSize <= targetSizeBytes;

        if (currentIsUnder && !bestIsUnder) {
          bestResult = {
            blob: result.blob,
            width: result.width,
            height: result.height,
            compressedSize,
            qualityUsed: currentQuality
          };
        } else if (currentIsUnder && bestIsUnder) {
          if (compressedSize > bestResult.compressedSize) {
            bestResult = {
              blob: result.blob,
              width: result.width,
              height: result.height,
              compressedSize,
              qualityUsed: currentQuality
            };
          }
        } else if (!currentIsUnder && !bestIsUnder) {
          if (compressedSize < bestResult.compressedSize) {
            bestResult = {
              blob: result.blob,
              width: result.width,
              height: result.height,
              compressedSize,
              qualityUsed: currentQuality
            };
          }
        }
      }

      if (compressedSize <= targetSizeBytes) {
        if (maxQuality - currentQuality <= 5 || iterations >= 6) {
          break;
        }
        minQuality = currentQuality;
        currentQuality = Math.round((currentQuality + maxQuality) / 2);
      } else {
        if (currentQuality <= minQuality + 2) {
          // Quality is at minimum. Try downscaling the image dimensions
          if (currentMaxDim > 300) {
            currentMaxDim = Math.round(currentMaxDim * 0.85); // reduce dimensions by 15%
            minQuality = 30;
            maxQuality = 80;
            currentQuality = 60; // reset quality target for the smaller canvas
          } else {
            break; // reached minimum resolution boundary
          }
        } else {
          maxQuality = currentQuality;
          currentQuality = Math.round((currentQuality + minQuality) / 2);
        }
      }
    } catch (error) {
      console.error(`Iteration ${iterations} failed:`, error);
      if (bestResult) break;
      throw error;
    }
  }

  const reachedTarget = bestResult.compressedSize <= targetSizeBytes;
  const savedPercentage = parseFloat((((originalSize - bestResult.compressedSize) / originalSize) * 100).toFixed(1));

  // Determine output extension
  let ext = 'jpg';
  if (format === 'keep') {
    ext = file.name.split('.').pop() || 'jpg';
  } else {
    ext = format === 'jpeg' ? 'jpg' : format;
  }
  
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outName = `${baseName}-compressed-${targetSizeKb}kb.${ext}`;
  const outFile = new File([bestResult.blob], outName, { type: bestResult.blob.type });

  let warning;
  if (!reachedTarget) {
    warning = `We compressed the image as much as possible, but it could not reach ${targetSizeKb} KB without heavy quality loss.`;
  }

  return {
    file: outFile,
    blob: bestResult.blob,
    width: bestResult.width,
    height: bestResult.height,
    originalSize,
    compressedSize: bestResult.compressedSize,
    savedPercentage,
    qualityUsed: bestResult.qualityUsed,
    reachedTarget,
    warning
  };
}
