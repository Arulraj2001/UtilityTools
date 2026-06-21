/**
 * Premium Logistics Mathematics - Enterprise-grade calculations
 * All calculations run client-side with memoizable pure functions
 */
import { AIR_CARGO_DIVISOR, COURIER_DIVISOR, SEA_FREIGHT_DIVISOR, calcVolumeCm3, calcCBM, calcVolumetricWeight, calcChargeableWeight } from '@/lib/logisticsMath'

// ─── Courier & Shipping Constants ────────────────────────────

export const COURIER_COMPANIES = {
  dhl: { name: 'DHL Express', slug: 'dhl', baseRate: 0.85, fuelSurcharge: 0.18, codFee: 0.025, insurancePct: 0.005, divisor: 5000, speedFactor: 1 },
  fedex: { name: 'FedEx', slug: 'fedex', baseRate: 0.82, fuelSurcharge: 0.17, codFee: 0.022, insurancePct: 0.005, divisor: 5000, speedFactor: 1.1 },
  ups: { name: 'UPS', slug: 'ups', baseRate: 0.88, fuelSurcharge: 0.19, codFee: 0.028, insurancePct: 0.006, divisor: 5000, speedFactor: 1.2 },
  bluedart: { name: 'Blue Dart', slug: 'bluedart', baseRate: 0.75, fuelSurcharge: 0.15, codFee: 0.02, insurancePct: 0.004, divisor: 5000, speedFactor: 0.9 },
  delhivery: { name: 'Delhivery', slug: 'delhivery', baseRate: 0.65, fuelSurcharge: 0.12, codFee: 0.018, insurancePct: 0.003, divisor: 6000, speedFactor: 0.7 },
  ekart: { name: 'Ekart', slug: 'ekart', baseRate: 0.6, fuelSurcharge: 0.1, codFee: 0.015, insurancePct: 0.003, divisor: 6000, speedFactor: 0.65 },
  xpressbees: { name: 'XpressBees', slug: 'xpressbees', baseRate: 0.62, fuelSurcharge: 0.11, codFee: 0.016, insurancePct: 0.003, divisor: 6000, speedFactor: 0.68 },
  shadowfax: { name: 'Shadowfax', slug: 'shadowfax', baseRate: 0.58, fuelSurcharge: 0.1, codFee: 0.014, insurancePct: 0.002, divisor: 6000, speedFactor: 0.6 },
}

export const SHIPPING_MODES = {
  ground: { name: 'Ground', speedFactor: 1, multiplier: 1, label: 'Standard Ground' },
  express: { name: 'Express', speedFactor: 1.5, multiplier: 1.6, label: 'Express Delivery' },
  air: { name: 'Air Freight', speedFactor: 2.5, multiplier: 2.4, label: 'Air Freight' },
  overnight: { name: 'Overnight', speedFactor: 3, multiplier: 3.2, label: 'Overnight Delivery' },
}

export const CONTAINER_TYPES = {
  '20ft': { name: '20ft Standard', length: 589, width: 235, height: 239, volume: 33.1, maxLoad: 28180 },
  '40ft': { name: '40ft Standard', length: 1203, width: 235, height: 239, volume: 67.5, maxLoad: 28750 },
  '40hq': { name: '40ft High Cube', length: 1203, width: 235, height: 269, volume: 76.0, maxLoad: 28750 },
  '20ref': { name: '20ft Reefer', length: 548, width: 230, height: 227, volume: 26.0, maxLoad: 26380 },
  '40ref': { name: '40ft Reefer', length: 1159, width: 229, height: 249, volume: 56.0, maxLoad: 26380 },
}

export const AIRLINES = {
  emirates: { name: 'Emirates SkyCargo', baseRate: 2.8, fuelFactor: 0.22, securityFee: 0.05 },
  qatar: { name: 'Qatar Airways Cargo', baseRate: 2.6, fuelFactor: 0.2, securityFee: 0.04 },
  singapore: { name: 'Singapore Airlines Cargo', baseRate: 3.0, fuelFactor: 0.24, securityFee: 0.06 },
  cathay: { name: 'Cathay Pacific Cargo', baseRate: 2.7, fuelFactor: 0.21, securityFee: 0.05 },
  lufthansa: { name: 'Lufthansa Cargo', baseRate: 2.9, fuelFactor: 0.23, securityFee: 0.05 },
}

