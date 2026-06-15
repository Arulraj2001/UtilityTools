const UNIT_FACTORS = {
  cm: 1,
  m: 100,
  in: 2.54,
};

const VOLUME_CONVERSIONS = {
  cubic_feet: 35.3146667,
  liters: 1000,
};

function parsePositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toCentimeters(value, unit = 'cm') {
  const number = parsePositiveNumber(value);
  if (number === null) return null;
  const factor = UNIT_FACTORS[unit] || UNIT_FACTORS.cm;
  return number * factor;
}

function toMeters(value, unit = 'cm') {
  const cm = toCentimeters(value, unit);
  return cm === null ? null : cm / 100;
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : String(value);
}

function formatWeight(value) {
  return `${formatNumber(value, 2)} kg`;
}

function formatVolume(value) {
  return `${formatNumber(value, 4)} m³`;
}

function buildDimensionRows(length, width, height, unit) {
  return [
    { Dimension: 'Length', Value: `${formatNumber(length, 2)} ${unit}` },
    { Dimension: 'Width', Value: `${formatNumber(width, 2)} ${unit}` },
    { Dimension: 'Height', Value: `${formatNumber(height, 2)} ${unit}` },
  ];
}

function computeDimensionMetrics(length, width, height, unit) {
  const lengthCm = toCentimeters(length, unit);
  const widthCm = toCentimeters(width, unit);
  const heightCm = toCentimeters(height, unit);
  if (lengthCm === null || widthCm === null || heightCm === null) {
    return null;
  }

  const lengthM = lengthCm / 100;
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;
  const cubicMeters = lengthM * widthM * heightM;
  const cubicCentimeters = lengthCm * widthCm * heightCm;
  const cubicFeet = cubicMeters * VOLUME_CONVERSIONS.cubic_feet;
  const liters = cubicMeters * VOLUME_CONVERSIONS.liters;

  return {
    lengthCm,
    widthCm,
    heightCm,
    lengthM,
    widthM,
    heightM,
    cubicMeters,
    cubicCentimeters,
    cubicFeet,
    liters,
  };
}

export function calculateCBM(inputs) {
  const { length, width, height, unit = 'cm' } = inputs;
  const metrics = computeDimensionMetrics(length, width, height, unit);
  if (!metrics || metrics.cubicMeters <= 0) {
    return { error: 'Enter valid positive parcel dimensions for length, width and height.' };
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Cubic Meters', value: formatVolume(metrics.cubicMeters), raw: metrics.cubicMeters, highlight: true },
      { label: 'Cubic Centimeters', value: `${formatNumber(metrics.cubicCentimeters, 0)} cm³`, raw: metrics.cubicCentimeters },
      { label: 'Cubic Feet', value: `${formatNumber(metrics.cubicFeet, 3)} ft³`, raw: metrics.cubicFeet },
      { label: 'Liters', value: `${formatNumber(metrics.liters, 1)} L`, raw: metrics.liters },
    ],
    table: buildDimensionRows(Number(length), Number(width), Number(height), unit),
  };
}

export function calculateVolumetricWeight(inputs) {
  const { length, width, height, unit = 'cm', divisor = 5000 } = inputs;
  const metrics = computeDimensionMetrics(length, width, height, unit);
  const divisorValue = parsePositiveNumber(divisor) || 5000;

  if (!metrics || metrics.cubicCentimeters <= 0) {
    return { error: 'Enter valid positive parcel dimensions to calculate volumetric weight.' };
  }

  if (divisorValue <= 0) {
    return { error: 'Divisor must be a valid positive number.' };
  }

  const volumetricWeight = metrics.cubicCentimeters / divisorValue;
  const commonDivisor = unit === 'in' ? 166 : 5000;
  const recommendedDivisor = unit === 'in' ? 166 : 5000;

  return {
    type: 'cards',
    cards: [
      { label: 'Parcel Volume', value: formatVolume(metrics.cubicMeters), raw: metrics.cubicMeters, highlight: true },
      { label: 'Volumetric Weight', value: formatWeight(volumetricWeight), raw: volumetricWeight },
      { label: 'Used Divisor', value: String(divisorValue), raw: divisorValue },
      { label: 'Recommended Divisor', value: String(recommendedDivisor), raw: recommendedDivisor },
    ],
    table: buildDimensionRows(Number(length), Number(width), Number(height), unit),
  };
}

export function calculateChargeableWeight(inputs) {
  const actualWeight = parsePositiveNumber(inputs.actual_weight_kg);
  const { length, width, height, unit = 'cm', divisor = 5000 } = inputs;
  const metrics = computeDimensionMetrics(length, width, height, unit);
  const divisorValue = parsePositiveNumber(divisor) || 5000;

  if (actualWeight === null) {
    return { error: 'Enter a valid actual weight in kilograms.' };
  }

  if (!metrics || metrics.cubicCentimeters <= 0) {
    return { error: 'Enter valid parcel dimensions to calculate volumetric weight.' };
  }

  if (divisorValue <= 0) {
    return { error: 'Divisor must be a valid positive number.' };
  }

  const volumetricWeight = metrics.cubicCentimeters / divisorValue;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
  const billingMethod = actualWeight >= volumetricWeight ? 'Actual Weight' : 'Volumetric Weight';

  return {
    type: 'cards',
    cards: [
      { label: 'Actual Weight', value: formatWeight(actualWeight), raw: actualWeight },
      { label: 'Volumetric Weight', value: formatWeight(volumetricWeight), raw: volumetricWeight, highlight: true },
      { label: 'Chargeable Weight', value: formatWeight(chargeableWeight), raw: chargeableWeight },
      { label: 'Billing Method', value: billingMethod, raw: billingMethod },
    ],
    table: buildDimensionRows(Number(length), Number(width), Number(height), unit),
  };
}

