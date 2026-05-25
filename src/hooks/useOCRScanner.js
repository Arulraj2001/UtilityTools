/**
 * Hook for OCR scanning of shipping labels on parcel images.
 * Runs Tesseract.js in a web worker for non-blocking text extraction.
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export default function useOCRScanner() {
  const [text, setText] = useState('')
  const [words, setWords] = useState([])
  const [confidence, setConfidence] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)

  const abortRef = useRef(false)
  const workerRef = useRef(null)

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current = true
      terminateWorker()
    }
  }, [])

  /**
   * Create and initialize a Tesseract worker
   */
  const initWorker = useCallback(async () => {
    try {
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      workerRef.current = worker
      return worker
    } catch (err) {
      console.error('OCR worker init failed:', err)
      return null
    }
  }, [])

  /**
   * Terminate the worker
   */
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        workerRef.current.terminate()
      } catch {
        // ignore
      }
      workerRef.current = null
    }
  }, [])

  /**
   * Scan an image for text
   */
  const scanImage = useCallback(async (imageDataUrl) => {
    if (!imageDataUrl) return null

    abortRef.current = false
    setError(null)
    setIsScanning(true)
    setProgress(0)

    try {
      const worker = await initWorker()
      if (!worker || abortRef.current) {
        setIsScanning(false)
        return null
      }

      const result = await worker.recognize(imageDataUrl)
      if (abortRef.current) {
        setIsScanning(false)
        return null
      }

      const extractedText = result.data.text || ''
      const extractedWords = result.data.words || []
      const extractedConfidence = result.data.confidence || 0

      setText(extractedText)
      setWords(extractedWords)
      setConfidence(extractedConfidence)
      setProgress(100)

      return {
        text: extractedText,
        words: extractedWords,
        confidence: extractedConfidence,
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err.message || 'OCR scanning failed')
      }
      return null
    } finally {
      setIsScanning(false)
    }
  }, [initWorker])

  /**
   * Reset OCR state
   */
  const reset = useCallback(() => {
    abortRef.current = true
    setText('')
    setWords([])
    setConfidence(0)
    setIsScanning(false)
    setError(null)
    setProgress(0)
    terminateWorker()
  }, [terminateWorker])

  return {
    text,
    words,
    confidence,
    isScanning,
    error,
    progress,
    scanImage,
    reset,
  }
}