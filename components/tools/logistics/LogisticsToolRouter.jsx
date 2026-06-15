/**
 * Premium Logistics Tool Router - Maps all logistics tool slugs to their premium components
 */
import React, { lazy, Suspense, memo } from 'react'
import { CardSkeleton } from './PremiumCharts'

// Premium tool components (lazy loaded for performance)
const SmartCourierAnalyzer = lazy(() => import('./tools/SmartCourierAnalyzer'))
const ShipmentTransitIntelligence = lazy(() => import('./tools/ShipmentTransitIntelligence'))
const CargoVolumePlanner = lazy(() => import('./tools/CargoVolumePlanner'))
const FreightBillingOptimizer = lazy(() => import('./tools/FreightBillingOptimizer'))
const PackagingProfitAnalyzer = lazy(() => import('./tools/PackagingProfitAnalyzer'))
const AirCargoPricingSimulator = lazy(() => import('./tools/AirCargoPricingSimulator'))
const ContainerOptimizationSystem = lazy(() => import('./tools/ContainerOptimizationSystem'))
const ParcelDimensionIntelligence = lazy(() => import('./tools/ParcelDimensionIntelligence'))
const VolumetricFreightAnalyzer = lazy(() => import('./tools/VolumetricFreightAnalyzer'))
const AdvancedShippingEstimator = lazy(() => import('./tools/AdvancedShippingEstimator'))

/**
 * Complete map of logistics tool slugs to their premium components
 */
const LOGISTICS_TOOL_MAP = {
  // Premium upgrades (new names)
  'smart-courier-analyzer': SmartCourierAnalyzer,
  'shipment-transit-intelligence': ShipmentTransitIntelligence,
  'cargo-volume-planner': CargoVolumePlanner,
  'freight-billing-optimizer': FreightBillingOptimizer,
  'packaging-profit-analyzer': PackagingProfitAnalyzer,
  'air-cargo-pricing-simulator': AirCargoPricingSimulator,
  'container-optimization-system': ContainerOptimizationSystem,
  'parcel-dimension-intelligence': ParcelDimensionIntelligence,
  'volumetric-freight-analyzer': VolumetricFreightAnalyzer,
  'advanced-shipping-estimator': AdvancedShippingEstimator,

  // Also match original slugs for backward compatibility
  'courier-charges-calculator': SmartCourierAnalyzer,
  'delivery-time-estimator': ShipmentTransitIntelligence,
  'cbm-calculator': CargoVolumePlanner,
  'chargeable-weight-calculator': FreightBillingOptimizer,
  'packaging-cost-calculator': PackagingProfitAnalyzer,
  'air-freight-calculator': AirCargoPricingSimulator,
  'container-load-calculator': ContainerOptimizationSystem,
  'parcel-dimension-calculator': ParcelDimensionIntelligence,
  'volumetric-weight-calculator': VolumetricFreightAnalyzer,
  'shipping-cost-calculator': AdvancedShippingEstimator,

}

const LoadingFallback = () => (
  <div className="p-4 space-y-4">
    <CardSkeleton lines={4} />
    <CardSkeleton lines={3} />
  </div>
)

const LogisticsToolRouter = memo(({ tool }) => {
  if (!tool?.slug) return null

  const Component = LOGISTICS_TOOL_MAP[tool.slug]
  
  if (!Component) return null

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component tool={tool} />
    </Suspense>
  )
})

export default LogisticsToolRouter

export const LOGISTICS_TOOL_SLUGS = Object.keys(LOGISTICS_TOOL_MAP)