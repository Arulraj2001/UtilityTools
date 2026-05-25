const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function toGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function buildOptimizationLabel(score) {
  if (score >= 90) return 'High optimization'
  if (score >= 75) return 'Above average optimization'
  if (score >= 60) return 'Moderate optimization'
  return 'Needs improvement'
}

function extractNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function buildLogisticsMetrics(result = {}, inputs = {}, slug = '') {
  const chargeableWeight = extractNumber(result.chargeableWeight || result.rawChargeableWeight || 0)
  const totalCost = extractNumber(result.totalCharge || result.finalCharge || result.totalCost || 0)
  const deliveryDays = extractNumber(result.deliveryDays || result.estimatedDays || 0)
  const hasUtilization = result.utilizationPercent != null
  const utilization = hasUtilization ? extractNumber(result.utilizationPercent) : 0
  const actualWeight = extractNumber(result.actualWeight || result.weight || 0)
  const volumetricWeight = extractNumber(result.volumetricWeight || 0)

  const hasShippingData = chargeableWeight > 0 || totalCost > 0 || deliveryDays > 0 || hasUtilization || (actualWeight > 0 && volumetricWeight > 0)
  if (!hasShippingData) return null

  const costIntensity = chargeableWeight > 0 ? totalCost / chargeableWeight : null
  const costScore = chargeableWeight > 0 ? clamp(100 - (costIntensity || 0) * 3, 0, 100) : 0
  const deliveryScore = deliveryDays > 0 ? clamp(100 - Math.max(0, deliveryDays - 2) * 6, 0, 100) : 0
  const utilizationScore = hasUtilization ? clamp(utilization, 0, 100) : 0
  const packagingScore = actualWeight > 0 && volumetricWeight > 0
    ? clamp(100 - Math.abs(volumetricWeight - actualWeight) / Math.max(actualWeight, 1) * 20, 0, 100)
    : 0

  const rawScore = (costScore * 0.35) + (deliveryScore * 0.25) + (utilizationScore * 0.25) + (packagingScore * 0.15)
  const score = Math.round(clamp(rawScore, 0, 100))
  const grade = toGrade(score)
  const optimizationLevel = buildOptimizationLabel(score)

  return {
    efficiencyScore: score,
    costEfficiencyGrade: grade,
    optimizationLevel,
    details: {
      costIntensity: costIntensity != null ? Math.round(costIntensity * 100) / 100 : null,
      deliveryDays: deliveryDays > 0 ? deliveryDays : null,
      utilization: hasUtilization ? utilization : null,
      packagingBalance: actualWeight > 0 && volumetricWeight > 0
        ? Math.round(Math.abs(volumetricWeight - actualWeight))
        : null,
    },
  }
}