export const PACKAGING_TYPES = {
  corrugated_box: { name: 'Corrugated Box', unitCost: 15, weight: 0.2, sustainable: false, reuseScore: 60 },
  bubble_wrap: { name: 'Bubble Wrap + Box', unitCost: 22, weight: 0.3, sustainable: false, reuseScore: 40 },
  eco_friendly: { name: 'Eco-Friendly Box', unitCost: 28, weight: 0.15, sustainable: true, reuseScore: 85 },
  poly_mailer: { name: 'Poly Mailer', unitCost: 8, weight: 0.05, sustainable: false, reuseScore: 20 },
  cardboard_tube: { name: 'Cardboard Tube', unitCost: 12, weight: 0.1, sustainable: true, reuseScore: 70 },
  wooden_crate: { name: 'Wooden Crate', unitCost: 85, weight: 2.0, sustainable: false, reuseScore: 90 },
}

export const FREIGHT_CLASSES = [
  { class: 'Class 50', density: 50, label: 'High Density', factor: 0.7 },
  { class: 'Class 55', density: 55, label: 'Dense', factor: 0.75 },
  { class: 'Class 60', density: 60, label: 'Medium-High', factor: 0.8 },
  { class: 'Class 70', density: 70, label: 'Medium', factor: 0.85 },
  { class: 'Class 85', density: 85, label: 'Medium-Low', factor: 0.9 },
  { class: 'Class 92.5', density: 92.5, label: 'Low-Medium', factor: 0.95 },
  { class: 'Class 100', density: 100, label: 'Low Density', factor: 1.0 },
  { class: 'Class 110', density: 110, label: 'Very Low', factor: 1.1 },
  { class: 'Class 125', density: 125, label: 'Bulky', factor: 1.25 },
  { class: 'Class 150', density: 150, label: 'Very Bulky', factor: 1.5 },
  { class: 'Class 175', density: 175, label: 'Light Bulky', factor: 1.75 },
  { class: 'Class 200', density: 200, label: 'Extremely Bulky', factor: 2.0 },
  { class: 'Class 250', density: 250, label: 'Super Bulky', factor: 2.5 },
  { class: 'Class 300', density: 300, label: 'Max Bulky', factor: 3.0 },
  { class: 'Class 400', density: 400, label: 'Ultra Bulky', factor: 4.0 },
  { class: 'Class 500', density: 500, label: 'Extreme', factor: 5.0 },
]

// ─── Core Calculation Functions ───────────────────────────────

export function calcCourierCharge({ courier, weight, distance, parcelType, deliverySpeed, codAmount, insurance }) {
  const company = COURIER_COMPANIES[courier]
  if (!company) return null
  
  const volDivisor = company.divisor || 5000
  const speedMode = SHIPPING_MODES[deliverySpeed] || SHIPPING_MODES.ground
  const typeMultiplier = parcelType === 'fragile' ? 1.3 : parcelType === 'perishable' ? 1.2 : parcelType === 'document' ? 0.8 : 1.0
  
  // Base freight
  const baseFreight = weight * company.baseRate * distance * 0.001 * speedMode.multiplier * typeMultiplier
  
  // Fuel surcharge
  const fuelCharge = baseFreight * company.fuelSurcharge
  
  // COD fee
  const codFee = codAmount > 0 ? codAmount * company.codFee : 0
  
  // Insurance
  const insuranceCharge = insurance > 0 ? insurance * company.insurancePct : 0
  
  // GST (18%)
  const subtotal = baseFreight + fuelCharge + codFee + insuranceCharge
  const gst = subtotal * 0.18
  
  const total = subtotal + gst
  
  // ETA calculation
  const baseHours = distance / 50
  const etaHours = Math.round(baseHours / (speedMode.speedFactor || 1))
  const etaDays = Math.ceil(etaHours / 24)
  
  return {
    courier: company.name,
    baseFreight: round(baseFreight),
    fuelCharge: round(fuelCharge),
    codFee: round(codFee),
    insuranceCharge: round(insuranceCharge),
    subtotal: round(subtotal),
    gst: round(gst),
    total: round(total),
    etaHours,
    etaDays,
    isCheapest: false,
    isFastest: false,
    riskLevel: etaDays > 7 ? 'high' : etaDays > 4 ? 'medium' : 'low',
    deliveryDate: addDays(new Date(), etaDays),
  }
}

