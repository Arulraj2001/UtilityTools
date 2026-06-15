/**
 * Logistics Pricing Utilities
 * Production-ready shipping cost calculation for multiple freight modes.
 */

export function calculateVolumetricWeightMetric(length, width, height, unit = 'cm', divisor = 5000) {
  const lengthM = convertToMeters(length, unit);
  const widthM = convertToMeters(width, unit);
  const heightM = convertToMeters(height, unit);
  
  if (!lengthM || !widthM || !heightM) return null;
  
  const cbm = lengthM * widthM * heightM;
  const volumetricWeight = cbm * divisor;
  
  return volumetricWeight;
}

export function calculateChargeableWeight(actualWeight, volumetricWeight) {
  return Math.max(actualWeight, volumetricWeight);
}

export function calculateShippingCost(inputs) {
  const actualWeight = Number(inputs.actual_weight || 0);
  const volumetricWeight = Number(inputs.volumetric_weight || 0);
  const distance = Number(inputs.distance_km || 0);
  const shippingType = String(inputs.shipping_type || 'standard').toLowerCase();
  const fuelSurchargePercent = Number(inputs.fuel_surcharge || 0);
  const insurancePercent = Number(inputs.insurance || 0);
  
  if (actualWeight <= 0 || distance <= 0) return null;
  
  const chargeableWeight = calculateChargeableWeight(actualWeight, volumetricWeight);
  
  // Base rates per kg per 100km (INR) - industry standard India rates
  const baseRates = {
    standard: 8.5,
    express: 15.0,
    air: 35.0,
  };
  
  const baseRate = baseRates[shippingType] || baseRates.standard;
  
  // Calculate distance surcharge (increasing costs for longer distances)
  const distanceFactor = 1 + (Math.max(0, distance - 500) / 1000) * 0.2;
  
  // Base freight charge
  const baseCharge = chargeableWeight * baseRate * (distance / 100) * distanceFactor;
  
  // Fuel surcharge
  const fuelSurcharge = (baseCharge * fuelSurchargePercent) / 100;
  
  // Insurance (if applicable)
  const insuranceCharge = (baseCharge * insurancePercent) / 100;
  
  // Minimum charge protection
  const minCharge = shippingType === 'standard' ? 200 : shippingType === 'express' ? 400 : 800;
  
  const totalCharge = Math.max(minCharge, baseCharge + fuelSurcharge + insuranceCharge);
  
  // Estimate delivery days based on type and distance
  const deliveryDays = estimateDeliveryDays(shippingType, distance);
  
  return {
    actualWeight,
    volumetricWeight,
    chargeableWeight,
    baseCharge: Math.round(baseCharge * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    insuranceCharge: Math.round(insuranceCharge * 100) / 100,
    totalCharge: Math.round(totalCharge * 100) / 100,
    deliveryDays,
    distance,
    shippingType,
  };
}

export function calculateCourierCharges(inputs) {
  const weight = Number(inputs.package_weight || 0);
  const parcelType = String(inputs.parcel_type || 'standard').toLowerCase();
  const deliverySpeed = String(inputs.delivery_speed || 'standard').toLowerCase();
  const distance = Number(inputs.distance || 0);
  const codAmount = Number(inputs.cod_amount || 0);
  
  if (weight <= 0 || distance <= 0) return null;
  
  // Base courier rates (INR) - typical Indian courier rates
  const baseCharges = {
    standard: { standard: 50, express: 100, overnight: 200 },
    fragile: { standard: 80, express: 150, overnight: 250 },
    document: { standard: 30, express: 60, overnight: 120 },
    perishable: { standard: 120, express: 200, overnight: 350 },
  };
  
  const baseCharge = baseCharges[parcelType]?.[deliverySpeed] || 50;
  
  // Weight surcharge (per 500g)
  const weightSlabs = Math.ceil(weight / 0.5);
  const weightSurcharge = Math.max(0, (weightSlabs - 1) * 10);
  
  // Distance charge
  const distanceCharge = weight <= 0.5 ? distance * 0.08 : distance * 0.12;
  
  // COD charge (Cash on Delivery)
  const codFee = codAmount > 0 ? (codAmount * 2.5) / 100 : 0;
  
  // Express/special handling surcharge
  const speedMultiplier = deliverySpeed === 'overnight' ? 1.5 : deliverySpeed === 'express' ? 1.25 : 1.0;
  
  const subtotal = (baseCharge + weightSurcharge + distanceCharge) * speedMultiplier;
  const totalCharge = Math.round((subtotal + codFee) * 100) / 100;
  
  // GST (18%) on the charge
  const gst = Math.round(totalCharge * 18 * 100) / (100 * 100);
  const finalCharge = totalCharge + gst;
  
  return {
    baseCharge,
    weightSurcharge: Math.round(weightSurcharge * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    codFee: Math.round(codFee * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    totalCharge: Math.round(totalCharge * 100) / 100,
    finalCharge: Math.round(finalCharge * 100) / 100,
    weight,
    distance,
  };
}

export function calculateAirFreight(inputs) {
  const actualWeight = Number(inputs.actual_weight || 0);
  const volumetricWeight = Number(inputs.volumetric_weight || 0);
  const ratePerKg = Number(inputs.rate_per_kg || 0);
  const fuelSurchargePct = Number(inputs.fuel_surcharge || 0);
  const customsFeeAmount = Number(inputs.customs_fee || 0);
  
  if (actualWeight <= 0 || ratePerKg <= 0) return null;
  
  const chargeableWeight = calculateChargeableWeight(actualWeight, volumetricWeight);
  
  // Base freight cost (chargeable weight * rate per kg)
  const freightCost = chargeableWeight * ratePerKg;
  
  // Fuel surcharge
  const fuelSurcharge = (freightCost * fuelSurchargePct) / 100;
  
  // Security and handling charges (2% of freight)
  const handlingCharge = freightCost * 0.02;
  
  // Airport charges (per kg, ~₹2 per kg standard)
  const airportCharge = chargeableWeight * 2;
  
  const subtotal = freightCost + fuelSurcharge + handlingCharge + airportCharge + customsFeeAmount;
  
  // GST 5% on air freight (special rate)
  const gst = subtotal * 0.05;
  const totalCost = subtotal + gst;
  
  return {
    actualWeight,
    volumetricWeight,
    chargeableWeight,
    ratePerKg,
    freightCost: Math.round(freightCost * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    handlingCharge: Math.round(handlingCharge * 100) / 100,
    airportCharge: Math.round(airportCharge * 100) / 100,
    customsFeeAmount: Math.round(customsFeeAmount * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export function calculatePackagingCost(inputs) {
  const boxCost = Number(inputs.box_cost || 0);
  const tapeCost = Number(inputs.tape_cost || 0);
  const fillerCost = Number(inputs.filler_cost || 0);
  const labelCost = Number(inputs.label_cost || 0);
  const quantity = Number(inputs.quantity || 1);
  
  if (quantity <= 0) return null;
  
  const costPerUnit = boxCost + tapeCost + fillerCost + labelCost;
  const totalCost = costPerUnit * quantity;
  const monthlyCost = totalCost * (quantity <= 100 ? 30 : quantity <= 500 ? 22 : 20);
  
  return {
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    monthlyCost: Math.round(monthlyCost * 100) / 100,
    quantity,
    breakdown: {
      box: Math.round(boxCost * quantity * 100) / 100,
      tape: Math.round(tapeCost * quantity * 100) / 100,
      filler: Math.round(fillerCost * quantity * 100) / 100,
      label: Math.round(labelCost * quantity * 100) / 100,
    },
  };
}

export function estimateDeliveryDays(shippingType, distanceKm) {
  if (shippingType === 'air') {
    return Math.max(1, Math.ceil(distanceKm / 2000)) + 1;
  } else if (shippingType === 'express') {
    return Math.max(2, Math.ceil(distanceKm / 800)) + 1;
  } else {
    // Standard - typically 2 days for 500km, 4 days for 1000km
    return Math.max(2, Math.ceil(distanceKm / 500));
  }
}

function convertToMeters(value, unit = 'cm') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  
  switch (unit.toLowerCase()) {
    case 'm':
      return num;
    case 'cm':
      return num / 100;
    case 'in':
      return num * 0.0254;
    case 'ft':
      return num * 0.3048;
    default:
      return null;
  }
}
