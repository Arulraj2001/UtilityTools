/**
 * Logistics mathematics utilities for parcel dimension calculations.
 * All calculations run client-side with no external dependencies.
 */

// Standard divisors used in shipping
export const AIR_CARGO_DIVISOR = 6000 // cm³/kg (IATA standard)
export const COURIER_DIVISOR = 5000 // cm³/kg (DHL/FedEx/UPS standard)
export const SEA_FREIGHT_DIVISOR = 1000 // cm³/kg (sea freight standard)

/**
 * Convert units to cm internally
 */
export function toCm(value, fromUnit) {
  switch (fromUnit) {
    case 'm': return value * 100
    case 'inches': return value * 2.54
    case 'ft': return value * 30.48
    default: return value
  }
}

/**
 * Calculate volume in cubic centimeters
 */
export function calcVolumeCm3(w, h, d, unit = 'cm') {
  const wCm = toCm(w, unit)
  const hCm = toCm(h, unit)
  const dCm = toCm(d, unit)
  return wCm * hCm * dCm
}

/**
 * Calculate CBM (Cubic Meters)
 */
export function calcCBM(volumeCm3) {
  return volumeCm3 / 1_000_000
}

/**
 * Calculate Cubic Feet
 */
export function calcCubicFeet(volumeCm3) {
  return volumeCm3 / 28316.8
}

/**
 * Calculate Liters
 */
export function calcLiters(volumeCm3) {
  return volumeCm3 / 1000
}

/**
 * Calculate Volumetric Weight using a specific divisor
 */
export function calcVolumetricWeight(volumeCm3, divisor = COURIER_DIVISOR) {
  return volumeCm3 / divisor
}

/**
 * Calculate Chargeable Weight (max of actual weight and volumetric weight)
 */
export function calcChargeableWeight(actualWeightKg, volumetricWeightKg) {
  return Math.max(actualWeightKg, volumetricWeightKg)
}

/**
 * Calculate Density (kg/m³)
 */
export function calcDensity(actualWeightKg, cbm) {
  if (!cbm || cbm === 0) return 0
  return actualWeightKg / cbm
}

/**
 * Shipping category based on density (kg/m³)
 */
export function getShippingCategory(density) {
  if (density <= 50) return { name: 'Light Cargo', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' }
  if (density <= 150) return { name: 'Medium Cargo', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' }
  if (density <= 500) return { name: 'Heavy Cargo', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' }
  return { name: 'Very Heavy Cargo', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' }
}

/**
 * Container capacity estimates in CBM
 */
export const CONTAINER_CAPACITIES = {
  '20ft': 33,
  '40ft': 67,
  '40hq': 76,
  '20ref': 26,
  '40ref': 56,
}

/**
 * Estimate how many items fit in a container
 */
export function calcContainerFit(cbm, containerType = '20ft') {
  const capacity = CONTAINER_CAPACITIES[containerType] || 33
  if (!cbm || cbm === 0) return { count: 0, utilization: 0 }
  const count = Math.floor(capacity / cbm)
  const utilization = cbm / capacity * 100
  return { count, utilization: Math.min(utilization, 100) }
}

/**
 * Estimated weight class based on dimensions and density
 */
export function getWeightClass(actualWeightKg) {
  if (actualWeightKg <= 1) return { name: 'Light', range: '0-1 kg', color: 'text-green-600' }
  if (actualWeightKg <= 5) return { name: 'Medium', range: '1-5 kg', color: 'text-yellow-600' }
  if (actualWeightKg <= 20) return { name: 'Heavy', range: '5-20 kg', color: 'text-orange-600' }
  return { name: 'Very Heavy', range: '20+ kg', color: 'text-red-600' }
}

/**
 * Format a number to a fixed precision
 */
export function formatMetric(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return Number(value.toFixed(decimals)).toLocaleString()
}

/**
 * Estimate dimensions from a bounding box ratio and a known reference
 */
export function estimateDimensionsFromBBox(
  bboxPixels,
  referencePixels,
  referenceSizeCm,
  aspectRatioCorrection = 1
) {
  if (!bboxPixels || !referencePixels || !referenceSizeCm) return null
  const ratio = bboxPixels / referencePixels
  const estimatedCm = ratio * referenceSizeCm * aspectRatioCorrection
  return Math.round(estimatedCm * 10) / 10
}

/**
 * Common reference object dimensions in cm
 */
export const REFERENCE_OBJECTS = {
  'a4-sheet': { label: 'A4 Sheet', width: 21, height: 29.7 },
  'credit-card': { label: 'Credit Card', width: 8.56, height: 5.398 },
  'coin-1inr': { label: '₹1 Coin', width: 2.5, height: 2.5, isRound: true },
  'coin-2inr': { label: '₹2 Coin', width: 2.6, height: 2.6, isRound: true },
  'coin-5inr': { label: '₹5 Coin', width: 2.3, height: 2.3, isRound: true },
  'coin-10inr': { label: '₹10 Coin', width: 2.7, height: 2.7, isRound: true },
  'mobile-phone': { label: 'Mobile Phone', width: 7.5, height: 15.5 },
  'us-dollar': { label: 'US Dollar Bill', width: 15.6, height: 6.63 },
  'us-quarter': { label: 'US Quarter Coin', width: 2.426, height: 2.426, isRound: true },
  'sd-card': { label: 'SD Card', width: 2.4, height: 3.2 },
}

/**
 * Get reference object by ID
 */
export function getReferenceObject(id) {
  return REFERENCE_OBJECTS[id] || null
}