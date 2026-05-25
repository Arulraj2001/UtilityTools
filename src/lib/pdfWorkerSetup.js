/**
 * PDF.js Worker Setup for Vite
 * 
 * This module handles proper worker configuration for pdfjs-dist
 * compatible with Vite, React, and production builds.
 * 
 * The PDF.js worker file is copied to the public directory at build time,
 * making it available as a static asset that can be reliably served in both
 * development and production environments.
 */

import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Initialize PDF.js worker globally
 * Call this once at app startup to configure worker for all PDF operations
 */
export function initializePdfWorker() {
  if (workerInitialized || typeof window === 'undefined' || !pdfjsLib) {
    return;
  }
  
  try {
    // Use the worker from the public directory
    // This path is served by Vite dev server and included in production builds
    const workerUrl = '/pdf.worker.min.mjs';
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerInitialized = true;
    
    console.log('[PDF.js] Worker initialized from:', workerUrl);
  } catch (error) {
    console.error('[PDF.js] Failed to initialize worker:', error);
    
    // Fallback to CDN if public worker is not available
    try {
      if (pdfjsLib && pdfjsLib.version) {
        const cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnUrl;
        console.log('[PDF.js] Using CDN fallback worker:', cdnUrl);
      }
    } catch (cdnError) {
      console.error('[PDF.js] Failed to set CDN fallback:', cdnError);
    }
  }
}

/**
 * Get PDF.js library with worker pre-configured
 * Use this if you need a fresh reference to the library
 */
export function getPdfJsLib() {
  initializePdfWorker();
  return pdfjsLib;
}

export default {
  initializePdfWorker,
  getPdfJsLib,
};
