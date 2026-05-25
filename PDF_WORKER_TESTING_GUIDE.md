# PDF Worker Fix - Testing Guide

## Quick Verification (2-5 minutes)

### Step 1: Start Development Server
```bash
cd UtilityTools
npm run dev
```

### Step 2: Test PDF to Image Tool
1. Navigate to the **PDF to Image** tool (under PDF Tools)
2. Upload a multi-page PDF file
3. **Expected:** 
   - Pages render instantly
   - No console errors about "fake worker"
   - No "pdf.worker.min.js?import" errors
   - Progress shows page rendering

### Step 3: Check Browser Console
Open DevTools (F12) and check Console tab:
- ✅ Should see **no errors** related to:
  - `pdf.worker`
  - `dynamically imported module`
  - `failed to fetch`
  - `fake worker`

### Step 4: Test Other PDF Tools
Try these in sequence:
1. **PDF Compressor** - Upload a PDF, compress it
2. **PDF Merger** - Upload 2+ PDFs, merge them
3. **PDF Splitter** - Upload a PDF, extract pages
4. **Exam PDF Compressor** - Upload exam document

Each should work without worker errors.

---

## Detailed Testing (5-15 minutes)

### Test Case 1: PDF to Image Conversion
```
Input: Multi-page PDF (3+ pages)
Steps:
1. Click "PDF to Image" tool
2. Choose DPI (144 DPI recommended)
3. Select format (JPEG or PNG)
4. Upload the PDF
5. Click "Convert to Images"

Expected Results:
✅ All pages render
✅ No console errors
✅ Download works
✅ Image quality looks good
✅ Progress indicator shows pages
```

### Test Case 2: PDF Compression
```
Input: Large PDF (5MB+)
Steps:
1. Click "PDF Compressor"
2. Choose compression level
3. Upload the PDF
4. Select compression options
5. Click "Compress"

Expected Results:
✅ PDF compresses successfully
✅ Output file smaller than input
✅ Page count preserved
✅ No worker errors in console
✅ Quality slider works
```

### Test Case 3: Batch Operations
```
Input: Multiple PDFs
Steps:
1. Upload 3-5 PDF files to merger
2. Start operation
3. Let it process all files

Expected Results:
✅ All files process without errors
✅ No "worker" related messages
✅ Final output is valid PDF
✅ No memory/performance issues
```

### Test Case 4: Mobile Browser
```
Device: Mobile phone (iOS Safari or Android Chrome)
Steps:
1. Open app on mobile
2. Go to PDF to Image tool
3. Upload a PDF
4. Convert to images

Expected Results:
✅ Works without errors
✅ No "fake worker" messages
✅ Performance acceptable
✅ Download functions
```

---

## Troubleshooting

### Issue: Still seeing "fake worker" errors

**Check 1: Module Import**
```javascript
// In browser console:
console.log(typeof pdfjsLib)  // Should output "object"
```

**Check 2: Worker Setup**
```javascript
// In browser console:
import { getPdfJsLib } from '@/lib/pdfWorkerSetup'
const lib = getPdfJsLib()
console.log(lib.GlobalWorkerOptions.workerSrc)
// Should show a URL like: blob:... or file://... or http://...
```

**Check 3: App Initialization**
- Verify `src/App.jsx` imports `initializePdfWorker`
- Verify it's called at module level (before component render)
- Check that `src/lib/pdfWorkerSetup.js` exists

### Issue: Module not found errors

Clear cache and reinstall:
```bash
rm -rf node_modules
npm install
npm run dev
```

### Issue: Build succeeds but production fails

Verify `pdfjs-dist` is in `package.json` dependencies:
```bash
npm list pdfjs-dist
# Should show: pdfjs-dist@5.6.205
```

---

## Success Indicators

When the fix is working correctly, you should see:

| Indicator | ✅ Working | ❌ Not Working |
|-----------|-----------|---------------|
| PDF loads | Instant | Takes 5+ seconds |
| Console errors | None | "fake worker" message |
| Worker URL | Points to bundled file | CDN URL or error |
| Page rendering | Smooth, no flicker | Stutters or errors |
| Mobile | Works smoothly | Lags or fails |
| Offline mode | Works | Shows error |
| Production | No issues | Fails to load PDFs |

---

## Console Commands for Verification

Paste these in browser console (F12) to verify:

```javascript
// Check 1: Verify worker setup
import { getPdfJsLib } from '@/lib/pdfWorkerSetup'
const lib = getPdfJsLib()
console.log('Worker URL:', lib.GlobalWorkerOptions.workerSrc)

// Check 2: Test PDF loading
const testPdf = 'https://example.com/test.pdf'
lib.getDocument(testPdf).promise
  .then(pdf => console.log('✅ PDF loaded, pages:', pdf.numPages))
  .catch(err => console.error('❌ PDF failed:', err))

// Check 3: Check for errors
console.log('Errors in page:', console.getError ? 'check logs above' : 'none visible')
```

---

## Rollback Plan (if needed)

If tests fail and you need to rollback:

```bash
git checkout src/lib/pdfWorkerSetup.js
git checkout src/App.jsx
git checkout src/components/pdf-tools/
git checkout src/components/tools/PDFTool.jsx
git checkout src/components/gov-tools/PdfToImage.jsx
```

Then restart dev server.

---

## Documentation References

- [pdfjs-dist NPM](https://www.npmjs.com/package/pdfjs-dist)
- [Vite import.meta.url](https://vitejs.dev/guide/env-and-modes.html)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)

---

**Last Updated:** May 20, 2026
**Fix Status:** ✅ Ready for Testing
