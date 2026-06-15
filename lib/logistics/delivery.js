/**
 * Delivery Time Estimator Utilities
 * Realistic transit time estimates for different shipping modes and routes.
 */

// Major Indian cities and typical distances (for reference)
const CITY_DISTANCES = {
  'Delhi-Mumbai': 1460,
  'Mumbai-Bangalore': 980,
  'Bangalore-Chennai': 350,
  'Delhi-Kolkata': 1500,
  'Delhi-Hyderabad': 1580,
  'Mumbai-Pune': 150,
  'Delhi-Pune': 1440,
};

export function calculateDeliveryTime(inputs) {
  const origin = String(inputs.origin || '').trim();
  const destination = String(inputs.destination || '').trim();
  const distance = Number(inputs.distance_km || 0);
  const shippingMode = String(inputs.shipping_mode || 'ground').toLowerCase();
  const expressOption = inputs.express_option === 'true' || inputs.express_option === true;
  
  if (distance <= 0) return null;
  
  // Base transit days by mode
  let baseDays = 0;
  let minDays = 1;
  let maxDays = 14;
  let daysPerThousandKm = 2;
  let description = '';
  
  switch (shippingMode) {
    case 'air':
      baseDays = 1;
      daysPerThousandKm = 0.5;
      minDays = 1;
      maxDays = 4;
      description = 'Air Freight (fastest)';
      break;
    
    case 'express':
      baseDays = expressOption ? 0 : 1;
      daysPerThousandKm = 1.2;
      minDays = expressOption ? 1 : 2;
      maxDays = expressOption ? 3 : 6;
      description = expressOption ? 'Express (Next-Day)' : 'Express (2-3 Days)';
      break;
    
    case 'ground':
    case 'standard':
    default:
      baseDays = 2;
      daysPerThousandKm = 2;
      minDays = 2;
      maxDays = 14;
      description = 'Ground Shipping (Standard)';
      break;
  }
  
  // Calculate estimated days
  const distanceFactor = (distance / 1000) * daysPerThousandKm;
  const estimatedDays = baseDays + distanceFactor;
  const minEstimate = Math.max(minDays, Math.floor(estimatedDays));
  const maxEstimate = Math.ceil(estimatedDays) + 1;
  
  // Add buffer for holidays/weekends (5% chance per day)
  const delayBuffer = Math.ceil(maxEstimate * 0.08);
  const worstCaseEstimate = maxEstimate + delayBuffer;
  
  // Calculate estimated arrival window
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minEstimate);
  
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + worstCaseEstimate);
  
  const trackingNote = generateTrackingNote(shippingMode, distance);
  
  return {
    origin,
    destination,
    distance,
    shippingMode,
    description,
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    minDays: minEstimate,
    maxDays: worstCaseEstimate,
    minArrivalDate: formatDate(minDate),
    maxArrivalDate: formatDate(maxDate),
    isExpress: expressOption,
    trackingNote,
    reliability: calculateReliability(shippingMode, distance),
  };
}

function generateTrackingNote(mode, distance) {
  if (mode === 'air') {
    return 'Air shipments are typically cleared within 1-2 days at destination.';
  } else if (mode === 'express') {
    return distance > 2000
      ? 'Long-distance express routes may add 1-2 days for hub transit.'
      : 'Express shipments prioritize faster routing and handling.';
  } else {
    return distance > 2000
      ? 'Ground shipments for long distances may experience transit delays due to hub consolidation.'
      : 'Ground shipping includes standard handling and hub processing.';
  }
}

function calculateReliability(mode, distance) {
  let baseReliability = 95;
  
  if (mode === 'air') {
    baseReliability = 98;
  } else if (mode === 'express') {
    baseReliability = 96;
  }
  
  // Reduce reliability for very long distances
  if (distance > 3000) {
    baseReliability -= 2;
  }
  
  return baseReliability;
}

function formatDate(date) {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Provides pre-calculated distance estimates between major Indian cities.
 * Returns estimated minimum days for standard ground shipping.
 */
export function getDeliveryRangeFromCities(origin, destination, mode = 'ground') {
  const pair = `${origin}-${destination}`;
  const reversePair = `${destination}-${origin}`;
  
  let distance = CITY_DISTANCES[pair] || CITY_DISTANCES[reversePair] || 1000;
  
  // Rough estimates
  const daysMap = {
    air: Math.max(1, Math.ceil(distance / 2000)),
    express: Math.max(2, Math.ceil(distance / 800)),
    ground: Math.max(2, Math.ceil(distance / 500)),
  };
  
  return daysMap[mode] || daysMap.ground;
}

/**
 * Estimates delivery time based on zipcode/pincode distance.
 * Simplified calculation for India postal areas.
 */
export function estimateDeliveryByPincode(originPin, destPin, mode = 'ground') {
  // Simplified: extract numeric region and estimate distance
  const originRegion = parseInt(String(originPin).substring(0, 2)) || 0;
  const destRegion = parseInt(String(destPin).substring(0, 2)) || 0;
  
  // Rough distance estimation (each region difference ≈ ~100-200 km)
  const regionDiff = Math.abs(originRegion - destRegion);
  const estimatedDistance = regionDiff < 5 ? 200 : regionDiff < 10 ? 800 : regionDiff < 20 ? 1500 : 2500;
  
  const daysMap = {
    air: Math.max(1, Math.ceil(estimatedDistance / 2000)),
    express: Math.max(2, Math.ceil(estimatedDistance / 800)),
    ground: Math.max(2, Math.ceil(estimatedDistance / 500)),
  };
  
  return {
    estimatedDistance,
    estimatedDays: daysMap[mode] || daysMap.ground,
    mode,
  };
}