export function calcAllCouriers(params) {
  const couriers = Object.keys(COURIER_COMPANIES)
  const results = couriers.map(c => calcCourierCharge({ ...params, courier: c })).filter(Boolean)
  
  if (results.length === 0) return []
  
  const minTotal = Math.min(...results.map(r => r.total))
  const minEta = Math.min(...results.map(r => r.etaDays))
  
  results.forEach(r => {
    r.isCheapest = r.total === minTotal
    r.isFastest = r.etaDays === minEta
  })
  
  return results.sort((a, b) => a.total - b.total)
}

export function calcDeliveryTime({ distance, mode, origin, destination, weatherDelay, holidayImpact, peakSeason }) {
  const modeConfig = SHIPPING_MODES[mode] || SHIPPING_MODES.ground
  
  let baseHours = distance / 50
  if (mode === 'air') baseHours = distance / 500
  if (mode === 'express') baseHours = distance / 80
  
  const speedAdjusted = baseHours / (modeConfig.speedFactor || 1)
  
  // Weather delay (0-24 hours)
  const weatherFactor = weatherDelay || Math.random() * 6
  // Holiday impact (0-48 hours)
  const holidayFactor = holidayImpact || 0
  // Peak season (0-72 hours)
  const peakFactor = peakSeason || 0
  
  const totalHours = speedAdjusted + weatherFactor + holidayFactor + peakFactor
  const etaDays = Math.ceil(totalHours / 24)
  
  // Reliability score
  let reliability = 95
  if (weatherFactor > 4) reliability -= 10
  if (holidayFactor > 24) reliability -= 15
  if (peakFactor > 48) reliability -= 20
  if (mode === 'air') reliability += 3
  if (mode === 'ground') reliability -= 5
  reliability = Math.max(60, Math.min(99, reliability))
  
  // Confidence score
  const confidenceScore = Math.round(reliability - (Math.random() * 5))
  
  return {
    baseHours: round(baseHours, 1),
    adjustedHours: round(totalHours, 1),
    etaDays,
    etaDate: addDays(new Date(), etaDays),
    weatherDelay: round(weatherFactor, 1),
    holidayDelay: round(holidayFactor, 1),
    peakDelay: round(peakFactor, 1),
    reliability: Math.round(reliability),
    confidenceScore,
    mode: modeConfig.name,
    timeline: generateTimeline(distance, mode),
  }
}

function generateTimeline(distance, mode) {
  const stops = []
  const segments = Math.min(Math.ceil(distance / 300) + 1, 8)
  const segmentDist = distance / segments
  
  for (let i = 0; i <= segments; i++) {
    const pct = Math.round((i / segments) * 100)
    const dist = round(i * segmentDist, 1)
    const hours = Math.round(i * (segmentDist / 50))
    
    stops.push({
      label: pct === 0 ? 'Origin' : pct === 100 ? 'Destination' : `Stop ${i}`,
      distance: dist,
      progress: pct,
      hours,
      date: addDays(new Date(), Math.floor(hours / 24)),
    })
  }
  return stops
}

