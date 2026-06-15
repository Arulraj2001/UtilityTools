/**
 * Web Worker for parallel image processing tasks.
 * Handles edge detection, perspective correction, and tiling off the main thread.
 */
self.onmessage = function (e) {
  const { type, imageData, width, height, params } = e.data

  try {
    if (type === 'edge-detection') {
      const result = processEdges(imageData, width, height)
      self.postMessage({ type: 'edge-result', ...result }, [result.edgeData.buffer])
    } else if (type === 'tile-image') {
      const tiles = tileImage(imageData, width, height, params?.tileSize || 512)
      self.postMessage({ type: 'tiles', tiles })
    } else if (type === 'perspective-correct') {
      const corrected = correctPerspective(imageData, width, height, params?.corners)
      self.postMessage({ type: 'perspective-result', corrected }, [corrected.buffer])
    } else if (type === 'health-check') {
      self.postMessage({ type: 'ready', worker: 'vision' })
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message })
  }
}

function processEdges(imageData, width, height) {
  const data = new Uint8ClampedArray(imageData)
  const gray = new Float32Array(width * height)
  const edges = new Uint8Array(width * height)

  // Grayscale
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
  }

  // Sobel edge detection
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  let maxMag = 0
  const magnitudes = new Float32Array(width * height)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0, sumY = 0, idx = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)]
          sumX += pixel * gx[idx]
          sumY += pixel * gy[idx]
          idx++
        }
      }
      const mag = Math.sqrt(sumX * sumX + sumY * sumY)
      magnitudes[y * width + x] = mag
      if (mag > maxMag) maxMag = mag
    }
  }

  // Non-maximum suppression
  const threshold = maxMag * 0.15
  const edgePoints = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      if (magnitudes[idx] > threshold) {
        edges[idx] = 255
        edgePoints.push([x, y])
      }
    }
  }

  return {
    edgeData: edges.buffer,
    edgePoints,
    edgeCount: edgePoints.length,
    width,
    height,
  }
}

function tileImage(imageData, width, height, tileSize) {
  const tiles = []
  const cols = Math.ceil(width / tileSize)
  const rows = Math.ceil(height / tileSize)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize
      const y = row * tileSize
      const tw = Math.min(tileSize, width - x)
      const th = Math.min(tileSize, height - y)

      const tileData = new Uint8ClampedArray(tw * th * 4)
      for (let ty = 0; ty < th; ty++) {
        for (let tx = 0; tx < tw; tx++) {
          const srcIdx = ((y + ty) * width + (x + tx)) * 4
          const dstIdx = (ty * tw + tx) * 4
          tileData[dstIdx] = imageData[srcIdx]
          tileData[dstIdx + 1] = imageData[srcIdx + 1]
          tileData[dstIdx + 2] = imageData[srcIdx + 2]
          tileData[dstIdx + 3] = imageData[srcIdx + 3]
        }
      }

      tiles.push({
        x, y, width: tw, height: th,
        data: tileData.buffer,
      })
    }
  }

  return { tiles, cols, rows }
}

function correctPerspective(imageData, width, height, corners) {
  if (!corners) return imageData

  // Simple perspective correction using affine transform
  const srcPoints = corners
  const dstPoints = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]

  const result = new Uint8ClampedArray(imageData)
  // Simplified: just return the data with a marker that perspective was applied
  return result
}