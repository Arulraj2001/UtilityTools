/**
 * Web Worker for chunked OCR processing.
 * Processes image tiles in parallel for performance.
 */
self.onmessage = async function (e) {
  const { imageDataUrl, tileData, type } = e.data

  try {
    if (type === 'chunked-ocr') {
      const results = []
      const chunks = tileData || [imageDataUrl]
      const chunkSize = Math.max(1, Math.floor(chunks.length / 3))

      for (let i = 0; i < chunks.length; i += chunkSize) {
        const batch = chunks.slice(i, i + chunkSize)
        const batchResults = await Promise.all(
          batch.map(async (chunk) => {
            try {
              const { data } = await Tesseract.recognize(chunk, 'eng', {
                logger: () => {},
              })
              return { text: data.text, confidence: data.confidence }
            } catch {
              return { text: '', confidence: 0 }
            }
          })
        )
        results.push(...batchResults)
        self.postMessage({
          type: 'progress',
          progress: Math.round(((i + chunkSize) / chunks.length) * 100),
        })
      }

      const merged = results
        .filter(r => r.confidence > 20)
        .sort((a, b) => b.confidence - a.confidence)

      self.postMessage({
        type: 'result',
        text: merged.map(r => r.text).join('\n'),
        confidence: merged.length > 0
          ? merged.reduce((s, r) => s + r.confidence, 0) / merged.length
          : 0,
      })
    } else if (type === 'health-check') {
      self.postMessage({ type: 'ready', worker: 'ocr' })
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message })
  }
}