export function calcCBMDetailed({ parcels, unit }) {
  if (!parcels || parcels.length === 0) return null
  
  const items = parcels.map(p => {
    const l = unit === 'cm' ? p.length / 100 : p.length
    const w = unit === 'cm' ? p.width / 100 : p.width
    const h = unit === 'cm' ? p.height / 100 : p.height
    const volume = l * w * h * (p.quantity || 1)
    const volCm3 = (l * 100) * (w * 100) * (h * 100) * (p.quantity || 1)
    return {
      ...p,
      cbm: round(volume, 4),
      volCm3,
      l, w, h,
    }
  })
  
  const totalCBM = round(items.reduce((sum, i) => sum + i.cbm, 0), 4)
  const totalVolCm3 = items.reduce((sum, i) => sum + i.volCm3, 0)
  const totalWeight = items.reduce((sum, i) => sum + ((i.weight || 0) * (i.quantity || 1)), 0)
  const density = totalCBM > 0 ? round(totalWeight / totalCBM, 2) : 0
  
  // Container fit
  const containerFit = {}
  Object.entries(CONTAINER_TYPES).forEach(([key, ct]) => {
    const fitCount = Math.floor(ct.volume / totalCBM)
    const utilization = round((totalCBM / ct.volume) * 100, 1)
    containerFit[key] = { count: fitCount, utilization: Math.min(utilization, 100), name: ct.name }
  })
  
  // Density classification
  let densityClass = 'Light Cargo'
  let densityColor = 'text-blue-400'
  if (density > 50) { densityClass = 'Medium Cargo'; densityColor = 'text-yellow-400' }
  if (density > 150) { densityClass = 'Heavy Cargo'; densityColor = 'text-orange-400' }
  if (density > 500) { densityClass = 'Very Heavy Cargo'; densityColor = 'text-red-400' }
  
  return {
    items,
    totalCBM,
    totalVolCm3,
    totalWeight: round(totalWeight, 2),
    density,
    densityClass,
    densityColor,
    containerFit,
    freightRecommendation: density <= 150 ? 'Air Freight Recommended' : density <= 500 ? 'Sea or Road Freight' : 'Sea Freight Only',
  }
}

export function calcChargeableWeightDetailed({ actualWeight, length, width, height, unit, divisor, courierRules }) {
  const volCm3 = calcVolumeCm3(length, width, height, unit)
  const cbm = calcCBM(volCm3)
  const volumetricWeight = calcVolumetricWeight(volCm3, divisor || COURIER_DIVISOR)
  const chargeable = calcChargeableWeight(actualWeight, volumetricWeight)
  const difference = Math.abs(chargeable - actualWeight)
  const impactPct = round(((chargeable - actualWeight) / actualWeight) * 100, 1)
  
  // Savings recommendation
  let savingsSuggestion = null
  if (chargeable > actualWeight) {
    const reduction = chargeable - actualWeight
    if (reduction > 1) {
      savingsSuggestion = {
        message: `Reduce dimensions to save ₹${round(reduction * 50)} per shipment`,
        reductionNeeded: round(reduction * 0.8, 2),
      }
    }
  } else {
    savingsSuggestion = {
      message: 'Actual weight is chargeable - no optimization needed',
      reductionNeeded: 0,
    }
  }
  
  // Courier-specific rules comparison
  const courierComparisons = courierRules ? Object.entries(COURIER_COMPANIES).map(([key, cc]) => {
    const vw = calcVolumetricWeight(volCm3, cc.divisor)
    const cw = calcChargeableWeight(actualWeight, vw)
    return {
      courier: cc.name,
      divisor: cc.divisor,
      volumetric: round(vw, 2),
      chargeable: round(cw, 2),
      savingsVsChargeable: round(cw - chargeable, 2),
    }
  }) : []
  
  return {
    actualWeight,
    volumetricWeight: round(volumetricWeight, 2),
    chargeable: round(chargeable, 2),
    difference: round(difference, 2),
    impactPct,
    volumeCm3: round(volCm3, 2),
    cbm: round(cbm, 4),
    isVolumetricBilled: chargeable > actualWeight,
    savingsSuggestion,
    courierComparisons,
  }
}

