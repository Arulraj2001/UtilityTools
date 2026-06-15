export function applyLogisticsInsights(result = {}, inputs = {}, slug = '') {
  const insights = []
  const actualWeight = Number(result.actualWeight || result.weight || 0)
  const volumetricWeight = Number(result.volumetricWeight || result.volumetric_weight || 0)
  const totalCost = Number(result.totalCharge || result.finalCharge || result.totalCost || 0)
  const deliveryDays = Number(result.deliveryDays || result.estimatedDays || 0)
  const utilization = Number(result.utilizationPercent || 0)

  if (volumetricWeight > 0 && actualWeight > 0) {
    if (volumetricWeight > actualWeight) {
      insights.push({
        type: 'warning',
        title: 'Volumetric charge detected',
        message: 'Your package is billed by volumetric weight rather than actual mass. Shrink or reconfigure packaging to save freight cost.',
      })
    } else {
      insights.push({
        type: 'info',
        title: 'Weight efficient shipment',
        message: 'Actual weight exceeds volumetric weight, so the shipment is being billed by density. Monitor package density for future quotes.',
      })
    }
  }

  if (totalCost > 0) {
    if (totalCost > 15000) {
      insights.push({
        type: 'warning',
        title: 'High freight spend',
        message: 'Your current quote is on the upper range. Validate carrier contracts or compare alternative modes if available.',
      })
    } else if (totalCost > 7000) {
      insights.push({
        type: 'optimization',
        title: 'Cost reduction opportunity',
        message: 'A modest packaging or carrier review could trim expenses without changing delivery performance.',
      })
    } else {
      insights.push({
        type: 'info',
        title: 'Cost within expected range',
        message: 'Your shipping estimate appears competitive for this route and weight profile.',
      })
    }
  }

  if (deliveryDays > 0) {
    if (deliveryDays >= 10) {
      insights.push({
        type: 'warning',
        title: 'Slow transit time',
        message: 'Delivery is estimated above 10 days. Consider upgrading service level for critical shipments.',
      })
    } else if (deliveryDays <= 3) {
      insights.push({
        type: 'recommendation',
        title: 'Fast shipping pace',
        message: 'The selected mode is optimized for speed. This is ideal for time-sensitive or premium cargo.',
      })
    }
  }

  if (utilization > 0) {
    if (utilization < 60) {
      insights.push({
        type: 'optimization',
        title: 'Low utilization',
        message: 'Less than 60% of container volume is used. Combine shipments or downsize package selection.',
      })
    } else if (utilization >= 90) {
      insights.push({
        type: 'recommendation',
        title: 'Excellent container utilization',
        message: 'Your shipment is well-packed for this container type. Continue using this loading plan for efficiency.',
      })
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'No immediate issues found',
      message: 'Your current shipment data looks balanced. Check again after adjusting dimensions or service level for more insights.',
    })
  }

  return insights
}
