/**
 * Container Load Calculator Utilities
 * Estimate shipment fit and utilization for standard shipping containers.
 */

const CONTAINERS = {
  '20ft': {
    lengthM: 5.9,
    widthM: 2.35,
    heightM: 2.39,
    volumeM3: 33.1,
    teuWeight: 20000,
    name: '20-foot Container',
  },
  '40ft': {
    lengthM: 12.0,
    widthM: 2.35,
    heightM: 2.39,
    volumeM3: 67.7,
    teuWeight: 30480,
    name: '40-foot Container',
  },
  '40hq': {
    lengthM: 12.0,
    widthM: 2.35,
    heightM: 2.70,
    volumeM3: 76.3,
    teuWeight: 30480,
    name: '40-foot High Cube Container',
  },
};

export function calculateContainerLoad(inputs) {
  const packageLength = Number(inputs.package_length || 0);
  const packageWidth = Number(inputs.package_width || 0);
  const packageHeight = Number(inputs.package_height || 0);
  const quantity = Number(inputs.quantity || 1);
  const containerType = String(inputs.container_type || '40ft').toLowerCase();
  const unit = String(inputs.unit || 'cm').toLowerCase();
  
  if (packageLength <= 0 || packageWidth <= 0 || packageHeight <= 0 || quantity <= 0) {
    return null;
  }
  
  const container = CONTAINERS[containerType];
  if (!container) return null;
  
  // Convert package dimensions to meters
  const pkgLengthM = convertToMeters(packageLength, unit);
  const pkgWidthM = convertToMeters(packageWidth, unit);
  const pkgHeightM = convertToMeters(packageHeight, unit);
  
  if (!pkgLengthM || !pkgWidthM || !pkgHeightM) return null;
  
  const packageVolumeM3 = pkgLengthM * pkgWidthM * pkgHeightM;
  const totalPackageVolumeM3 = packageVolumeM3 * quantity;
  
  // Calculate utilization percentage
  const utilization = (totalPackageVolumeM3 / container.volumeM3) * 100;
  
  // Estimate how many packages fit in the container
  // Try different orientations for optimal fit
  const fit1 = estimateFit(
    Math.floor(container.lengthM / pkgLengthM),
    Math.floor(container.widthM / pkgWidthM),
    Math.floor(container.heightM / pkgHeightM)
  );
  
  const fit2 = estimateFit(
    Math.floor(container.lengthM / pkgWidthM),
    Math.floor(container.widthM / pkgLengthM),
    Math.floor(container.heightM / pkgHeightM)
  );
  
  const fit3 = estimateFit(
    Math.floor(container.lengthM / pkgHeightM),
    Math.floor(container.widthM / pkgLengthM),
    Math.floor(container.heightM / pkgWidthM)
  );
  
  const maxFit = Math.max(fit1, fit2, fit3);
  const fitPercentage = Math.min(100, (quantity / maxFit) * 100);
  
  // Calculate unused volume
  const usedVolume = totalPackageVolumeM3;
  const unusedVolume = Math.max(0, container.volumeM3 - usedVolume);
  
  // Cost efficiency (packages per cubic meter)
  const packagesPerCBM = quantity / totalPackageVolumeM3;
  
  return {
    containerType,
    containerVolume: container.volumeM3,
    packageVolume: packageVolumeM3,
    totalPackageVolume: totalPackageVolumeM3,
    quantity,
    maxFit: Math.floor(maxFit),
    utilizationPercent: Math.round(utilization * 100) / 100,
    fitPercent: Math.round(fitPercentage * 100) / 100,
    usedVolume: Math.round(usedVolume * 100) / 100,
    unusedVolume: Math.round(unusedVolume * 100) / 100,
    packagesPerCBM: Math.round(packagesPerCBM * 100) / 100,
    recommendation: generateLoadRecommendation(utilization, fitPercentage, maxFit, quantity),
  };
}

function estimateFit(lengthFit, widthFit, heightFit) {
  return lengthFit * widthFit * heightFit;
}

function generateLoadRecommendation(utilization, fitPercent, maxFit, requested) {
  if (utilization >= 90) {
    return 'Excellent utilization — container space is optimally used.';
  } else if (utilization >= 70) {
    return 'Good utilization. Consider adding complementary products.';
  } else if (utilization >= 50) {
    return 'Moderate utilization. Consolidate with other shipments if possible.';
  } else {
    return `Low utilization. You can fit up to ${Math.floor(maxFit)} units in this container.`;
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

export function getContainerOptions() {
  return Object.entries(CONTAINERS).map(([key, value]) => ({
    value: key,
    label: `${value.name} (${value.volumeM3} m³)`,
    details: `${value.lengthM}m L × ${value.widthM}m W × ${value.heightM}m H`,
  }));
}