export function calcPackagingCost({ boxCost, tapeCost, fillerCost, labelCost, laborCost, quantity, packagingType, monthlyShipments }) {
  const packType = PACKAGING_TYPES[packagingType]
  const packCost = packType ? packType.unitCost : 0
  
  const perUnitMaterial = (boxCost || 0) + (tapeCost || 0) + (fillerCost || 0) + (labelCost || 0) + (laborCost || 0) + packCost
  const totalBatch = perUnitMaterial * quantity
  
  const monthly = monthlyShipments || Math.max(quantity, 20)
  const monthlyTotal = perUnitMaterial * monthly
  const yearlyTotal = monthlyTotal * 12
  
  // Waste estimate (5% of materials)
  const wastePerUnit = perUnitMaterial * 0.05
  const monthlyWaste = wastePerUnit * monthly
  
  // Sustainability score
  let sustainabilityScore = 50
  if (packType?.sustainable) sustainabilityScore += 25
  if (packType?.reuseScore > 70) sustainabilityScore += 15
  if (!fillerCost || fillerCost === 0) sustainabilityScore += 10
  if (tapeCost < 2) sustainabilityScore += 5
  
  // Bulk discount
  let bulkDiscount = 0
  if (quantity >= 1000) bulkDiscount = 0.15
  else if (quantity >= 500) bulkDiscount = 0.1
  else if (quantity >= 100) bulkDiscount = 0.05
  
  const bulkAdjusted = perUnitMaterial * (1 - bulkDiscount)
  const totalWithDiscount = bulkAdjusted * quantity
  
  // Profit margin estimation (assuming selling price 2.5x cost)
  const estimatedSellingPrice = perUnitMaterial * 2.5
  const profitMargin = round(((estimatedSellingPrice - perUnitMaterial) / estimatedSellingPrice) * 100, 1)
  const monthlyRevenue = estimatedSellingPrice * monthly
  const monthlyProfit = (estimatedSellingPrice - perUnitMaterial) * monthly
  
  return {
    perUnitMaterial: round(perUnitMaterial, 2),
    totalBatch: round(totalBatch, 2),
    perUnitWithBulk: round(bulkAdjusted, 2),
    totalWithDiscount: round(totalWithDiscount, 2),
    bulkDiscount: round(bulkDiscount * 100, 0),
    monthlyTotal: round(monthlyTotal, 2),
    yearlyTotal: round(yearlyTotal, 2),
    monthlyWaste: round(monthlyWaste, 2),
    wastePct: 5,
    sustainabilityScore: Math.min(100, sustainabilityScore),
    sustainabilityLabel: sustainabilityScore >= 80 ? 'Excellent' : sustainabilityScore >= 60 ? 'Good' : 'Needs Improvement',
    estimatedSellingPrice: round(estimatedSellingPrice, 2),
    profitMargin,
    monthlyRevenue: round(monthlyRevenue, 2),
    monthlyProfit: round(monthlyProfit, 2),
    packagingType: packType?.name || 'Custom',
  }
}

export function calcAirFreight({ actualWeight, length, width, height, unit, airline, ratePerKg, customsFee, dangerousGoods, cargoClass }) {
  const volCm3 = calcVolumeCm3(length, width, height, unit)
  const cbm = calcCBM(volCm3)
  const volumetric = calcVolumetricWeight(volCm3, AIR_CARGO_DIVISOR)
  const chargeable = calcChargeableWeight(actualWeight, volumetric)
  
  const airlineConfig = AIRLINES[airline]
  const rate = ratePerKg || airlineConfig?.baseRate || 2.5
  
  // Freight class factor
  const classConfig = FREIGHT_CLASSES.find(fc => fc.label === cargoClass)
  const classFactor = classConfig?.factor || 1
  
  // Base freight
  const baseFreight = chargeable * rate * classFactor
  
  // Fuel surcharge
  const fuelFactor = airlineConfig?.fuelFactor || 0.2
  const fuelSurcharge = baseFreight * fuelFactor
  
  // Security fee
  const securityFee = airlineConfig?.securityFee || 0.05
  const securityTotal = chargeable * securityFee
  
  // Airport fees
  const airportFee = chargeable * 0.08
  
  // Dangerous goods surcharge
  const dgSurcharge = dangerousGoods ? chargeable * 0.25 : 0
  
  // Customs estimation
  const customsTotal = customsFee || (baseFreight * 0.1)
  
  // Import/export tax (assume 10% of base freight)
  const importTax = baseFreight * 0.1
  const exportTax = baseFreight * 0.05
  
  const subtotal = baseFreight + fuelSurcharge + securityTotal + airportFee + dgSurcharge
  const total = subtotal + customsTotal + importTax + exportTax
  
  return {
    chargeable: round(chargeable, 2),
    actualWeight,
    volumetric: round(volumetric, 2),
    cbm: round(cbm, 4),
    baseFreight: round(baseFreight, 2),
    fuelSurcharge: round(fuelSurcharge, 2),
    securityFee: round(securityTotal, 2),
    airportFee: round(airportFee, 2),
    dgSurcharge: round(dgSurcharge, 2),
    customs: round(customsTotal, 2),
    importTax: round(importTax, 2),
    exportTax: round(exportTax, 2),
    subtotal: round(subtotal, 2),
    total: round(total, 2),
    airline: airlineConfig?.name || 'Custom',
    cargoClass: classConfig?.class || 'Class 100',
    ratePerKg: rate,
    density: cbm > 0 ? round(actualWeight / cbm, 2) : 0,
  }
}

