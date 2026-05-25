export function compareScenarios(base = {}, variant = {}) {
  if (!base || !variant) return null

  const numeric = (value) => Number(value || 0)
  const diff = (key) => numeric(variant[key]) - numeric(base[key])

  const comparison = {
    totalCostDifference: diff('totalCharge') || diff('finalCharge') || diff('totalCost'),
    weightDifference: diff('chargeableWeight') || diff('weight'),
    timeDifference: diff('deliveryDays') || diff('estimatedDays'),
    costPercentChange: base.totalCharge ? (diff('totalCharge') / base.totalCharge) * 100 : null,
  }

  return {
    ...comparison,
    summary: `Compared to the base scenario, the variant is ${comparison.totalCostDifference >= 0 ? 'more' : 'less'} expensive by ${Math.abs(comparison.totalCostDifference).toFixed(2)} and ${comparison.timeDifference >= 0 ? 'slower' : 'faster'} by ${Math.abs(comparison.timeDifference).toFixed(1)} days.`,
  }
}
