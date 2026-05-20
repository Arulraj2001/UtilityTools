/**
 * Setup PDF.js Worker
 * 
 * This script copies the PDF.js worker file from pdfjs-dist to the public directory
 * so it can be served correctly by Vite in development and production.
 * 
 * Run this: node scripts/setup-pdf-worker.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const sourceWorker = path.join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetWorker = path.join(projectRoot, 'public/pdf.worker.min.mjs');
const sourceWorkerJS = path.join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.js');
const targetWorkerJS = path.join(projectRoot, 'public/pdf.worker.min.js');

function copyWorker() {
  try {
    // Try to copy .mjs version first
    if (fs.existsSync(sourceWorker)) {
      fs.copyFileSync(sourceWorker, targetWorker);
      console.log('✓ Copied PDF worker (mjs):', targetWorker);
    } else {
      console.warn('⚠ Source worker not found:', sourceWorker);
    }
    
    // Also try .js version as fallback
    if (fs.existsSync(sourceWorkerJS)) {
      fs.copyFileSync(sourceWorkerJS, targetWorkerJS);
      console.log('✓ Copied PDF worker (js):', targetWorkerJS);
    }
  } catch (error) {
    console.error('✗ Error copying worker file:', error.message);
    process.exit(1);
  }
}

// Run the copy
copyWorker();