export function calcContainerLoad({ packages, containerType }) {
  const container = CONTAINER_TYPES[containerType]
  if (!container) return null
  
  const items = packages.map(p => {
    const vol = p.length * p.width * p.height / 1_000_000 // m³
    const perItem = { ...p, cbm: round(vol, 4) }
    
    // Fit calculation with rotation optimization
    const orientations = [
      [p.length, p.width, p.height],
      [p.length, p.height, p.width],
      [p.width, p.length, p.height],
      [p.width, p.height, p.length],
      [p.height, p.length, p.width],
      [p.height, p.width, p.length],
    ]
    
    let bestFit = 0
    let bestOrient = null
    
    for (const orient of orientations) {
      if (orient[0] <= container.length && orient[1] <= container.width && orient[2] <= container.height) {
        const lenFit = Math.floor(container.length / orient[0])
        const widFit = Math.floor(container.width / orient[1])
        const heiFit = Math.floor(container.height / orient[2])
        const totalFit = lenFit * widFit * heiFit
        if (totalFit > bestFit) {
          bestFit = totalFit
          bestOrient = orient
        }
      }
    }
    
    return { ...perItem, fitCount: bestFit, orientation: bestOrient }
  })
  
  const totalItems = items.reduce((sum, i) => sum + (i.fitCount * (i.quantity || 1)), 0)
  const totalVolume = items.reduce((sum, i) => sum + (i.cbm * i.fitCount * (i.quantity || 1)), 0)
  const totalWeight = items.reduce((sum, i) => sum + ((i.weight || 0) * i.fitCount * (i.quantity || 1)), 0)
  
  const utilization = round((totalVolume / container.volume) * 100, 1)
  const deadSpace = round(container.volume - totalVolume, 2)
  const weightUtilization = round((totalWeight / container.maxLoad) * 100, 1)
  
  // Utilization score
  let score = 0
  if (utilization > 85) score = 95
  else if (utilization > 70) score = 80
  else if (utilization > 50) score = 60
  else score = 40
  
  return {
    container: container.name,
    containerVolume: container.volume,
    containerMaxLoad: container.maxLoad,
    totalItems,
    totalVolume: round(totalVolume, 2),
    totalWeight: round(totalWeight, 2),
    utilization,
    deadSpace,
    weightUtilization,
    score: Math.min(100, score),
    scoreLabel: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
    items: items.map(i => ({
      ...i,
      fitPerContainer: i.fitCount,
      orientation: i.orientation ? `${i.orientation[0]}×${i.orientation[1]}×${i.orientation[2]}cm` : 'No fit',
    })),
  }
}