export function calculateParcelDimensions(inputs) {
  const { length, width, height, unit = 'cm', target_volume_m3, target_weight_kg, divisor = 5000 } = inputs;
  const dims = {
    length: parsePositiveNumber(length),
    width: parsePositiveNumber(width),
    height: parsePositiveNumber(height),
  };
  const givenDimensions = Object.entries(dims).filter(([, value]) => value !== null);
  const volumeTarget = parsePositiveNumber(target_volume_m3);
  const weightTarget = parsePositiveNumber(target_weight_kg);
  const divisorValue = parsePositiveNumber(divisor) || 5000;

  if (divisorValue <= 0) {
    return { error: 'Divisor must be a valid positive number.' };
  }

  if (givenDimensions.length >= 3) {
    const metrics = computeDimensionMetrics(dims.length, dims.width, dims.height, unit);
    return {
      type: 'cards',
      cards: [
        { label: 'Parcel Volume', value: formatVolume(metrics.cubicMeters), raw: metrics.cubicMeters, highlight: true },
        { label: 'Volumetric Weight', value: formatWeight(metrics.cubicCentimeters / divisorValue), raw: metrics.cubicCentimeters / divisorValue },
        { label: 'Target Volume', value: volumeTarget ? `${formatVolume(volumeTarget)}` : 'Not provided', raw: volumeTarget || 0 },
        { label: 'Target Weight', value: weightTarget ? formatWeight(weightTarget) : 'Not provided', raw: weightTarget || 0 },
      ],
      table: buildDimensionRows(Number(length), Number(width), Number(height), unit),
    };
  }

  if (givenDimensions.length === 2 && volumeTarget !== null) {
    const missingKey = ['length', 'width', 'height'].find(key => dims[key] === null);
    if (!missingKey) {
      return { error: 'Unable to determine the missing parcel dimension.' };
    }

    const knownKeys = ['length', 'width', 'height'].filter(key => key !== missingKey);
    const knownCm = knownKeys.map(key => toCentimeters(dims[key], unit));
    if (knownCm.some(v => v === null || v <= 0)) {
      return { error: 'Enter valid positive values for the two known dimensions.' };
    }

    const missingMeters = volumeTarget / (knownCm[0] / 100 * knownCm[1] / 100);
    if (!Number.isFinite(missingMeters) || missingMeters <= 0) {
      return { error: 'Target volume does not match the provided dimensions.' };
    }

    const missingValue = missingMeters * 100 / (UNIT_FACTORS[unit] || UNIT_FACTORS.cm);
    return {
      type: 'cards',
      cards: [
        { label: 'Missing Dimension', value: `${formatNumber(missingValue, 2)} ${unit}`, raw: missingValue, highlight: true },
        { label: 'Required Parcel Volume', value: formatVolume(volumeTarget), raw: volumeTarget },
        { label: 'Estimated Volumetric Weight', value: formatWeight((volumeTarget * 1000000) / divisorValue), raw: (volumeTarget * 1000000) / divisorValue },
      ],
      table: buildDimensionRows(
        dims.length || (missingKey === 'length' ? missingValue : null),
        dims.width || (missingKey === 'width' ? missingValue : null),
        dims.height || (missingKey === 'height' ? missingValue : null),
        unit,
      ),
    };
  }

  if (givenDimensions.length === 2 && weightTarget !== null) {
    const missingKey = ['length', 'width', 'height'].find(key => dims[key] === null);
    if (!missingKey) {
      return { error: 'Unable to determine the missing parcel dimension.' };
    }

    const knownKeys = ['length', 'width', 'height'].filter(key => key !== missingKey);
    const knownCm = knownKeys.map(key => toCentimeters(dims[key], unit));
    if (knownCm.some(v => v === null || v <= 0)) {
      return { error: 'Enter valid positive values for the two known dimensions.' };
    }

    const requiredVolumeCm3 = weightTarget * divisorValue;
    const missingCm = requiredVolumeCm3 / (knownCm[0] * knownCm[1]);
    if (!Number.isFinite(missingCm) || missingCm <= 0) {
      return { error: 'Target weight does not match the provided dimensions.' };
    }

    const missingValue = missingCm / (UNIT_FACTORS[unit] || UNIT_FACTORS.cm);
    return {
      type: 'cards',
      cards: [
        { label: 'Missing Dimension', value: `${formatNumber(missingValue, 2)} ${unit}`, raw: missingValue, highlight: true },
        { label: 'Target Chargeable Weight', value: formatWeight(weightTarget), raw: weightTarget },
        { label: 'Used Divisor', value: String(divisorValue), raw: divisorValue },
      ],
      table: buildDimensionRows(
        dims.length || (missingKey === 'length' ? missingValue : null),
        dims.width || (missingKey === 'width' ? missingValue : null),
        dims.height || (missingKey === 'height' ? missingValue : null),
        unit,
      ),
    };
  }

  return {
    error: 'Enter at least two parcel dimensions and a target volume or weight, or supply all three dimensions to compute parcel metrics.'
  };
}
