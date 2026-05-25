const chooseBest = (options) => options.sort((a, b) => a.score - b.score)[0]

export function buildLogisticsRecommendations(result = {}, inputs = {}, slug = '') {
  const shippingType = String(inputs.shipping_type || inputs.shippingMode || inputs.shippingMode || '').toLowerCase()
  const actualWeight = Number(inputs.actual_weight || inputs.weight || 0)
  const volumetricWeight = Number(inputs.volumetricWeight || inputs.volumetric_weight || 0)
  const cost = Number(result.totalCharge || result.finalCharge || result.totalCost || 0)
  const deliveryDays = Number(result.deliveryDays || result.estimatedDays || 0)
  const utilization = Number(result.utilizationPercent || 0)

  const warnings = []
  if (volumetricWeight > actualWeight && actualWeight > 0) {
    warnings.push('This shipment is subject to volumetric billing. Review packaging size to reduce cost.')
  }
  if (cost > 0 && cost > 10000) {
    warnings.push('Shipping cost is high; compare carrier options or optimize package dimensions.')
  }
  if (deliveryDays > 7) {
    warnings.push('Transit time exceeds one week. Consider faster modes for time-sensitive cargo.')
  }
  if (utilization > 0 && utilization < 60) {
    warnings.push('Container utilization is low. Consider consolidating shipments or using a smaller container.')
  }

  const fastest = (
    shippingType === 'air' ? 'Air freight' :
    shippingType === 'express' ? 'Express courier' :
    'Standard freight'
  )

  const cheapest = shippingType === 'air'
    ? 'Express or standard freight may lower cost compared to air.'
    : 'Standard shipping generally delivers the lowest price for the same route.'

  const packaging = actualWeight > 0 && volumetricWeight > 0
    ? volumetricWeight > actualWeight
      ? 'Switch to more compact packaging to reduce volumetric weight.'
      : 'Your package is weight-efficient; verify actual dimensions for accuracy.'
    : 'Review package dimensions to identify optimization opportunities.'

  return {
    cheapestOption: cheapest,
    fastestOption: fastest,
    optimizedPackaging: packaging,
    warnings,
  }
}