export function calcParcelDimension({ length, width, height, unit, targetVolume, targetWeight, divisor }) {
  unit = unit || 'cm'
  
  // Calculate volume if we have 3 dimensions
  let volume = null
  let missingDim = null
  
  if (length && width && height) {
    const volCm3 = calcVolumeCm3(length, width, height, unit)
    volume = { cm3: round(volCm3, 2), cbm: round(calcCBM(volCm3), 4) }
  }
  
  // Solve for missing dimension
  const present = [!!length, !!width, !!height]
  const missingCount = present.filter(Boolean).length
  
  if (missingCount === 2 && targetVolume) {
    const targetM3 = targetVolume
    const known = []
    if (length) known.push(parseFloat(length))
    if (width) known.push(parseFloat(width))
    if (height) known.push(parseFloat(height))
    
    const product = known[0] * known[1]
    const missingVal = targetM3 / product
    
    // Convert to proper unit
    const inUnit = unit === 'm' ? missingVal : missingVal * 100
    
    if (!length) missingDim = { name: 'Length', value: round(inUnit, 2) }
    else if (!width) missingDim = { name: 'Width', value: round(inUnit, 2) }
    else if (!height) missingDim = { name: 'Height', value: round(inUnit, 2) }
  }
  
  // Volumetric weight
  let volumetricWeight = null
  if (volume) {
    volumetricWeight = calcVolumetricWeight(volume.cm3, divisor || 5000)
  }
  
  // Shape presets
  let shapeType = 'Standard'
  if (length && width && height) {
    const max = Math.max(length, width, height)
    const min = Math.min(length, width, height)
    const ratio = max / min
    if (ratio > 5) shapeType = 'Long/Tube'
    else if (ratio > 3) shapeType = 'Elongated'
    else if (ratio < 1.1) shapeType = 'Cube-like'
    else shapeType = 'Standard Box'
  }
  
  return {
    volume,
    missingDim,
    volumetricWeight: volumetricWeight ? round(volumetricWeight, 2) : null,
    shapeType,
    girth: length && width && height ? round(2 * (parseFloat(width) + parseFloat(height)), 1) : null,
    recommendations: getDimensionRecommendations(shapeType, volume?.cbm),
  }
}

function getDimensionRecommendations(shapeType, cbm) {
  const recs = []
  if (shapeType === 'Long/Tube') {
    recs.push('Consider dividing into shorter segments for better handling')
    recs.push('Use tube-specific courier services to reduce cost')
  }
  if (cbm && cbm > 0.5) {
    recs.push('Large package - check for volumetric weight pricing')
    recs.push('Consider splitting into multiple smaller packages')
  }
  if (cbm && cbm < 0.01) {
    recs.push('Small package - use poly mailer to save costs')
  }
  recs.push('Ensure all dimensions are within courier limits')
  return recs
}

export function calcVolumetricWeightDetailed({ length, width, height, unit, actualWeight, presets }) {
  const volCm3 = calcVolumeCm3(length, width, height, unit)
  const cbm = calcCBM(volCm3)
  
  // Standard divisor comparisons
  const divisors = presets || [
    { name: 'IATA (Air)', divisor: 6000 },
    { name: 'DHL/FedEx/UPS', divisor: 5000 },
    { name: 'Sea Freight', divisor: 1000 },
    { name: 'FedEx (in)', divisor: 139 },
  ]
  
  const comparisons = divisors.map(d => {
    const vw = unit === 'in' && d.divisor === 139 ? volCm3 / 139 : volCm3 / (d.divisor > 100 ? d.divisor : d.divisor)
    const chargeable = actualWeight ? Math.max(actualWeight, vw) : vw
    const savings = actualWeight ? chargeable - actualWeight : 0
    return {
      name: d.name,
      divisor: d.divisor,
      volumetric: round(vw, 2),
      chargeable: round(chargeable, 2),
      savings: round(savings, 2),
      isHigher: vw > (actualWeight || 0),
    }
  })
  
  const bestDivisor = comparisons.reduce((best, c) => c.volumetric < best.volumetric ? c : best, comparisons[0])
  
  return {
    volumeCm3: round(volCm3, 2),
    cbm: round(cbm, 4),
    comparisons,
    bestDivisor: bestDivisor?.name || 'Unknown',
    recommendations: getVolumetricRecommendations(comparisons, actualWeight),
  }
}

function getVolumetricRecommendations(comparisons, actualWeight) {
  const recs = []
  const highest = comparisons.reduce((h, c) => c.volumetric > h.volumetric ? c : h, comparisons[0])
  const lowest = comparisons.reduce((l, c) => c.volumetric < l.volumetric ? c : l, comparisons[0])
  
  if (highest && lowest && highest.volumetric - lowest.volumetric > 10) {
    recs.push(`Choose ${lowest.name} to minimize volumetric billing`)
  }
  if (actualWeight && comparisons.some(c => c.isHigher)) {
    recs.push('Package is dimension-heavy - reduce box size or use lightweight packaging')
  }
  recs.push('Consider using smaller packaging to reduce volumetric weight')
  recs.push('Check courier-specific divisor before shipping')
  return recs
}

