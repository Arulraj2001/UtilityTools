export function buildShippingLabel({ senderInfo, receiverInfo, parcelDetails, trackingNumber }) {
  const safeTracking = String(trackingNumber || '').trim() || `TRACK-${Date.now()}`
  const labelId = `LBL-${Date.now()}`
  const generatedBarcode = `${safeTracking}|${labelId}|${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  return {
    labelId,
    createdAt: new Date().toISOString(),
    trackingNumber: safeTracking,
    senderInfo: String(senderInfo || '').trim(),
    receiverInfo: String(receiverInfo || '').trim(),
    parcelDetails: String(parcelDetails || '').trim(),
    barcode: {
      format: 'CODE128',
      value: generatedBarcode,
      title: `Scan to track ${safeTracking}`,
    },
    printableLabel: `SHIP FROM:\n${String(senderInfo || '').trim()}\n\nSHIP TO:\n${String(receiverInfo || '').trim()}\n\nPARCEL DETAILS:\n${String(parcelDetails || '').trim()}\n\nTRACKING #: ${safeTracking}\nLABEL ID: ${labelId}`,
  }
}
