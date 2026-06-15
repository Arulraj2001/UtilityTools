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

let pdfjsLib = null
let workerInitialized = false
let pdfWorkerSetupPromise = null

async function loadPdfJsLib() {
  if (pdfjsLib) return pdfjsLib
  const module = await import('pdfjs-dist')
  pdfjsLib = module
  return pdfjsLib
}

/**
 * Initialize PDF.js worker globally
 * Call this once at app startup to configure worker for all PDF operations
 */
export async function initializePdfWorker() {
  if (workerInitialized || typeof window === 'undefined') {
    return
  }

  try {
    const pdfjs = await loadPdfJsLib()
    const workerUrl = '/pdf.worker.min.mjs'
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    workerInitialized = true
    console.log('[PDF.js] Worker initialized from:', workerUrl)
  } catch (error) {
    console.error('[PDF.js] Failed to initialize worker:', error)
    try {
      const pdfjs = await loadPdfJsLib()
      if (pdfjs && pdfjs.version) {
        const cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
        pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl
        console.log('[PDF.js] Using CDN fallback worker:', cdnUrl)
      }
    } catch (cdnError) {
      console.error('[PDF.js] Failed to set CDN fallback:', cdnError)
    }
  }
}

/**
 * Get PDF.js library with worker pre-configured
 * Use this if you need a fresh reference to the library
 */
export async function getPdfJsLib() {
  await initializePdfWorker()
  return pdfjsLib
}

export default {
  initializePdfWorker,
  getPdfJsLib,
};
