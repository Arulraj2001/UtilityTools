/**
 * PDF.js Worker Setup for Vite
 * 
 * This module handles proper worker configuration for pdfjs-dist
 * compatible with Vite, React, and production builds.
 * 
 * Uses Vite's native ?url import syntax to resolve worker files correctly.
 * The ?url query tells Vite to import the file as a resolved URL string,
 * which ensures the worker loads from the correct bundled location.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Initialize PDF.js worker globally
 * Call this once at app startup to configure worker for all PDF operations
 */
export function initializePdfWorker() {
  if (typeof window !== 'undefined' && pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
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
