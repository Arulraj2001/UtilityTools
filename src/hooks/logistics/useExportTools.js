/**
 * useExportTools - Premium export utilities for PDF, CSV, JSON
 * Leverages existing html2canvas and file-saver dependencies
 */
import { useCallback } from 'react'
import { saveAs } from 'file-saver'

export function useExportTools(toolName) {
  const exportJSON = useCallback((data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    saveAs(blob, `${filename || toolName}-${Date.now()}.json`)
  }, [toolName])

  const exportCSV = useCallback((data, filename) => {
    if (!data || typeof data !== 'object') return
    const headers = Object.keys(data)
    const values = Object.values(data)
    const csvContent = [
      headers.join(','),
      values.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${filename || toolName}-${Date.now()}.csv`)
  }, [toolName])

  const exportArrayCSV = useCallback((arr, filename) => {
    if (!arr || arr.length === 0) return
    const headers = Object.keys(arr[0])
    const rows = arr.map(item => headers.map(h => {
      const val = item[h]
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    }))
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${filename || toolName}-${Date.now()}.csv`)
  }, [toolName])

  const exportPDF = useCallback(async (elementId, filename) => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const element = document.getElementById(elementId)
      if (!element) return
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      pdf.save(`${filename || toolName}-${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  }, [toolName])

  const copyResult = useCallback((text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2))
    }
  }, [])

  const shareResult = useCallback(async (text) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: typeof text === 'string' ? text : JSON.stringify(text, null, 2) })
      } catch {}
    } else {
      copyResult(text)
    }
  }, [copyResult])

  return { exportJSON, exportCSV, exportArrayCSV, exportPDF, copyResult, shareResult }
}

/**
 * usePrintMode - Print-specific styling
 */
export function usePrintMode() {
  const print = useCallback((elementId) => {
    const el = document.getElementById(elementId)
    if (!el) return
    const original = document.title
    document.title = 'Logistics Report'
    window.print()
    document.title = original
  }, [])
  return print
}