export function calcShippingCostDetailed({ packages, distance, mode, insurance, cod, gst, fuelAdjustment, peakPricing }) {
  let totalActualWeight = 0
  let totalVolWeight = 0
  let totalChargeable = 0
  const itemized = packages.map(p => {
    const volCm3 = calcVolumeCm3(p.length, p.width, p.height, p.unit || 'cm')
    const vw = calcVolumetricWeight(volCm3, COURIER_DIVISOR)
    const cw = calcChargeableWeight(p.weight, vw)
    totalActualWeight += p.weight
    totalVolWeight += vw
    totalChargeable += cw
    return { ...p, volumetric: round(vw, 2), chargeable: round(cw, 2) }
  })
  
  const modeConfig = SHIPPING_MODES[mode] || SHIPPING_MODES.ground
  
  // Cost calculation
  const baseCost = totalChargeable * 0.8 * (distance / 100) * modeConfig.multiplier
  const insuranceCost = insurance ? totalChargeable * 0.005 : 0
  const codFee = cod ? totalChargeable * 0.02 : 0
  const fuelAdj = fuelAdjustment ? baseCost * 0.15 : 0
  const peakAdj = peakPricing ? baseCost * 0.25 : 0
  const gstAmount = gst ? (baseCost + insuranceCost + codFee + fuelAdj + peakAdj) * 0.18 : 0
  
  // Courier comparison
  const courierEstimates = Object.entries(COURIER_COMPANIES).slice(0, 4).map(([key, cc]) => {
    const cost = totalChargeable * cc.baseRate * (distance / 100)
    const total = cost + (cost * cc.fuelSurcharge) + (cod ? totalChargeable * cc.codFee : 0)
    return {
      name: cc.name,
      cost: round(cost, 2),
      total: round(total + total * 0.18, 2),
      eta: Math.ceil(distance / (50 * cc.speedFactor)),
      isCheapest: false,
    }
  })
  
  if (courierEstimates.length > 0) {
    const minCost = Math.min(...courierEstimates.map(c => c.total))
    courierEstimates.forEach(c => { c.isCheapest = c.total === minCost })
  }
  
  // Monthly forecast
  const monthlyForecast = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2026, i, 1).toLocaleString('default', { month: 'short' }),
    cost: round(baseCost * (1 + Math.sin(i / 3) * 0.15), 2),
    shipments: Math.round(20 + Math.random() * 30),
  }))
  
  return {
    totalActualWeight: round(totalActualWeight, 2),
    totalVolWeight: round(totalVolWeight, 2),
    totalChargeable: round(totalChargeable, 2),
    baseCost: round(baseCost, 2),
    insuranceCost: round(insuranceCost, 2),
    codFee: round(codFee, 2),
    fuelAdjustment: round(fuelAdj, 2),
    peakPricing: round(peakAdj, 2),
    gst: round(gstAmount, 2),
    total: round(baseCost + insuranceCost + codFee + fuelAdj + peakAdj + gstAmount, 2),
    etaDays: Math.ceil(distance / (50 * modeConfig.speedFactor)),
    courierEstimates,
    monthlyForecast,
    itemized,
  }
}

// ─── Utility Functions ────────────────────────────────────────

function round(num, decimals = 2) {
  if (num === undefined || num === null || isNaN(num)) return 0
  return Number(num.toFixed(decimals))
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ─── GST & Currency ──────────────────────────────────────────

export const GST_RATES = [0, 5, 12, 18, 28]
export const CURRENCIES = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044, SGD: 0.016 }

export function calcGST(amount, rate = 18) {
  const gst = amount * rate / 100
  return {
    amount: round(amount, 2),
    rate,
    gst: round(gst, 2),
    total: round(amount + gst, 2),
    cgst: round(gst / 2, 2),
    sgst: round(gst / 2, 2),
  }
}

export function convertCurrency(amount, from, to) {
  const inInr = amount / (CURRENCIES[from] || 1)
  return round(inInr * (CURRENCIES[to] || 1), 2)
}

export function calcMonthlyProjection(perShipment, shipmentsPerMonth = 20) {
  return {
    monthly: round(perShipment * shipmentsPerMonth, 2),
    quarterly: round(perShipment * shipmentsPerMonth * 3, 2),
    yearly: round(perShipment * shipmentsPerMonth * 12, 2),
  }
}