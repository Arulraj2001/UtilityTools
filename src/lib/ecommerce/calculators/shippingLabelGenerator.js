import { buildShippingLabel } from '../utils/labelUtils'

export function generateShippingLabel(inputs) {
  const senderInfo = inputs.sender_info || ''
  const receiverInfo = inputs.receiver_info || ''
  const parcelDetails = inputs.parcel_details || ''
  const trackingNumber = inputs.tracking_number || ''

  if (!senderInfo.trim() || !receiverInfo.trim() || !trackingNumber.trim()) {
    return { error: 'Sender, receiver, and tracking number are required.' }
  }

  const label = buildShippingLabel({ senderInfo, receiverInfo, parcelDetails, trackingNumber })

  return {
    type: 'json',
    label: 'Shipping Label',
    value: label,
    extra: {
      message: 'Ready for printable label generation with barcode-ready data.',
    },
  }
}
